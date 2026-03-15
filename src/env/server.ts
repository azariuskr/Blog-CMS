import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

const zBool = z
  .string()
  .transform((v) => v === "true" || v === "1");

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    VITE_BASE_URL: z.url().default("http://localhost:3000"),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    BETTER_AUTH_SECRET: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    COOKIE_PREFIX: z.string().min(1),

    ENABLE_PASSKEYS: zBool.default(false),
    ENABLE_2FA: zBool.default(false),

    // ==========================================================================
    // BILLING CONFIGURATION
    // ==========================================================================

    // Provider selection: "stripe" | "polar" | "none"
    BILLING_PROVIDER: z.enum(["stripe", "polar", "none"]).default("none"),

    // Stripe Configuration
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    // Stripe Price IDs (configured per plan)
    STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
    STRIPE_PRO_YEARLY_PRICE_ID: z.string().optional(),
    STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: z.string().optional(),
    STRIPE_ENTERPRISE_YEARLY_PRICE_ID: z.string().optional(),

    // Polar Configuration
    POLAR_ACCESS_TOKEN: z.string().optional(),
    POLAR_WEBHOOK_SECRET: z.string().optional(),
    POLAR_ORGANIZATION_ID: z.string().optional(),

    // Polar Product IDs
    POLAR_PRO_PRODUCT_ID: z.string().optional(),
    POLAR_ENTERPRISE_PRODUCT_ID: z.string().optional(),

    // Billing Settings
    BILLING_TRIAL_DAYS: z.coerce.number().default(14),
    BILLING_GRACE_PERIOD_DAYS: z.coerce.number().default(3),
    BILLING_DEFAULT_CURRENCY: z.string().default("usd"),

    // Email Configuration
    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().default(1025),
    SMTP_SECURE: z
      .string()
      .optional()
      .transform((val) => val === "true"),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    EMAIL_FROM: z.string().default("noreply@tanstarter.local"),
    EMAIL_FROM_NAME: z.string().default("TanStack SaaS Template"),

    // File Storage Configuration
    // "local" = filesystem (default, no dependencies)
    // "minio" = MinIO S3-compatible storage
    STORAGE_PROVIDER: z.enum(["local", "minio", "r2"]).default("minio"),

    // Cloudflare R2 (optional unless provider=r2)
    R2_ENDPOINT: z.string().optional(),
    R2_PUBLIC_URL: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional(),

    // Local Storage (default, no external dependencies)
    LOCAL_STORAGE_PATH: z.string().default("./storage"),
    LOCAL_STORAGE_URL_PREFIX: z.string().default("/api/storage/files"),

    // MinIO S3-compatible Storage
    MINIO_ENDPOINT: z.string().default("localhost"),
    MINIO_PORT: z.coerce.number().default(9000),
    MINIO_ACCESS_KEY: z.string().default("minioadmin"),
    MINIO_SECRET_KEY: z.string().default("minioadmin123"),
    MINIO_USE_SSL: z
      .string()
      .optional()
      .transform((val) => val === "true"),
    MINIO_BUCKET_NAME: z.string().default("tanstack-files"),
    MINIO_REGION: z.string().default("us-east-1"),

    // File Processing
    MAX_FILE_SIZE_MB: z.coerce.number().default(100),
    IMAGE_QUALITY: z.coerce.number().default(85),
    IMAGE_THUMBNAIL_SIZE: z.coerce.number().default(300),

    // Inngest Background Job Processing
    INNGEST_EVENT_KEY: z.string().default("inngest-event-key-dev"),
    INNGEST_SIGNING_KEY: z.string().default("signkey-dev"),
    INNGEST_BASE_URL: z.url().default("http://localhost:8288"),
    INNGEST_APP_URL: z.url().default("http://localhost:3000"),
    INNGEST_DEV: z
      .string()
      .optional()
      .transform((val) => val === "true" || val === "1"),

    // Redis Configuration
    REDIS_URL: z.string().default("redis://localhost:6379"),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_DB: z.coerce.number().default(0),

    BLOG_DATA_MODE: z.enum(["live", "mock", "hybrid"]).default("hybrid"),
  },
  runtimeEnv: process.env,
});
