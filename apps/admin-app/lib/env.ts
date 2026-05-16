/**
 * Centralized environment config for the admin app.
 *
 * Reads from `.env.local` at boot. Server-only secrets (NEXTAUTH_SECRET) are
 * never re-exported to the client; only NEXT_PUBLIC_* values are safe in
 * browser code.
 */
/**
 * Mirror of `next.config.ts -> basePath`. Hard-coded so client/server code
 * outside the Next router (raw `<a>` links, `fetch()`, middleware redirects,
 * `window.location.href` etc.) can prepend it consistently. Keep these two
 * values in sync.
 */
export const BASE_PATH = "/admin";

/** Prepend BASE_PATH to an absolute path. Returns "/" inputs unchanged. */
export function withBase(path: string): string {
  if (!path.startsWith("/")) return `${BASE_PATH}/${path}`;
  return `${BASE_PATH}${path}`;
}

const isServer = typeof window === "undefined";

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    if (isServer && process.env.NODE_ENV === "production") {
      throw new Error(`Missing required env var: ${name}`);
    }
    if (isServer) {
      console.warn(`[admin-app/env] missing ${name} — using empty string`);
    }
    return "";
  }
  return value;
}

export const env = {
  // ── Public (safe in browser) ────────────────────────────────────────────
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8084",
  NEXT_PUBLIC_APP_NAME:
    process.env.NEXT_PUBLIC_APP_NAME ?? "ProfitSaathi Admin",
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
  NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV ?? "development",

  // ── Server-only ─────────────────────────────────────────────────────────
  NEXTAUTH_SECRET: isServer
    ? required("NEXTAUTH_SECRET", process.env.NEXTAUTH_SECRET)
    : "",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "",

  // ── Runtime flags ───────────────────────────────────────────────────────
  isServer,
  isProd: process.env.NODE_ENV === "production",
  isDev: process.env.NODE_ENV !== "production",
} as const;
