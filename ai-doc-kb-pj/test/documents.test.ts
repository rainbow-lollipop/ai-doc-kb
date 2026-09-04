import { describe, it, expect, beforeAll } from "vitest";
import { setup, $fetch, fetch } from "@nuxt/test-utils/e2e";
import { registerAndGetCookie, makeApi, wsHeader } from "./helpers";

await setup({ server: true });

describe("documents", () => {
	let api: ReturnType<typeof makeApi>;
	let wsId: string;
	let createdIds: string[] = [];

	beforeAll(async () => {
		const u = await registerAndGetCookie("doc");
		api = makeApi(u.cookie, () => wsHeader(wsId));
		// 注册自动建的默认工作区就是当前工作区
		const list = await api(`/api/workspaces`);
		wsId = list.data[0].id;
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
