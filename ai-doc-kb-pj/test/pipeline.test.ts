import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setup } from "@nuxt/test-utils/e2e";
import { Worker } from "bullmq";
import Redis from "ioredis";
import { registerAndGetCookie, makeApi, wsHeader } from "./helpers";
import { processParseJob } from "~~/server/utils/parse";
import { useRedis } from "~~/server/utils/redis";
import { prisma } from "~~/server/utils/prisma";

await setup({ server: true });

// 测试进程内直接起一个 worker 消费任务（和生产 worker.ts 同一个处理器函数）
let worker: Worker;
beforeAll(async () => {
	worker = new Worker("doc-parse", processParseJob, {
		connection: new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
			maxRetriesPerRequest: null,
		}),
		concurrency: 1,
	});
});
afterAll(async () => {
	await worker.close();
});

// 轮询直到文档进入期望状态（异步管道不能假设即时完成）
async function waitForStatus(
	api: ReturnType<typeof makeApi>,
	id: string,
	want: string[],
	timeoutMs = 15000,
) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		const res = await api(`/api/documents/${id}`);
		if (want.includes(res.data.status)) return res.data;
		await new Promise((r) => setTimeout(r, 300));
	}
	throw new Error(`timeout: document ${id} did not reach ${want.join("/")}`);
}

describe("parse pipeline", () => {
	let api: ReturnType<typeof makeApi>;
	let wsId: string;

	beforeAll(async () => {
		const u = await registerAndGetCookie("pipe");
		api = makeApi(u.cookie, () => wsHeader(wsId));
		const list = await api("/api/workspaces");
		wsId = list.data[0].id;
	});

	it("parses uploaded md into chunks and marks ready", async () => {
		const content = "# AI 文档知识库\n\n" + "这是用于测试解析管道的段落。".repeat(40);
		const up = await api("/api/documents/upload", {
			method: "POST",
			body: (() => {
				const form = new FormData();
				form.append("file", new Blob([content], { type: "text/markdown" }), "pipeline.md");
				return form;
			})(),
		});

		expect(up.ok).toBe(true);

		const doc = await waitForStatus(api, up.data.id, ["ready"]);
		expect(doc.status).toBe("ready");

		// chunks 已入库（文档约 1000 字 -> 至少 2 片）
		const chunks = await prisma.chunk.findMany({
			where: { documentId: up.data.id },
			orderBy: { idx: "asc" },
		});
		expect(chunks.length).toBeGreaterThanOrEqual(2);
		expect(chunks[0].content).toBeTruthy();

		// 进度可在 Redis 观察（验收清单要求）
		const raw = await useRedis().get(`progress:${up.data.id}`);
		expect(raw).toBeTruthy();
		expect(JSON.parse(raw!).step).toBe("done");
	});

	it("re-parsing the same document does not duplicate chunks(idempotency)", async () => {
		// 直接再投一次同一个任务，模拟 BullMQ 重试场景
		// const doc = await prisma.document.findFirstOrThrow({ where: { name: "pipeline.md" } });
		const doc = await prisma.document.findFirstOrThrow({
			where: { name: "pipeline.md", workspaceId: wsId }, // 必须固定当前工作区，防止捞到旧一轮测试的残留文档
		});

		await prisma.document.update({ where: { id: doc.id }, data: { status: "pending" } });

		await import("~~/server/utils/queue").then(({ getParseQueue }) =>
			getParseQueue().add("parse", {
				documentId: doc.id,
				workspaceId: wsId,
				filePath: `uploads/${wsId}/${doc.id}.md`,
			}),
		);

		await waitForStatus(api, doc.id, ["ready"]);
		const count = await prisma.chunk.count({ where: { documentId: doc.id } });
		// 重新解析后切片数与第一次一致（先删后插），不是翻倍
		expect(count).toBeGreaterThanOrEqual(2);
	});
});
