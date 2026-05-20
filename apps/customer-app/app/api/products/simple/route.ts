import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// 1. Determine cookie name dynamically (Works for local dev & production)
const isProduction = process.env.NEXT_PUBLIC_ENV === "production";
const cookiePrefix = isProduction ? "__Secure-" : "";
const COOKIE_NAME = `${cookiePrefix}app2-next-auth.session-token`;

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: COOKIE_NAME,
    secureCookie: isProduction,
  });

  if (!token || !token.accessToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  console.log("API Route - accessToken:", token.accessToken);

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/user/simple`,
    {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    return new Response("Failed to fetch user", { status: 500 });
  }

  const data = await response.json();
  return Response.json(data);
}