import { z } from "zod";
import bcrypt from "bcryptjs";
import { defineApi, AppError } from "../../utils/api";

const bodySchema = z.object({
	email: z.email(),
	password: z.string().min(1),
});

export default defineApi(async (event) => {
	const { email, password } = bodySchema.parse(await readBody(event));
	const user = await prisma.user.findUnique({ where: { email } });
	// 统一报"邮箱或密码错误"，不泄漏邮箱是否存在
	if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
		throw new AppError("UNAUTHORIZED", 401, "邮箱或密码错误");
	}
	await createSession(event, { id: user.id, email: user.email });
	return { id: user.id, email: user.email };
});
