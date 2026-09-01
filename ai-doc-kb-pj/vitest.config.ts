import { defineVitestConfig } from "@nuxt/test-utils/config";

export default defineVitestConfig({
	resolve: {
		alias: {
			// @nuxt/test-utils 内部保留了 await import("bun:test")(bun 运行时专用,
			// node/vitest 下永不执行),但 vitest4+vite8 内联打包时会解析它而报错,
			// 上游 https://github.com/nuxt/test-utils/issues/1490 未修,先重定向绕过
			"bun:test": "vitest",
		},
	},
});
