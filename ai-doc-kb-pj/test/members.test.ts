import { describe, it, expect } from "vitest";
import { setup } from "@nuxt/test-utils/e2e";
import { registerAndGetCookie, makeApi, wsHeader } from "./helpers";

await setup({ server: true });

describe("member", () => {
	it("owner adds member by email; member sees documents", async () => {
		const owner = await registerAndGetCookie("m-owner");
		const member = await registerAndGetCookie("m-member");
		const ownerApi = makeApi(owner.cookie);
		const memberApi = makeApi(member.cookie);

		const ws = await ownerApi("/api/workspaces", {
			method: "POST",
			body: { name: "协作空间" },
		});

		const wsId = ws.data.id;

		// owner 建一条文档
		await ownerApi("/api/documents", {
			method: "POST",
			headers: wsHeader(wsId),
			body: { name: "共享文档.md", type: "md", size: 1 },
		});

		// 按邮箱邀请
		const added = await ownerApi(`/api/workspaces/${wsId}/members`, {
			method: "POST",
			body: { email: member.email },
		});
		expect(added.ok).toBe(true);
		expect(added.data.role).toBe("member");

		// 重复添加 -> 409
		const dup = await ownerApi(`/api/workspaces/${wsId}/members`, {
			method: "POST",
			body: { email: member.email },
		}).catch((e: any) => e.data);
		expect(dup.code).toBe("CONFLICT");

		// 未注册邮箱 -> 404
		const ghost = await ownerApi(`/api/workspaces/${wsId}/members`, {
			method: "POST",
			body: { email: "ghost@test.dev" },
		}).catch((e: any) => e.data);
		expect(ghost.code).toBe("NOT_FOUND");

		// member 能看到 owner 建的文档（租户共享，不是隔离）
		const docs = await memberApi("/api/documents", { headers: wsHeader(wsId) });
		expect(docs.data.items.some((d: any) => d.name === "共享文档.md")).toBe(true);

		// member 也能建文档
		const created = await memberApi("/api/documents", {
			method: "POST",
			headers: wsHeader(wsId),
			body: { name: "成员新建.txt", type: "txt", size: 1 },
		});
		expect(created.ok).toBe(true);
	});

	it("member can view but not manage", async () => {
		const owner = await registerAndGetCookie("m2-woner");
		const member = await registerAndGetCookie("m2-member");
		const ownerApi = makeApi(owner.cookie);
		const memberApi = makeApi(member.cookie);

		const ws = await ownerApi("/api/workspaces", {
			method: "POST",
			body: { name: "边界" },
		});
		const wsId = ws.data.id;
		await ownerApi(`/api/workspaces/${wsId}/members`, {
			method: "POST",
			body: { email: member.email },
		});

		// member 能看成员列表
		const list = await memberApi(`/api/workspaces/${wsId}/members`);
		expect(list.data).toHaveLength(2);

		// member 不能改名单独加入 / 改名 / 删工作区 / 踢人
		const add = await memberApi(`/api/workspaces/${wsId}/members`, {
			method: "POST",
			body: { email: "x@test.dev" },
		}).catch((e: any) => e.data);
		expect(add.code).toBe("FORBIDDEN");

		const rename = await memberApi(`/api/workspaces/${wsId}`, {
			method: "PATCH",
			body: { name: "夺权" },
		}).catch((e: any) => e.data);
		expect(rename.code).toBe("FORBIDDEN");

		const del = await memberApi(`/api/workspaces/${wsId}`, {
			method: "DELETE",
		}).catch((e: any) => e.data);
		expect(rename.code).toBe("FORBIDDEN");

		const kick = await memberApi(`/api/workspaces/${wsId}/members/${owner.userId}`, {
			method: "DELETE",
		}).catch((e: any) => e.data);
		expect(kick.code).toBe("FORBIDDEN");
	});

	it("owner cannot be removed", async () => {
		const owner = await registerAndGetCookie("m3-owner");
		const member = await registerAndGetCookie("m3-member");
		const ownerApi = makeApi(owner.cookie);

		const ws = await ownerApi("/api/workspaces", {
			method: "POST",
			body: { name: "王座" },
		});
		const wsId = ws.data.id;
		await ownerApi(`/api/workspaces/${wsId}/members`, {
			method: "POST",
			body: { email: member.email },
		});

		// 踢自己（owner） -> 422
		const self = await ownerApi(`/api/workspaces/${wsId}/members/${owner.userId}`, {
			method: "DELETE",
		}).catch((e: any) => e.data);
		expect(self.code).toBe("VALIDATION_ERROR");

		// 踢普通成员 -> 成功，且对方立即失去访问权
		const ok = await ownerApi(`/api/workspaces/${wsId}/members/${member.userId}`, {
			method: "DELETE",
		});
		expect(ok.ok).toBe(true);
		const memberApi = makeApi(member.cookie);
		const denied = await memberApi(`/api/documents`, {
			headers: wsHeader(wsId),
		}).catch((e: any) => e.data);
		expect(denied.code).toBe("FORBIDDEN");
	});
});
