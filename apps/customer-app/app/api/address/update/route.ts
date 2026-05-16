import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// 1. Dynamically determine the cookie name based on the environment
const isProduction = process.env.NEXT_PUBLIC_ENV === "production";
const cookiePrefix = isProduction ? "__Secure-" : "";
const COOKIE_NAME = `${cookiePrefix}app2-next-auth.session-token`;


async function getAuthToken(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: COOKIE_NAME,
  });

  return token?.accessToken as string | undefined;
}


export async function PUT(req: NextRequest) {
  try {
    
    const id = req.nextUrl.searchParams.get("id");

   // 2. Get the access token from cookies
     const accessToken = await getAuthToken(req);
     
       if (!accessToken) {
         return Response.json({ error: "Unauthorized" }, { status: 401 });
       }

    const body = await req.json();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/customer/addresses/${id}`,
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