/**
 * Next.js 16 proxy (formerly middleware).
 *
 * Auth gate:
 *   - Public: `/`, `/login`, `/signup`, `/onboarding`, `/api/auth/*`, `/api/passkey/*`
 *   - Authed users hitting `/`, `/login`, or `/signup` are bounced to `/dashboard`
 *   - Everyone else hitting a protected route gets `307 → /login?callbackUrl=…`
 *
 * Refresh failure:
 *   If the JWT carries `RefreshAccessTokenError`, force a sign-out so the user
 *   re-authenticates.
 */
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_EXACT = new Set<string>([
  "/",
  "/login",
  "/signup",
  "/onboarding",
  "/verify-email",
  "/forgot-password",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return (
    pathname.startsWith("/login/") ||
    pathname.startsWith("/signup/") ||
    pathname.startsWith("/onboarding/") ||
    pathname.startsWith("/verify-email/") ||
    pathname.startsWith("/api/passkey/") ||
    // Customer-facing dynamic-price link + the route handlers it calls.
    pathname.startsWith("/dp/") ||
    pathname === "/api/dynamic-prices/public" ||
    pathname === "/api/dynamic-prices/order" ||
    // Public order-tracking — form page (`/track`), deep-link
    // (`/track/<token>`), and both lookup endpoints (`/api/track/...`
    // for token, `/api/track-by-no/...` for order-number).
    pathname === "/track" ||
    pathname.startsWith("/track/") ||
    pathname.startsWith("/api/track/") ||
    pathname.startsWith("/api/track-by-no/") ||
    // Product images are served via this proxy too — anonymous customers
    // visiting /dp/* need to render the product photo.
    pathname.startsWith("/api/products/image")
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // NextAuth's own routes + Next internals always pass through.
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  let token = null;
  try {
    token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  } catch (err) {
    console.error("[proxy] token decode error:", err);
  }

  if (token?.error === "RefreshAccessTokenError") {
    console.log("[proxy] Refresh token expired, clearing session");
    // Use our custom logout route which properly clears all cookies
    return NextResponse.redirect(new URL("/api/auth/logout", req.url));
  }

  // Authed user landing on the marketing page, login, or signup → straight to the app.
  if (token && (pathname === "/" || pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protected page without a session → /login (preserve callbackUrl).
  if (!isPublic(pathname) && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
