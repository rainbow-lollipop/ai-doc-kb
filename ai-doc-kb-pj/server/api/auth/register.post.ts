import { z } from "zod";
import bcrypt from "bcryptjs";
import { defineApi, AppError } from "../../utils/api";

const bodySchema = z.object({
	email: z.email("邮箱格式不正确"),
	password: z.string().min(8, "密码至少 8 位"),
});

export default defineApi(async (event) => {
	const { email, password } = bodySchema.parse(await readBody(event));
	const passwordHash = await bcrypt.hash(password, 10);
	try {
		const { user } = await prisma.$transaction(async (tx) => {
			const user = await tx.user.create({ data: { email, passwordHash } });
			const ws = await tx.workspace.create({
				data: { name: "我的知识库", ownerId: user.id },
			});
			await tx.workspaceMember.create({
				data: { workspaceId: ws.id, userId: user.id, role: "owner" },
			});
			return { user, ws };
		});
		await createSession(event, { id: user.id, email: user.email });
		return { id: user.id, email: user.email };
	} catch (e: any) {
		// Prisma 唯一约束冲突 -> 409 而不是 500
		if (e?.code === "P2002") throw new AppError("CONFLICT", 409, "该邮箱已注册");
		throw e;
	}
});
