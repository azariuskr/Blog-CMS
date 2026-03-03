import { Inngest } from "inngest";
import { env } from "@/env/server";

export const inngest = new Inngest({
	id: "tanstarter",
	eventKey: env.INNGEST_EVENT_KEY,
	baseUrl: env.INNGEST_BASE_URL,
	isDev: env.INNGEST_DEV ?? env.NODE_ENV !== "production",
});
