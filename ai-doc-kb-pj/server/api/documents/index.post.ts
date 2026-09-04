import { z } from "zod";
import { defineApi } from "../../utils/api";
import { requireMember } from "../../utils/tenant";

const bodySchema = z.object({
	name: z.string().min(1).max(200),
	type: z.enum(["pdf", "md", "txt"]),
	size: z
		.number()
		.int()
		.min(0)
		.max(20 * 1024 * 1024),
});

export default defineApi(async (event) => {
	const body = bodySchema.parse(await readBody(event));

	const member = await requireMember(event);

	return await prisma.document.create({
		data: {
			workspaceId: member.workspaceId,
			name: body.name,
			type: body.type,
			size: body.size,
			status: "pending",
			uploadedBy: member.userId,
		},
	});
});
