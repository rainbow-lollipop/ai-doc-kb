import { z } from "zod";
import { defineApi } from "../../utils/api";
import { requireUser } from "../../utils/session";

const bodySchema = z.object({
	name: z.string().min(1).max(50),
});

export default defineApi(async (event) => {
	const user = await requireUser(event);
	const { name } = bodySchema.parse(await readBody(event));
	// 和注册建默认工作区一样：工作区和 owner 成员记录必须同生共死
	return await prisma.$transaction(async (tx) => {
		const ws = await tx.workspace.create({ data: { name, ownerId: user.id } });
		await tx.workspaceMember.create({
			data: { workspaceId: ws.id, userId: user.id, role: "owner" },
		});
		return ws;
	});
});
