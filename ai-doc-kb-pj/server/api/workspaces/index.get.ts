import { defineApi } from "~~/server/utils/api";
import { requireUser } from "~~/server/utils/session";

export default defineApi(async (event) => {
	const user = await requireUser(event);
	// 「我的工作区列表」= 我作为成员的所有记录，带出工作区信息和我的角色
	const memberships = await prisma.workspaceMember.findMany({
		where: { userId: user.id },
		include: { workspace: { select: { id: true, name: true } } },
		orderBy: { workspace: { createdAt: "asc" } },
	});
	return memberships.map((m) => ({
		id: m.workspace.id,
		name: m.workspace.name,
		role: m.role,
	}));
});
