// middleware.ts
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 1. Dynamically determine the cookie name just like in authOptions
const isProduction = process.env.NEXT_PUBLIC_ENV === "production";
const cookiePrefix = isProduction ? "__Secure-" : "";
const COOKIE_NAME = `${cookiePrefix}app2-next-auth.session-token`;

export async function proxy(req: NextRequest) { // NOTE: Usually this file is named middleware.ts and exports 'middleware'

  // 2. Explicitly pass the custom cookie name (Credentials provider stores it
  // under app2-next-auth.session-token).
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: COOKIE_NAME,
    secureCookie: isProduction,
  });

  const { pathname } = req.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/user", req.url));
  }

  // 1. Force logout if the refresh against the Spring backend failed —
  // /user/api/auth/logout clears cookies and redirects home.
  if (token?.error === "RefreshAccessTokenError") {
    return NextResponse.redirect(new URL("/user/api/auth/logout", req.url));
  }

  // 2. LOGGED-IN: Block Landing Page
  if (pathname === "/" && token) {
    return NextResponse.redirect(new URL("/user", req.url));
  }

  // 3. NOT LOGGED-IN: Block Protected Routes
  if (pathname.startsWith("/store/") && !token) {
    return NextResponse.redirect(new URL("/user/store", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!user/api/auth|_next/static|_next/image|favicon.ico).*)"],
};