/**
 * Server-side logout.
 *
 * Calls Spring's `POST /api/v1/auth/logout` to invalidate the refresh token,
 * then clears NextAuth's session cookies and redirects to the marketing
 * page. The redirect-based flow lets us trigger logout from a plain
 * `<a href>` or `window.location.href = ...` without needing a client-side
 * `signOut()` round-trip.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { env } from "@/src/config/env";

const useSecure = env.isProd;
const cookiePrefix = useSecure ? "__Secure-" : "";

const SESSION_COOKIE = `${cookiePrefix}next-auth.session-token`;
const CALLBACK_COOKIE = `${cookiePrefix}next-auth.callback-url`;
const CSRF_COOKIE = useSecure ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token";

function backendUrl(path: string): string {
  const base = env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  const accessToken = token?.accessToken as string | undefined;

  // Best-effort backend logout — clears the refresh-token JTI on the
  // server. If this fails (network blip, expired token) we still want to
  // wipe the cookies on this side so the user is signed out locally.
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

  const res = NextResponse.redirect(new URL("/login?error=SessionExpired", req.url));
  const expire = { path: "/", expires: new Date(0) };
  res.cookies.set(SESSION_COOKIE, "", expire);
  res.cookies.set(`${SESSION_COOKIE}.0`, "", expire);
  res.cookies.set(`${SESSION_COOKIE}.1`, "", expire);
  res.cookies.set(CALLBACK_COOKIE, "", expire);
  res.cookies.set(CSRF_COOKIE, "", expire);
  return res;
}
