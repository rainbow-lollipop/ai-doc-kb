import { defineApi } from "~~/server/utils/api";
import { requireMember } from "~~/server/utils/tenant";

export default defineApi(async (event) => {
	const wsId = getRouterParam(event, "id")!;
	await requireMember(event, wsId); // member 也能看名单
	const members = await prisma.workspaceMember.findMany({
		where: { workspaceId: wsId },
		include: { user: { select: { id: true, email: true } } },
		orderBy: { role: "asc" }, // owner 排前面
	});
	return members.map((m) => ({
		userId: m.user.id,
		email: m.user.email,
		role: m.role,
	}));
});
