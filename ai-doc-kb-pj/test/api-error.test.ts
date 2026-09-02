// @vitest-environment nuxt
import { describe, it, expect } from "vitest";
import { AppError, ok } from "../server/utils/api";

describe("AppError", () => {
	it("carries code and status", () => {
		const e = new AppError("NOT_FOUND", 404, "文档不存在");
		expect(e.code).toBe("NOT_FOUND");
		expect(e.statusCode).toBe(404);
	});
	it("ok wraps data", () => {
		expect(ok({ a: 1 })).toEqual({ ok: true, data: { a: 1 } });
	});
});
