import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setup } from "@nuxt/test-utils/e2e";
import { Worker } from "bullmq";
import Redis from "ioredis";
import { registerAndGetCookie, makeApi, wsHeader } from "./helpers";
import { processParseJob } from "~~/server/utils/parse";

await setup({ server: true });

let worker: Worker;
beforeAll(async () => {
	worker = new Worker("doc-parse", processParseJob, {
		connection: new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
			maxRetriesPerRequest: null,
		}),
		concurrency: 1,
	});
});
afterAll(async () => {
	await worker.close();
});

async function waitForStatus(
	api: ReturnType<typeof makeApi>,
	id: string,
	want: string[],
	timeoutMs = 40000,
) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		const res = await api(`/api/documents/${id}`);
		if (want.includes(res.data.status)) return res.data;
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error(`timeout: document ${id} did not reach ${want.join("/")}`);
}

describe("retry and dead letter", () => {
	it("bad pdf retries then fails with reason", async () => {
		const u = await registerAndGetCookie("retry");
		const list = await makeApi(u.cookie)("/api/workspaces");
		const wsId = list.data[0].id;
		const api = makeApi(u.cookie, () => wsHeader(wsId));

		// 内容不是合法 pdf，但扩展名是 .pdf -> 解析必炸
		const up = await api("/api/documents/upload", {
			method: "POST",
			body: (() => {
				const form = new FormData();
				form.append(
					"file",
					new Blob(["this is not a pdf"], { type: "application/pdf" }),
					"bad.pdf",
				);
				return form;
			})(),
		});
		expect(up.ok).toBe(true);

		// 3 次尝试 + 2s/4s 退避 = 6-8 秒；给 40s 富余
		const doc = await waitForStatus(api, up.data.id, ["failed"], 40000);
		expect(doc.status).toBe("failed");
		expect(doc.error).toBeTruthy(); // 失败原因可见，不是一句干巴巴的 failed
	}, 60000); // vitest 单测超时也要放宽
});
