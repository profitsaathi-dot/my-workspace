/**
 * Server-side sign-out for the admin app (Spring JWT backend).
 *
 * Reads the NextAuth JWT, calls the backend logout endpoint on the monolith
 * so the refresh-token id is cleared server-side, then expires NextAuth's
 * cookies and redirects back to /login. Best-effort — if the backend is
 * unreachable we still clear local cookies so the UI doesn't get stuck
 * signed-in.
 */
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { BASE_PATH, env } from "@/lib/env";
import { apiRoutes } from "@/lib/api/routes";

const useSecure = env.isProd;
const cookiePrefix = useSecure ? "__Secure-" : "";

const SESSION_COOKIE = `${cookiePrefix}next-auth.session-token`;
const CALLBACK_COOKIE = `${cookiePrefix}next-auth.callback-url`;
const CSRF_COOKIE = useSecure
  ? "__Host-next-auth.csrf-token"
  : "next-auth.csrf-token";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const accessToken = token?.accessToken as string | undefined;

  if (accessToken) {
    try {
      await fetch(`${env.NEXT_PUBLIC_API_URL}${apiRoutes.auth.logout}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
    } catch (err) {
      console.warn("[admin-auth] backend logout failed:", err);
    }
  }

  const redirectTo = new URL(`${BASE_PATH}/login`, req.url);
  const res = NextResponse.redirect(redirectTo);

  const expire = { path: "/", expires: new Date(0) };
  res.cookies.set(SESSION_COOKIE, "", expire);
  res.cookies.set(`${SESSION_COOKIE}.0`, "", expire);
  res.cookies.set(`${SESSION_COOKIE}.1`, "", expire);
  res.cookies.set(CALLBACK_COOKIE, "", expire);
  res.cookies.set(CSRF_COOKIE, "", expire);
  return res;
}
