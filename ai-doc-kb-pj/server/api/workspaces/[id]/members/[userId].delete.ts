import { defineApi, AppError } from "~~/server/utils/api";
import { requireOwner } from "~~/server/utils/tenant";

export default defineApi(async (event) => {
	const wsId = getRouterParam(event, "id")!;
	const targetUserId = getRouterParam(event, "userId")!;
	await requireOwner(event, wsId);

	const target = await prisma.workspaceMember.findUnique({
		where: { workspaceId_userId: { workspaceId: wsId, userId: targetUserId } },
	});
	if (!target) throw new AppError("NOT_FOUND", 404, "不是该工作区成员");
	// owner 不可被移除（含 owner 踢自己）-- 工作区必须至少保留一个 owner
	if (target.role === "owner") throw new AppError("VALIDATION_ERROR", 422, "不能移除owner");

	await prisma.workspaceMember.delete({
		where: { workspaceId_userId: { workspaceId: wsId, userId: targetUserId } },
	});
	return null;
});
