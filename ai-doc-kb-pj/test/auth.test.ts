import { describe, it, expect } from "vitest";
import { setup, $fetch } from "@nuxt/test-utils/e2e";

const email = `t-${Date.now()}@test.dev`;

// 顶层调用，勿包进 beforeAll（内部自注册钩子，包了会 No context）
await setup({ server: true });

describe("auth", () => {
	it("registers and returns ok envelops", async () => {
		const res = await $fetch("/api/auth/register", {
			method: "POST",
			body: { email, password: "password123" },
		});
		expect(res.ok).toBe(true);
		expect(res.data.email).toBe(email);
	});

	it("rejects duplicate email with 409", async () => {
		const e = await $fetch("/api/auth/register", {
			method: "POST",
			body: { email, password: "password123" },
		}).catch((e: any) => e.data);
		expect(e.code).toBe("CONFLICT");
	});

	it("reject bad email with VALIDATION_ERROR", async () => {
		const e = await $fetch("/api/auth/register", {
			method: "POST",
			body: { email: "not-an-email", password: "password123" },
		}).catch((e: any) => e.data);
		expect(e.code).toBe("VALIDATION_ERROR");
	});
});
