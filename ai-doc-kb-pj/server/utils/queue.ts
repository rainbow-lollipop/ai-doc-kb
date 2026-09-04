import { Queue } from "bullmq";
import Redis from "ioredis";

// maxRetriesPerRequest: null 是 BullMQ 官方要求--
// 网络闪断时让 BullMQ 自己管理重试，而不是 ioredis 在命令层重试导致任务状态错乱
export function queueConnection(): Redis {
	const g = globalThis as unknown as { __queueConn?: Redis };
	if (!g.__queueConn) {
		g.__queueConn = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
			maxRetriesPerRequest: null,
		});
	}
	return g.__queueConn;
}

const gq = globalThis as unknown as { __parseQueue?: Queue };
export function getParseQueue(): Queue {
	if (!gq.__parseQueue)
		gq.__parseQueue = new Queue("doc-parse", {
			connection: queueConnection(),
		});
	return gq.__parseQueue;
}
