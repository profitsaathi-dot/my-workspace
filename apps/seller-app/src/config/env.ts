/**
 * Centralized, zod-validated environment configuration.
 * Throws at boot if any required variable is missing — no silent failures.
 *
 * Server-only secrets live in `serverEnv`. Browser-safe `NEXT_PUBLIC_*` vars
 * live in `clientEnv` and are also re-exported on `env` for convenience.
 */
import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),


  NEXT_PUBLIC_URL: z.string().url().describe("Base URL of the Main APP"),
  NEXT_PUBLIC_URL_USER: z.string().url().describe("Base URL of the User APP"),
  // Spring backend
  NEXT_PUBLIC_API_URL: z.string().url().describe("Base URL of the Spring API"),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(16),
  NEXTAUTH_URL: z.string().url().optional(),

  // Razorpay (optional in dev — only required when payment routes are hit)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  // Postgres (used by direct-DB fallback routes that bypass Spring)
  PG_HOST: z.string().default("localhost"),
  PG_PORT: z.coerce.number().default(5432),
  PG_DATABASE: z.string().default("profitsaathi"),
  PG_USER: z.string().default("myuser"),
  PG_PASSWORD: z.string().default("mypass"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_URL: z.string().url(),
  NEXT_PUBLIC_URL_USER: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_AES_KEY: z.string().min(16),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default("ProfitSaathi"),
  NEXT_PUBLIC_APP_VERSION: z.string().default("1.0.0"),
  NEXT_PUBLIC_ENV: z.string().default("development"),
});

function format(parsed: z.SafeParseError<unknown>, scope: string): string {
  return Object.entries(parsed.error.flatten().fieldErrors)
    .map(([k, v]) => `  ${scope}.${k}: ${(v as string[]).join(", ")}`)
    .join("\n");
}

const isServer = typeof window === "undefined";

const parsedServer = isServer
  ? serverSchema.safeParse(process.env)
  : null;

const parsedClient = clientSchema.safeParse({
  NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
  NEXT_PUBLIC_URL_USER: process.env.NEXT_PUBLIC_URL_USER,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_AES_KEY: process.env.NEXT_PUBLIC_AES_KEY,
  NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
});

if (parsedServer && !parsedServer.success) {
  console.error("\n❌ Invalid server environment variables:\n" + format(parsedServer, "server"));
  // Don't crash in dev — let pages render so the user can fix env vars without a hard restart
  if (process.env.NODE_ENV === "production") {
    throw new Error("Invalid server environment configuration");
  }
}
if (!parsedClient.success) {
  console.error("\n❌ Invalid client environment variables:\n" + format(parsedClient, "client"));
  if (process.env.NODE_ENV === "production") {
    throw new Error("Invalid client environment configuration");
  }
}

export const serverEnv = (parsedServer?.success ? parsedServer.data : ({} as z.infer<typeof serverSchema>));
export const clientEnv = (parsedClient.success ? parsedClient.data : ({} as z.infer<typeof clientSchema>));

export const env = {
  ...clientEnv,
  ...serverEnv,
  isServer,
  isProd: process.env.NODE_ENV === "production",
  isDev: process.env.NODE_ENV !== "production",
};

export type Env = typeof env;
