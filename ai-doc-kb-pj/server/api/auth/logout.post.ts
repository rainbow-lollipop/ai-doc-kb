import { defineApi } from "../../utils/api";

export default defineApi(async (event) => {
	await destroySession(event);
	return null;
});
