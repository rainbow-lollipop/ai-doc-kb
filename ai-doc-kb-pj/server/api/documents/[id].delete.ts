import { defineApi, AppError } from "../../utils/api";
import { requireUser } from "../../utils/session";

export default defineApi(async (event) => {
	const user = await requireUser(event);
	const id = getRouterParam(event, "id")!;
	const member = await prisma.workspaceMember.findFirst({ where: { userId: user.id } });

	const doc = await prisma.document.findFirst({
		where: { id, workspaceId: member?.workspaceId },
	});
	if (!doc) throw new AppError("NOT_FOUND", 404, "文档不存在");
	await prisma.document.delete({ where: { id: doc.id } });
	return null;
});
