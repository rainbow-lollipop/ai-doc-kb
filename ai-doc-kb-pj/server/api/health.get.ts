import { defineEventHandler } from "h3";
import { useRedis } from "../utils/redis";
import { prisma } from "../utils/prisma";

// 给部署/监控用的探活端点：PG 和 Redis 各发一个最小请求
// 任一挂了这里会抛错 → 返回非 200，编排工具就知道服务不健康
export default defineEventHandler(async () => {
	await Promise.all([
		prisma.$queryRaw`SELECT 1`, // 最便宜的 SQL，只验证连接可用
		useRedis().ping(),
	]);
	return { status: "ok" };
});
