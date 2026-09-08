import type { Job } from "bullmq";
import { promises as fs } from "node:fs";
// pdf-parse 2.4+：类 API，自带类型；用完必须 destroy 释放 pdfjs 资源
import { PDFParse } from "pdf-parse";
import { chunkText } from "./chunk";
import { useRedis } from "./redis";

interface ParseJobData {
	documentId: string;
	workspaceId: string;
	filePath: string;
}

async function extractPdfText(buf: Buffer): Promise<string> {
	const parser = new PDFParse({ data: buf }); // 构造时传数据（Buffer会自动转 Uint8Array）
	try {
		return (await parser.getText()).text; // TextResult.text = 拼好的全文
	} finally {
		await parser.destroy(); // 释放 pdfjs 底层资源，worker 常驻进程必须做
	}
}

export async function processParseJob(job: Job): Promise<void> {
	const { documentId, filePath } = job.data as ParseJobData;

	const doc = await prisma.document.findUnique({ where: { id: documentId } });
	if (!doc) throw new Error(`document ${documentId} not found`); // 文档被删了？让任务失败进死信

	await prisma.document.update({ where: { id: documentId }, data: { status: "processing" } });

	const progress = (data: Record<string, unknown>) =>
		useRedis().setex(`progress:${documentId}`, 3600, JSON.stringify(data)); // 1h 后自动清

	try {
		// (1)读文件、按类型抽文本（md/txt 直接读，仅支持UTF-8；GBK 会乱码--学习项目先不管）
		await progress({ step: "parsing" });
		const buf = await fs.readFile(filePath);
		const text = doc.type === "pdf" ? await extractPdfText(buf) : buf.toString("utf8");

		// (2)切片
		await progress({ step: "chunking" });
		const pieces = chunkText(text);
		if (!pieces.length) throw new Error("文档内容为空，无法切片");

		// (3)先删后插：任务重试/重跑不会产生重复切片（幂等）
		await progress({ step: "saving", total: pieces.length });
		await prisma.$transaction(async (tx) => {
			await tx.chunk.deleteMany({ where: { documentId } });
			await tx.chunk.createMany({
				data: pieces.map((content, idx) => ({ documentId, idx, content })),
			});
		});

		await progress({ step: "done", total: pieces.length });
		await prisma.document.update({
			where: { id: documentId },
			data: { status: "ready", error: null },
		});
	} catch (e: any) {
		// 只在「最后一次尝试」时标 failed -- 中间失败还有重试，标了会误导用户
		// attemptsStarted 从 1 计数，当前这轮 >= 配置的 attempts 即为最后一轮
		const isFinalAttempt = job.attemptsStarted >= (job.opts.attempts ?? 1);
		if (isFinalAttempt) {
			await prisma.document.update({
				where: { id: documentId },
				data: { status: "failed", error: String(e?.message ?? e).slice(0, 500) },
			});
		}
		throw e; // 必须继续抛：BullMQ 靠异常判定失败并按 backoff 重试
	}
}
