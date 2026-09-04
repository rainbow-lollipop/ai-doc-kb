import { defineApi } from "~~/server/utils/api";

export default defineApi(async (event) => {
	await destroySession(event);
	return null;
});
