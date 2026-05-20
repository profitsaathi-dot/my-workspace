import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// 1. Determine cookie name dynamically (Works for local dev & production)
const isProduction = process.env.NEXT_PUBLIC_ENV === "production";
const cookiePrefix = isProduction ? "__Secure-" : "";
const COOKIE_NAME = `${cookiePrefix}app2-next-auth.session-token`;

export async function GET(req: NextRequest) {
  try {
    // 2. Let getToken handle the extraction and validation securely
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: COOKIE_NAME,
      secureCookie: isProduction,
    });

    const accessToken = token?.accessToken as string | undefined;

    console.log("Extracted Access Token:", accessToken); // Debug log

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Fetch from Spring Boot backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/customer/numbers`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // 4. Handle backend errors gracefully and pass the status code
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch user numbers" }, 
        { status: response.status }
      );
    }

    // 5. Return successful data
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    // 6. Catch network timeouts or unexpected crashes
    console.error("User numbers fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}