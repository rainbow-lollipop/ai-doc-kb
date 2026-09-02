import { defineApi } from "../../utils/api";
import { requireUser } from "../../utils/session";

export default defineApi(async (event) => {
	return await requireUser(event);
});
