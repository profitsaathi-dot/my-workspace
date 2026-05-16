import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// 1. Determine cookie name (Moved outside to avoid recalculating on every request)
const isProduction = process.env.NEXT_PUBLIC_ENV === "production";
const cookiePrefix = isProduction ? "__Secure-" : "";
const COOKIE_NAME = `${cookiePrefix}app2-next-auth.session-token`;

export async function GET(req: NextRequest) {
  try {
    // 2. Let getToken do all the heavy lifting
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: COOKIE_NAME,
    });

    const accessToken = token?.accessToken as string | undefined;

    // 3. If there is no token or access token, boot them out
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 4. Fetch from Spring Boot
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/customer/addresses`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // 5. Handle Spring Boot errors cleanly
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch user address" }, 
        { status: response.status } // Passing along the actual Spring Boot error code is usually better than a hardcoded 500
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    // 6. Catch network timeouts or JSON parsing errors
    console.error("Address fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}