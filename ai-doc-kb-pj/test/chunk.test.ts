import { describe, it, expect } from "vitest";
import { chunkText } from "~~/server/utils/chunk";

describe("chunkText", () => {
	it("splits long text into 500-char chunks with 50-char overlap", () => {
		const text = "a".repeat(1200);
		const chunks = chunkText(text);
		expect(chunks.length).toBe(3); // 500 + 450+50... = 每步前进 450,1200 -> 3 片
		expect(chunks[0].length).toBe(500);
		// 相邻两片重叠 50 字
		expect(chunks[1].startsWith(chunks[0].slice(-50))).toBe(true);
	});

	it("returns single chunk for short text", () => {
		expect(chunkText("短文本")).toEqual(["短文本"]);
	});

	it("drops whitespace-only chunks", () => {
		// 490个字母 + 20个换行（不足以构成新片的实 content）-> 不产生纯空白片
		const chunks = chunkText("a".repeat(490) + "\n".repeat(20) + "b".repeat(100));
		for (const c of chunks) expect(c.trim().length).toBeGreaterThan(0);
	});

	it("empty text yields empty array", () => {
		expect(chunkText("")).toEqual([]);
	});
});
