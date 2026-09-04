import { z } from "zod";
import { defineApi } from "~~/server/utils/api";
import { requireOwner } from "~~/server/utils/tenant";

const bodySchema = z.object({
	name: z.string().min(1).max(50),
});

export default defineApi(async (event) => {
	// workspaceId 来自路由参数，直接传给守卫（不走请求头）
	const m = await requireOwner(event, getRouterParam(event, "id")!);
	const { name } = bodySchema.parse(await readBody(event));
	return await prisma.workspace.update({ where: { id: m.workspaceId }, data: { name } });
});
