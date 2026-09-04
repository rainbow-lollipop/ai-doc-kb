import { z } from "zod";
import { defineApi } from "../../utils/api";
import { requireMember } from "../../utils/tenant";

const querySchema = z.object({
	cursor: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(50).default(10),
});

export default defineApi(async (event) => {
	// 之前是 findFirst 随便拿第一个工作区，现在显式走租户守卫
	const member = await requireMember(event);
	const { cursor, limit } = querySchema.parse(getQuery(event));

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
