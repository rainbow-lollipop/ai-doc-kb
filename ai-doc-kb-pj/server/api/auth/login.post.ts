import { z } from "zod";
import bcrypt from "bcryptjs";
import { defineApi, AppError } from "~~/server/utils/api";
import { rateLimit } from "~~/server/utils/rate-limit";

const bodySchema = z.object({
	email: z.email(),
	password: z.string().min(1),
});

export default defineApi(async (event) => {
	const { email, password } = bodySchema.parse(await readBody(event));

	// 限流在查库/bcrypt 之前：恶意流量不配消耗贵资源
	// IP 维度防单机扫描，邮箱难度防定向撞库；不管密码对错都计数
	// 否则攻击者拿正确密码就能无限刷新窗口（副作用：正常人连续登录也计数--学习项目接受）
	const ip = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
	await rateLimit(`ratelimit:login:ip:${ip}`, 10, 60);
	await rateLimit(`ratelimit:login:email:${email.toLowerCase()}`, 5, 60);

	const user = await prisma.user.findUnique({ where: { email } });
	// 统一报"邮箱或密码错误"，不泄漏邮箱是否存在
	if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
		throw new AppError("UNAUTHORIZED", 401, "邮箱或密码错误");
	}
	await createSession(event, { id: user.id, email: user.email });
	return { id: user.id, email: user.email };
});
