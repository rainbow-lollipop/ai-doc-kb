import type { H3Event } from "h3";
import { AppError } from "./api";
import { requireUser } from "./session";

// 租户校验的唯一入口。所有「按工作区读写数据」的路由必须先过这里：
// workspaceId 优先取路由参数（/api/workspaces/:id 类路由），否则取请求头（集合路由）
// 校验通过返回成员信息（含 role），不是成员 -> 403，没指定工作区 -> 422
export async function requireMember(event: H3Event, workspaceId?: string) {
	const user = await requireUser(event);
	const wsId = workspaceId ?? getHeader(event, "x-workspace-id");
	if (!wsId) throw new AppError("VALIDATION_ERROR", 422, "缺少 x-workspace-id 请求头");
	const m = await prisma.workspaceMember.findUnique({
		where: { workspaceId_userId: { workspaceId: wsId, userId: user.id } },
	});
	// 注意：随机的 workspaceId 同样走到这返回 403 --不区分「不存在」和「不是你的」
	// 避免向未授权者泄漏工作区 id 是否存在
	if (!m) throw new AppError("FORBIDDEN", 403, "不是该工作区成员");
	return { workspaceId: m.workspaceId, role: m.role, userId: user.id };
}

// owner-only 操作（删工作区/改名/管理成员）的守卫
export async function requireOwner(event: H3Event, workspaceId: string) {
	const m = await requireMember(event, workspaceId);
	if (m.role !== "owner") throw new AppError("FORBIDDEN", 403, "需要 owner 权限");
	return m;
}
