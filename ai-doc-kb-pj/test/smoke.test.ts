import { beforeAll, describe, expect, it } from "vitest";
import { $fetch, setup } from "@nuxt/test-utils";

beforeAll(async () => {
	await setup({ build: true, server: true });
}, 300_000);

describe("smoke", () => {
	it("nuxt server boots", async () => {
		// nuxt 默认404也有响应，能拿到任何 http 响应即算通过
		try {
			await $fetch("/api/health");
		} catch (e: any) {
			expect([404, 200]).toContain(e.statusCode ?? e.response?.status);
		}
	});
});
