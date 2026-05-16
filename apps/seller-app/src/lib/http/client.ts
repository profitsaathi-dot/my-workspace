/**
 * Server-side HTTP client for the Spring backend.
 *
 * Responsibilities:
 *   - Resolve the base URL from validated env config.
 *   - Inject Bearer auth from the caller's NextAuth JWT (when provided).
 *   - Normalize errors into the typed `ApiError` family so route handlers
 *     can call `toApiResponse(err)` and return a consistent JSON shape.
 *
 * This file is server-only — it imports `next-auth/jwt` and reads request
 * cookies. Do not import from a client component.
 */
// Server-only: imports next-auth/jwt and reads request cookies.
// Don't import from a client component.
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { env } from "@/src/config/env";
import {
  ApiError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "./errors";

export interface RequestOptions extends Omit<RequestInit, "body"> {
  /** Attach Bearer token from the NextAuth session. */
  authFromRequest?: NextRequest;
  /** Provide a Bearer token directly (e.g. when re-using a parent token). */
  bearerToken?: string;
  /** When true, don't throw on 4xx/5xx — caller handles. */
  raw?: boolean;
  body?: BodyInit | object | null;
}

export interface ApiClient {
  get<T = unknown>(path: string, opts?: RequestOptions): Promise<T>;
  post<T = unknown>(path: string, body?: unknown, opts?: RequestOptions): Promise<T>;
  put<T = unknown>(path: string, body?: unknown, opts?: RequestOptions): Promise<T>;
  delete<T = unknown>(path: string, opts?: RequestOptions): Promise<T>;
  /** Raw fetch — caller handles status. Used for binary/multipart. */
  fetch(path: string, opts?: RequestOptions): Promise<Response>;
}

/**
 * Token-refresh buffer in seconds. If the JWT's `expiresAt` is within this
 * window we trade an extra backend round-trip for a guaranteed-fresh
 * access_token, instead of letting the route handler send a stale one and
 * waiting for Spring to 401.
 */
const REFRESH_BUFFER_SECONDS = 60;

/**
 * Direct refresh against Spring's `/api/v1/auth/refresh`. Mirrors the refresh
 * logic in `lib/auth/options.ts` but without touching NextAuth's cookie —
 * the next SessionProvider poll (every 4 min) will rewrite the cookie via
 * the jwt callback. Until then we just hand callers the fresh access_token.
 */
async function refreshAccessTokenInline(refreshToken: string): Promise<string | undefined> {
  try {
    const base = env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
    const res = await fetch(`${base}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as { accessToken?: string };
    return json.accessToken;
  } catch (err) {
    console.error("[apiClient] inline refresh failed:", err);
    return undefined;
  }
}

async function resolveBearer(opts: RequestOptions): Promise<string | undefined> {
  if (opts.bearerToken) return opts.bearerToken;
  if (!opts.authFromRequest) return undefined;

  const token = await getToken({
    req: opts.authFromRequest,
    secret: env.NEXTAUTH_SECRET,
  });
  if (!token) return undefined;

  const expiresAt = (token.expiresAt as number | undefined) ?? 0;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const refreshToken = token.refreshToken as string | undefined;

  // Cookie's access_token is still good — use it.
  if (expiresAt - REFRESH_BUFFER_SECONDS > nowSeconds) {
    return token.accessToken as string | undefined;
  }

  // Cookie says we're inside the buffer. Try to refresh inline so this
  // request goes out with a fresh token. If refresh fails (backend down,
  // refresh_token revoked), fall back to the existing access_token —
  // Spring will 401 and proxy.ts will redirect to sign-out on the next
  // page load.
  if (refreshToken) {
    const fresh = await refreshAccessTokenInline(refreshToken);
    if (fresh) return fresh;
  }
  return token.accessToken as string | undefined;
}

function buildUrl(path: string): string {
  const base = env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function throwForStatus(res: Response): Promise<never> {
  let body: unknown;
  try {
    body = await res.clone().json();
  } catch {
    try {
      body = await res.clone().text();
    } catch {
      body = undefined;
    }
  }
  const message = (typeof body === "object" && body && "message" in body
    ? String((body as any).message)
    : null) ?? `Upstream ${res.status} ${res.statusText}`;

  switch (res.status) {
    case 400:
      throw new BadRequestError(message);
    case 401:
      throw new UnauthorizedError(message);
    case 404:
      throw new NotFoundError(message);
    default:
      throw new ApiError(res.status, message, body);
  }
}

export const apiClient: ApiClient = {
  async fetch(path, opts = {}) {
    const headers = new Headers(opts.headers);
    const bearer = await resolveBearer(opts);
    if (bearer) headers.set("Authorization", `Bearer ${bearer}`);

    let body: BodyInit | undefined;
    if (opts.body !== undefined && opts.body !== null) {
      if (
        opts.body instanceof FormData ||
        opts.body instanceof URLSearchParams ||
        opts.body instanceof Blob ||
        typeof opts.body === "string"
      ) {
        body = opts.body as BodyInit;
      } else {
        if (!headers.has("Content-Type")) {
          headers.set("Content-Type", "application/json");
        }
        body = JSON.stringify(opts.body);
      }
    }

    return fetch(buildUrl(path), {
      ...opts,
      headers,
      body,
    });
  },

  async get(path, opts) {
    const res = await apiClient.fetch(path, { ...opts, method: "GET" });
    if (!res.ok && !opts?.raw) await throwForStatus(res);
    return res.json() as Promise<any>;
  },

  async post(path, body, opts) {
    const res = await apiClient.fetch(path, { ...opts, method: "POST", body: body as any });
    if (!res.ok && !opts?.raw) await throwForStatus(res);
    return res.json() as Promise<any>;
  },

  async put(path, body, opts) {
    const res = await apiClient.fetch(path, { ...opts, method: "PUT", body: body as any });
    if (!res.ok && !opts?.raw) await throwForStatus(res);
    return res.json() as Promise<any>;
  },

  async delete(path, opts) {
    const res = await apiClient.fetch(path, { ...opts, method: "DELETE" });
    if (!res.ok && !opts?.raw) await throwForStatus(res);
    return res.json() as Promise<any>;
  },
};
