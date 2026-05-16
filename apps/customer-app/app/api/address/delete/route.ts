import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// 1. Determine cookie name dynamically (Works for local dev & production)
const isProduction = process.env.NEXT_PUBLIC_ENV === "production";
const cookiePrefix = isProduction ? "__Secure-" : "";
const COOKIE_NAME = `${cookiePrefix}app2-next-auth.session-token`;

export async function DELETE(req: NextRequest) {
  // 2. Grab the ID early so we don't waste time checking tokens if it's missing
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Address ID required" }, { status: 400 });
  }

  try {
    // 3. Let getToken do the heavy lifting (no manual req.cookies.get needed)
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: COOKIE_NAME,
    });

    const accessToken = token?.accessToken as string | undefined;

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 4. Send DELETE request to Spring Boot backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/customer/addresses/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // 5. Pass along any errors from the Spring backend
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to delete address" }, 
        { status: response.status }
      );
    }

    // 6. Return successful empty response (NextResponse handles this cleanly)
    // Spring Boot usually returns a 204 (No Content) or 200 for a successful DELETE.
    return new NextResponse(null, { status: response.status });

  } catch (error) {
    // 7. Catch network drops or unexpected server crashes
    console.error("Address delete error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}