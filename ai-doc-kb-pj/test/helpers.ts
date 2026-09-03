import { $fetch, fetch } from "@nuxt/test-utils/e2e";

// 注册一个新用户（邮箱带随机后缀，多测试文件并行也不冲突），返回会话 cookie
export async function registerAndGetCookie(prefix: string) {
	const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.dev`;
	const res = await fetch("/api/auth/register", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ email, password: "password123" }),
	});
	if (!res.ok) throw new Error(`register failed: ${res.status} ${await res.text()}`);
	const cookie = res.headers
		.getSetCookie()
		.map((c) => c.split(";")[0])
		.join(";");
	const body = await res.json();
	return { email, userId: body.data.id as string, cookie };
}

// 造一个自动带 cookie 的 $fetch（tets-utils 的 $fetch 没有 cookie jar）
export function makeApi(cookie: string) {
	return (url: string, opts: Record<string, unknown> = {}) =>
		$fetch(url, { ...opts, headers: { cookie, ...(opts.headers as object) } });
}

// 把某个工作区 id 拼进请求头（requireMember 从这里读当前工作区）
export function wsHeader(workspaceId: string) {
	return { "x-workspace-id": workspaceId };
}
