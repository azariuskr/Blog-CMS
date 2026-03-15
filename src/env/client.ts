import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_BASE_URL: z.url().default("http://localhost:3000"),

    // File Upload Settings
    VITE_MAX_FILE_SIZE_MB: z.coerce.number().default(100),

    VITE_ENABLE_PASSKEYS: z.enum(["true", "false"]).default("false"),
    VITE_ENABLE_2FA: z.enum(["true", "false"]).default("false"),

    // Billing Configuration
    VITE_BILLING_PROVIDER: z.enum(["stripe", "polar", "none"]).default("none"),
    VITE_BLOG_DATA_MODE: z.enum(["live", "mock", "hybrid"]).default("hybrid"),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
