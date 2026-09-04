import { z } from "zod";
import { defineApi, AppError } from "~~/server/utils/api";
import { requireOwner } from "~~/server/utils/tenant";

const bodySchema = z.object({
	email: z.email("邮箱格式不正确"),
});

export default defineApi(async (event) => {
	const wsId = getRouterParam(event, "id")!;
	await requireOwner(event, wsId);
	const { email } = bodySchema.parse(await readBody(event));

	const target = await prisma.user.findUnique({ where: { email } });
	if (!target) throw new AppError("NOT_FOUND", 404, "该邮箱未注册");

	try {
		// 邀请进来的永远是 member，不能造 owner
		return await prisma.workspaceMember.create({
			data: { workspaceId: wsId, userId: target.id, role: "member" },
		});
	} catch (e: any) {
		// 联合主键冲突 = 已经是成员
		if (e?.code === "P2002") throw new AppError("CONFLICT", 409, "已经是成员");
		throw e;
	}
});
