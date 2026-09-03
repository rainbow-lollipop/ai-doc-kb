import { z } from "zod";
import { defineApi, AppError } from "../../utils/api";
import { requireUser } from "../../utils/session";

const querySchema = z.object({
	cursor: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(50).default(10),
});

export default defineApi(async (event) => {
	const user = await requireUser(event);
	const { cursor, limit } = querySchema.parse(getQuery(event));

	const member = await prisma.workspaceMember.findFirst({ where: { userId: user.id } });
	if (!member) throw new AppError("NOT_FOUND", 404, "没有工作区");

	const rows = await prisma.document.findMany({
		where: { workspaceId: member.workspaceId },
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: limit + 1,
		...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
	});
	const hasMore = rows.length > limit;
	return {
		items: rows.slice(0, limit),
		nextCursor: hasMore ? rows[limit - 1]!.id : null,
	};
});
