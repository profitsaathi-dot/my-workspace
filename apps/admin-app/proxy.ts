/**
 * Next.js 16 proxy (formerly middleware) — admin-app auth gate.
 *
 *   Public:    `/login`, `/api/auth/*`, Next internals
 *   Authed `/login` → `/` (overview)
 *   Anything else without a session → `/login?callbackUrl=…`
 *
 * If the JWT carries `RefreshAccessTokenError` we force a sign-out so the
 * operator re-authenticates instead of getting silent 401s downstream.
 *
 * basePath: `req.nextUrl.pathname` strips the basePath, so route comparisons
 * use the unprefixed form. Redirect URLs must include the basePath manually
 * because `new URL("/login", req.url)` resolves to the host root, not
 * `/admin/login`.
 *
 * Matcher: we use the simplest possible matcher (every request) and do all
 * filtering inside the function. With basePath, regex matchers using
 * negative lookahead can fail to match the bare `/admin` URL (no trailing
 * slash) and silently let unauthenticated users through.
 */
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BASE_PATH = "/admin";

function withBase(path: string): string {
  return path === "/" ? BASE_PATH || "/" : `${BASE_PATH}${path}`;
}

function isPublic(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

function isPassthrough(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    // Static assets in /public — extension-based passthrough is the simplest
    // way to avoid running auth checks on every img/font/css request.
    /\.(?:png|jpe?g|gif|svg|ico|webp|avif|css|js|map|woff2?|ttf|otf)$/i.test(
      pathname,
    )
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPassthrough(pathname)) {
    return NextResponse.next();
  }

  let token = null;
  try {
    token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  } catch (err) {
    console.error("[admin-proxy] token decode error:", err);
  }

  // TEMP debug — remove once auth gating is confirmed working.
  console.log(
    `[admin-proxy] pathname=${pathname} hasToken=${Boolean(token)} ` +
      `error=${token?.error ?? "—"}`,
  );

  if (token?.error === "RefreshAccessTokenError") {
    return NextResponse.redirect(
      new URL(withBase("/api/auth/signout"), req.url),
    );
  }

  // Authed user landing on /login → bounce to the overview.
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL(withBase("/"), req.url));
  }

  // Protected page without a session → /login (preserve callbackUrl with basePath).
  if (!isPublic(pathname) && !token) {
    const loginUrl = new URL(withBase("/login"), req.url);
    loginUrl.searchParams.set("callbackUrl", withBase(pathname));
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Run on every request; filtering happens inside `proxy()`. The matcher uses
// the simplest possible "match everything" pattern so basePath edge cases
// (e.g. bare `/admin` without trailing slash) can't bypass the gate.
export const config = {
  matcher: "/:path*",
};
