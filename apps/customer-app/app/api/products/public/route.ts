import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return new Response("Missing token", { status: 400 });
    }

    // optional: if your backend allows public access, you can remove auth check
    const authToken = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    console.log("Public product token:", token);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/public?token=${token}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // only include if your backend requires auth
          ...(authToken?.accessToken && {
            Authorization: `Bearer ${authToken.accessToken}`,
          }),
        },
      }
    );

    if (!response.ok) {
      return new Response("Product not found", { status: 404 });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (err) {
    console.error("Public product API error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}