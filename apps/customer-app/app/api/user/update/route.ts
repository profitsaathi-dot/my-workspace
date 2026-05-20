import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function PUT(req: NextRequest) {
  try {
    // 1. Determine cookie name dynamically (Works for local dev & production)
    const isProduction = process.env.NEXT_PUBLIC_ENV === "production";
    const cookiePrefix = isProduction ? "__Secure-" : "";
    const COOKIE_NAME = `${cookiePrefix}app2-next-auth.session-token`;

    const sessionCookie = req.cookies.get(COOKIE_NAME);

    if (!sessionCookie) {
      return new Response("Unauthorized", { status: 401 });
    }

    // ✅ decode NextAuth JWT properly with secureCookie flag
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: COOKIE_NAME,
      secureCookie: isProduction,
    });

    const accessToken = token?.accessToken; // ✅ correct extraction

    if (!accessToken) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/customer/update`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return new Response(err, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error("UPDATE ERROR:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}