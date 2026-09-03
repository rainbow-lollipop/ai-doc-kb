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

	it("renames workspace as owner", async () => {
		const u = await registerAndGetCookie("ws-rename");
		const api = makeApi(u.cookie);
		const created = await api("/api/workspaces", {
			method: "POST",
			body: { name: "旧名" },
		});
		const patched = await api(`/api/workspaces/${created.data.id}`, {
			method: "PATCH",
			body: { name: "新名" },
		});
		expect(patched.data.name).toBe("新名");
	});

	it("deletes workspace; afterwards even owner gets 403", async () => {
		const u = await registerAndGetCookie("ws-del");
		const api = makeApi(u.cookie);
		const ws = await api("/api/workspaces", {
			method: "POST",
			body: { name: "要删的" },
		});
		const wsId = ws.data.id;
		const del = await api(`/api/workspaces/${wsId}`, {
			method: "DELETE",
		});
		expect(del.ok).toBe(true);
		// 工作区没了 -> 成员记录也被级联删了 -> 再访问就 403（文档级联在Task 6验证，因为 documents 路由要到Task4才支持指定工作区）
		const again = await api(`/api/workspaces/${wsId}`, {
			method: "DELETE",
		}).catch((e: any) => e.data);
		expect(again.code).toBe("FORBIDDEN");
	});
});
