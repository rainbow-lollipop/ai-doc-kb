import { describe, it, expect, afterAll } from "vitest";
import { setup } from "@nuxt/test-utils/e2e";
import { rateLimit } from "~~/server/utils/rate-limit";
import { useRedis } from "~~/server/utils/redis";
import { registerAndGetCookie, makeApi } from "./helpers";

await setup({ server: true });

// 纯工具函数测试： 不用HTTP，直接调用， key 用独立前缀避免和其他测试串扰
const PREFIX = `r1-test-${Date.now()}`; // 每次跑测试用新前缀，天然隔离旧数据

describe("rateLimit", () => {
	it("lets requests through under the limit", async () => {
		const key = `${PREFIX}:under`;
		// 不抛错 = 通过（limit=3，只打2次）
		await rateLimit(key, 3, 60);
		await rateLimit(key, 3, 60);
	});

	it("throws RATE_LIMITED(429) once over the limit", async () => {
		const key = `${PREFIX}:over`;
		await rateLimit(key, 2, 60);
		await rateLimit(key, 2, 60);
		// 第 3 次超限：断言抛的是 AppError 且带 429/RATE_LIMITED
		const e = await rateLimit(key, 2, 60).catch((e: any) => e);
		expect(e.code).toBe("RATE_LIMITED");
		expect(e.statusCode).toBe(429);
	});

	it("recovers after the window expires", async () => {
		const key = `${PREFIX}:window`;
		await rateLimit(key, 1, 1); // 窗口 1 秒，方便测试
		await rateLimit(key, 1, 1).catch(() => {}); // 第2次：超限（不关心抛什么）
		await new Promise((r) => setTimeout(r, 1200)); // 等窗口过期
		// 窗口过后计数已清零，又能通过
		await rateLimit(key, 1, 1);
	}, 5000); // 里面有 1.2s 真实等待，放宽 vitest 超时
});

describe("login rate limit", () => {
	it("locks the email after 5 failed attempts, even with correct password", async () => {
		// 先注册一个真用户（拿到正确密码）
		const u = await registerAndGetCookie("r1");
		const wrong = makeApi(u.cookie); // 登录接口不需要 ws 头，裸 cookie 即可（其实登录连 cookie 都不用）

		// 用错误密码打 5 次（限流阈值）
		for (let i = 0; i < 5; i++) {
			await wrong("/api/auth/login", {
				method: "POST",
				body: { email: u.email, password: "wrong-password" },
			}).catch(() => {}); // 401是预期，吞掉
		}

		// 第6次：即使用正确密码也429 -- 这就是防撞库
		const e = await wrong("/api/auth/login", {
			method: "POST",
			body: { email: u.email, password: "password123" },
		}).catch((e: any) => e.data);
		expect(e.code).toBe("RATE_LIMITED");
	});

	it("cleans up its rate-limit keys", async () => {
		// 注册随机邮箱所以 email key 天然隔离：这里只清 IP key
		// 避免影响同轮次后面测试文件里的登录（IP是共享维度）
		await useRedis().del(`ratelimit:login:ip:127.0.0.1`);
	});
});

afterAll(async () => {
	// 清掉自己前缀的所有key，不留垃圾（SCAN 匹配后逐个删）
	const keys = await useRedis().keys(`${PREFIX}:*`);
	if (keys.length) await useRedis().del(keys);
});
