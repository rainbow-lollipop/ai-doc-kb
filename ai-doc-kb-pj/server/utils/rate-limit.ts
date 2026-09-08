import { AppError } from "./api";
import { useRedis } from "./redis";

// 固定窗口限流：INCR 计数，第一次出现时（返回 1）才设置过期
// key 设计是学习重点：维度错 = 误伤（太粗）或失效（太细），见各调用处
// ponytail: INCR 和 EXPIRE 两条命令非原子--极端情况（两条之间进程崩了）
// key 会永不过期 -> 永久 429，升级途径：Lua 脚本合并两条，或
// `SET key 0 EX windowSec NX` + INCR。学习项目先直白实现
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<void> {
	const redis = useRedis();
	const n = await redis.incr(key); // 原子+1，key 不存在时从 0 开始
	if (n === 1) await redis.expire(key, windowSec); // 只有首次才设 TTL， 重复设会刷新窗口
	if (n > limit) {
		// 顺带告诉调用方还要等多久（TTL = 剩余窗口秒数），前端可以倒计时
		const ttl = await redis.ttl(key);
		throw new AppError(
			"RATE_LIMITED",
			429,
			`请求太频繁，请 ${ttl > 0 ? ttl : windowSec} 秒后再试`,
		);
	}
}
