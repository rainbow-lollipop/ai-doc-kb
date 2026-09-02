import { describe, expect, it } from "vitest";
import { $fetch, setup } from "@nuxt/test-utils";

// setup 必须在模块顶层调用：它内部自己注册 beforeAll，
// 包在自己的 beforeAll 里会太晚，$fetch 会报 No context is available
await setup({ server: true });

describe("smoke", () => {
	it("nuxt server boots", async () => {
		// 冒烟目标只是「server 能起来」：断言首页 200。
		// 注意：Nuxt 对未知路径（含不存在的 /api/*）走 SPA 兜底返回 200 HTML，
		// 不能靠「访问不存在的路由期待 404」来测
		const html = await $fetch("/");
		expect(typeof html).toBe("string");
	});
});
