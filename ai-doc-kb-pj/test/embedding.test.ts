import { describe, it, expect } from "vitest";
import { embedTexts } from "~~/server/utils/embedding";

// 没 key 就跳过：CI/本地都能跑，有 key 才真调 API
const d = describe.skipIf(
	!process.env.EMBEDDING_API_KEY || process.env.EMBEDDING_ENABLED !== "true",
);

d("embedding", () => {
	it("returns vectors with configured dimension", async () => {
		const vectors = await embedTexts(["你好世界", "第二个切片"]);
		expect(vectors).toHaveLength(2);
		expect(vectors[0]!.length).toBe(Number(process.env.EMBEDDING_DIM ?? 1536), 30000);
	});
});
