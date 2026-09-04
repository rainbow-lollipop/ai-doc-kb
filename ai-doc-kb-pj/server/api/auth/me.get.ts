import { defineApi } from "~~/server/utils/api";
import { requireUser } from "~~/server/utils/session";

export default defineApi(async (event) => {
	return await requireUser(event);
});
