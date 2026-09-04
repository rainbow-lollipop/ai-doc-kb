import { defineApi } from "~~/server/utils/api";
import { requireOwner } from "~~/server/utils/tenant";

export default defineApi(async (event) => {
	const m = await requireOwner(event, getRouterParam(event, "id")!);
	// 级联删除在数据库层（Task 1的迁移）：成员记录和文档自动一起删
	// 所以这里一条语句就够，不需要事务
	await prisma.workspace.delete({ where: { id: m.workspaceId } });
	return null;
});
