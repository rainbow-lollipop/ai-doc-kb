import { ZodError } from "zod";
import type { H3Event, EventHandlerRequest } from "h3";
import { MessageChannel } from "node:worker_threads";

export type ErrorCode =
	| "VALIDATION_ERROR"
	| "UNATHORIZED"
	| "FORBIDDEN"
	| "NOT_FOUND"
	| "RATE_LIMITED"
	| "CONFLICT"
	| "INTERNAL";

export class AppError extends Error {
	constructor(
		public code: ErrorCode,
		public statusCode: number,
		message: string,
	) {
		super(message);
	}
}

export function ok(data: unknown) {
	return { ok: true, data };
}

// 所有 server/api 路由统一用这个包装：业务代码只管 throw，
// 错误结构、状态码、日志在这里收口
export function defineApi<T>(fn: (event: H3Event) => Promise<T>) {
	return defineEventHandler(async (event: H3Event) => {
		try {
			return ok(await fn(event));
		} catch (e) {
			if (e instanceof AppError) {
				setResponseStatus(event, e.statusCode);
				return { ok: false, code: e.code, message: e.message };
			}
			if (e instanceof ZodError) {
				setResponseStatus(event, 422);
				return {
					ok: false,
					code: "VALIDATION_ERROR",
					message: e.issues[0]?.message ?? "参数错误",
				};
			}
			console.error("[api]", e);
			setResponseStatus(event, 500);
			return { ok: false, code: "INTERNAL", message: "服务器内部错误" };
		}
	});
}
