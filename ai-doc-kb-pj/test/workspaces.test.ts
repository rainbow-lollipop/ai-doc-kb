import { describe, it, expect } from "vitest";
import { setup, $fetch } from "@nuxt/test-utils/e2e";
import { registerAndGetCookie, makeApi } from "./helpers";

await setup({ server: true });

describe("workspace", () => {
	it("lists the default workspace after register", async () => {
		const u = await registerAndGetCookie("ws-list");
		const api = makeApi(u.cookie);
		const res = await api("/api/workspaces");
		expect(res.ok).toBe(true);
		expect(res.data).toHaveLength(1); // 注册时自动建的「我的知识库」
		expect(res.data[0].name).toBe("我的知识库");
		expect(res.data[0].role).toBe("owner");
	});

	it("creates a workspace and lists both", async () => {
		const u = await registerAndGetCookie("ws-create");
		const api = makeApi(u.cookie);
		const created = await api("/api/workspaces", {
			method: "POST",
			body: { name: "团队空间" },
		});
		expect(created.ok).toBe(true);
		expect(created.data.name).toBe("团队空间");
		const list = await api("/api/workspaces");
		expect(list.data).toHaveLength(2);
	});

	it("rejects empty name with VALIDATION_ERROR", async () => {
		const u = await registerAndGetCookie("ws-valid");
		const api = makeApi(u.cookie);
		const e = await api("/api/workspaces", {
			method: "POST",
			body: { name: "" },
		}).catch((e: any) => e.data);
		expect(e.code).toBe("VALIDATION_ERROR");
	});

	it("requires login", async () => {
		const e = await $fetch("/api/workspaces").catch((e: any) => e.data);
		expect(e.code).toBe("UNAUTHORIZED");
	});
});
