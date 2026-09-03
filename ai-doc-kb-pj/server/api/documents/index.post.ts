import { z } from "zod";
import { defineApi } from "../../utils/api";
import { requireUser } from "../../utils/session";

const bodySchema = z.object({
	name: z.string().min(1).max(200),
	type: z.enum(["pdf", "md", "txt"]),
	size: z
		.number()
		.int()
		.min(0)
		.max(20 * 1024 * 1024),
});

export default defineApi(async (event) => {
	const user = await requireUser(event);
	const body = bodySchema.parse(await readBody(event));
	const member = await prisma.workspaceMember.findFirst({ where: { userId: user.id } });
	if (!member) throw new Error("user without workspace"); // 注册时必建工作区，走到这属内部错误

	return await prisma.document.create({
		data: {
			workspaceId: member.workspaceId,
			name: body.name,
			type: body.type,
			size: body.size,
			status: "pending",
			uploadedBy: user.id,
		},
	});
});
