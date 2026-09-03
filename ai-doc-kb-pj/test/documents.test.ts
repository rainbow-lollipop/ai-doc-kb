import { describe, it, expect, beforeAll } from "vitest";
import { setup, $fetch, fetch } from "@nuxt/test-utils/e2e";

const email = `d-${Date.now()}@test.dev`;

// $fetch 没有 cookie jar，需手动从注册响应取 sid，后续请求都带上
let cookie = "";
const api = (url: string, opts: Record<string, unknown> = {}) =>
	$fetch(url, { ...opts, headers: { cookie, ...(opts.headers as object) } });

await setup({ server: true });

describe("documents", () => {
	let createdIds: string[] = [];

	beforeAll(async () => {
		// $fetch 没有raw，用 fetch（带 baseURL 的原生 fetch）读响应头
		const res = await fetch("/api/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password: "password123" }),
		});
		cookie = res.headers
			.getSetCookie()
			.map((c) => c.split(";")[0])
			.join(";");
	});

	it("createds a document", async () => {
		const res = await api("/api/documents", {
			method: "POST",
			body: { name: "入门指南.md", type: "md", size: 1024 },
		});
		expect(res.ok).toBe(true);
		createdIds.push(res.data.id);
	});

	it("validates type enum", async () => {
		const e = await api("/api/documents", {
			method: "POST",
			body: { name: "x.exe", type: "exe", size: 1 },
		}).catch((e: any) => e.data);
		expect(e.code).toBe("VALIDATION_ERROR");
	});

	it("Lists with cursor pagination", async () => {
		for (let i = 0; i < 3; i++) {
			await api("/api/documents", {
				method: "POST",
				body: { name: `doc-${i}.txt`, type: "txt", size: 10 },
			});
		}
		const page1: any = await api("/api/documents?limit=2");
		expect(page1.data.items).toHaveLength(2);
		expect(page1.data.nextCursor).toBeTruthy();
		const page2 = await api(`/api/documents?limit=2&cursor=${page1.data.nextCursor}`);
		expect(page2.data.items.length).toBeGreaterThanOrEqual(1);
		// 网页无重复
		const ids = new Set([...page1.data.items, ...page2.data.items].map((d: any) => d.id));
		expect(ids.size).toBe(page1.data.items.length + page2.data.items.length);
	});

	it("returns 404 for unknown id", async () => {
		const e = await api("/api/documents/nope").catch((e: any) => e.data);
		expect(e.code).toBe("NOT_FOUND");
	});

	it("deletes own document", async () => {
		const res = await api(`/api/documents/${createdIds[0]}`, { method: "DELETE" });
		expect(res.ok).toBe(true);
		const e = await api(`/api/documents/${createdIds[0]}`).catch((e: any) => e.data);
		expect(e.code).toBe("NOT_FOUND");
	});
});
