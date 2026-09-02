import type { H3Event } from "h3";
import { AppError } from "./api";

const SESSION_TTL = 60 * 60 * 24 * 7;
export const SESSION_COOKIE = "sid";

export async function createSession(event: H3Event, user: { id: string; email: string }) {
	const sid = crypto.randomUUID();
	await useRedis().setex(`session:${sid}`, SESSION_TTL, JSON.stringify(user));
	setCookie(event, SESSION_COOKIE, sid, {
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		maxAge: SESSION_TTL,
	});
}

export async function getSessionUser(event: H3Event) {
	const sid = getCookie(event, SESSION_COOKIE);
	if (!sid) return null;
	const raw = await useRedis().get(`session:${sid}`);
	return raw ? (JSON.parse(raw) as { id: string; email: string }) : null;
}

export async function destroySession(event: H3Event) {
	const sid = getCookie(event, SESSION_COOKIE);
	if (sid) await useRedis().del(`session:${sid}`);
	deleteCookie(event, SESSION_COOKIE, { path: "/" });
}

export async function requireUser(event: H3Event) {
	const user = await getSessionUser(event);
	if (!user) throw new AppError("UNATHORIZED", 401, "未登录");
	return user;
}
