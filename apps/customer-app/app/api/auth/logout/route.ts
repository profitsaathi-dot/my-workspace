/**
 * Server-side logout.
 *
 * Calls Spring's `POST /api/v1/auth/logout` to invalidate the refresh token,
 * then clears NextAuth's session cookie and redirects back to the marketing
 * root. Triggered from anywhere via `window.location.href = "/user/api/auth/logout"`
 * (or just `signOut()` from the client — that's enough on its own, but this
 * route is here for the parity with the seller-app's flow and for the case
 * where we need to wipe the refresh token JTI server-side too).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const isProduction = process.env.NEXT_PUBLIC_ENV === "production";
const cookiePrefix = isProduction ? "__Secure-" : "";
const SESSION_COOKIE = `${cookiePrefix}app2-next-auth.session-token`;
const CALLBACK_COOKIE = `${cookiePrefix}next-auth.callback-url`;
const CSRF_COOKIE = isProduction ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token";

function backendUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  return `${base}/spring${path.startsWith("/") ? path : `/${path}`}`;
}

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: SESSION_COOKIE,
    secureCookie: isProduction,
  }).catch(() => null);
  const accessToken = token?.accessToken as string | undefined;

  if (accessToken) {
    try {
      await fetch(backendUrl("/api/v1/auth/logout"), {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      console.warn("[auth/logout] backend call failed:", err);
    }
  }

  const res = NextResponse.redirect(new URL("/", req.url));
  const expire = { path: "/", expires: new Date(0) };
  res.cookies.set(SESSION_COOKIE, "", expire);
  res.cookies.set(`${SESSION_COOKIE}.0`, "", expire);
  res.cookies.set(`${SESSION_COOKIE}.1`, "", expire);
  res.cookies.set(CALLBACK_COOKIE, "", expire);
  res.cookies.set(CSRF_COOKIE, "", expire);
  return res;
}
