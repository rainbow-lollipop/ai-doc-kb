import { promises as fs } from "node:fs";
import path from "node:path";
import { defineApi, AppError } from "~~/server/utils/api";
import { requireMember } from "~~/server/utils/tenant";
import { getParseQueue } from "~~/server/utils/queue";

const EXT_WHITELIST = new Set(["pdf", "md", "txt"]);
const MAX_SIZE = 20 * 1024 * 1024;

export default defineApi(async (event) => {
	const member = await requireMember(event);

	// h3 内置的 multipart 解析：返回各字段（文件在内存里，20MB 量级可接受；ponytail：真要流式落盘再换 busboy，目前规模没必要）
	const parts = await readMultipartFormData(event);
	const file = parts?.find((p) => p.name === "file");
	if (!file?.data?.length) throw new AppError("VALIDATION_ERROR", 422, "缺少 file 字段");
	if (file.data.length > MAX_SIZE)
		throw new AppError("VALIDATION_ERROR", 422, "文件不能超过 20MB");

	// 类型白名单看扩展名（不做魔数检测--学习项目，先信任扩展名 + 阶段6 再加固）
	const ext = (file.filename?.split(".").pop() ?? "").toLowerCase();
	if (!EXT_WHITELIST.has(ext)) throw new AppError("VALIDATION_ERROR", 422, "仅支持pdf/md/txt");

	// 幂等：同名 + 同大小 + 还在处理中 = 重复提交，拒绝（已 ready/failed 的允许重传覆盖吗？
	// 本阶段不允许：同样 409，删掉旧的才能传新的--简单且无歧义）
	const dup = await prisma.document.findFirst({
		where: {
			workspaceId: member.workspaceId,
			name: file.filename,
			size: file.data.length,
			status: { in: ["pending", "processing"] },
		},
	});
	if (dup) throw new AppError("CONFLICT", 409, "同名同大小的文档正在处理中");

	const doc = await prisma.document.create({
		data: {
			workspaceId: member.workspaceId,
			name: file.filename!,
			type: ext,
			size: file.data.length,
			status: "pending",
			uploadedBy: member.userId,
		},
	});

	// 路径全部由服务端拼（workspaceId + cuid + 白名单扩展名）
	// 绝不用用户上传的文件名拼路径--那是路径穿越漏洞的起点
	const filePath = path.resolve("uploads", member.workspaceId, `${doc.id}.${ext}`);

	try {
		await fs.mkdir(path.dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, file.data);
		// 注意：queue.add 没法加进 Prisma 事务（跨系统），所以这里是「补偿」模式--
		// 投递失败就把文档标 failed，绝不让它永远停在 pending（假 pending 比失败更糟）
		await getParseQueue().add(
			"parse",
			{
				documentId: doc.id,
				workspaceId: member.workspaceId,
				filePath,
			},
			{
				attempts: 3, // 最多跑 3 次
				backoff: { type: "exponential", delay: 2000 }, // 2s -> 4s 退避
				removeOnComplete: 100, // 完成的任务留 100 条审计
				removeOnFail: false, // 失败的留在 failed 集合=死信，可人工排查
			},
		);
	} catch (e) {
		await prisma.document.update({
			where: { id: doc.id },
			data: { status: "failed", error: "文件写入或队列投递失败" },
		});
		throw e;
	}
	return doc;
});
