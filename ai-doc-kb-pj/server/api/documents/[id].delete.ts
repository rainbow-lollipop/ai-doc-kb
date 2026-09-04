import { defineApi, AppError } from "~~/server/utils/api";
import { requireMember } from "~~/server/utils/tenant";

export default defineApi(async (event) => {
	const id = getRouterParam(event, "id")!;
	const member = await requireMember(event);

	const doc = await prisma.document.findFirst({
		where: { id, workspaceId: member?.workspaceId },
	});
	if (!doc) throw new AppError("NOT_FOUND", 404, "文档不存在");
	await prisma.document.delete({ where: { id: doc.id } });
	return null;
});
