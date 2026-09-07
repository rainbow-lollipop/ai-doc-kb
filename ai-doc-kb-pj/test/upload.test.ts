import { describe, it, expect, beforeAll } from "vitest";
import { setup } from "@nuxt/test-utils/e2e";
import { registerAndGetCookie, makeApi, wsHeader } from "./helpers";

await setup({ server: true });

// 构造 multipart 的辅助：node18+ 的 undici 全局有 FormData/Blob
function filePart(content: string | Uint8Array, name: string, type: string) {
	const form = new FormData();
	form.append("file", new Blob([content], { type }), name);
	return form;
}

describe("upload", () => {
	let api: ReturnType<typeof makeApi>;
	let wsId: string;

	beforeAll(async () => {
		const u = await registerAndGetCookie("up");
		api = makeApi(u.cookie, () => wsHeader(wsId));
		const list = await api("/api/workspaces");
		wsId = list.data[0].id;
	});

	it("accepts a markdown file and creates pending document", async () => {
		const res = await api("/api/documents/upload", {
			method: "POST",
			body: filePart("# 标题\n\n正文内容", "入门.md", "text/markdown"),
		});
		expect(res.ok).toBe(true);
		expect(res.data.status).toBe("pending"); // 没有 worker 时停在pending
		expect(res.data.type).toBe("md");
		expect(res.data.size).toBeGreaterThan(0);
	});

	it("rejects non-whitelisted type", async () => {
		const e = await api("/api/documents/upload", {
			method: "POST",
			body: filePart("MZ...", "virus.exe", "application/octet-stream"),
		}).catch((e: any) => e.data);
		expect(e.code).toBe("VALIDATION_ERROR");
	});

	it("rejects files over 20MB", async () => {
		const big = new Uint8Array(20 * 1024 * 1024 + 1);
		const e = await api("/api/documents/upload", {
			method: "POST",
			body: filePart(big, "big.md", "text/markdown"),
		}).catch((e: any) => e.data);
		expect(e.code).toBe("VALIDATION_ERROR");
	});

	it("rejects duplicate name+size while pending(idempotency)", async () => {
		const body = filePart("重复内容", "dup.md", "text/markdown");
		// 第一条还在pending
		await api("/api/documents/upload", {
			method: "POST",
			body,
		});
		const e = await api("/api/documents/upload", {
			method: "POST",
			body,
		}).catch((e: any) => e.data);
		expect(e.code).toBe("CONFLICT");
	});
});
