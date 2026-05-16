import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function PUT(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("app2-next-auth.session-token");

  if (!sessionCookie) {
    return new Response("Unauthorized", { status: 401 });
  }

  // ✅ decode NextAuth JWT properly
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "app2-next-auth.session-token",
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