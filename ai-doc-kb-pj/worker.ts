import { Worker } from "bullmq";
import Redis from "ioredis";
import { processParseJob } from "./server/utils/parse";

const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
	maxRetriesPerRequest: null,
});

new Worker("doc-parse", processParseJob, {
	connection,
	concurrency: 2, // 同时处理 2 个任务；解析是 IO 密集，可以开大点
});
console.log("[worker] doc-parse started, waiting for jobs");
