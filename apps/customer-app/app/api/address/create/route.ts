import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// 1. Determine cookie name dynamically (Works for local dev & production)
const isProduction = process.env.NEXT_PUBLIC_ENV === "production";
const cookiePrefix = isProduction ? "__Secure-" : "";
const COOKIE_NAME = `${cookiePrefix}app2-next-auth.session-token`;

export async function POST(req: NextRequest) {
  try {
    // 2. Let getToken do the heavy lifting (no manual req.cookies.get needed)
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: COOKIE_NAME,
      secureCookie: isProduction,
    });

    const accessToken = token?.accessToken as string | undefined;

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Parse the incoming request body
    const body = await req.json();
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/customer/addresses`;

    // 4. Send POST request to Spring Boot backend
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`, // Cleaned this up: we already know it exists!
      },
      body: JSON.stringify(body),
    });

    // 5. Handle Spring Boot errors cleanly
    if (!response.ok) {
      let errorMessage = "Failed to create address";
      
      // Safely attempt to parse the backend error message
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // Fallback to default message if Spring Boot doesn't return JSON
      }

      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    // 6. Return the successfully created data
    const data = await response.json();
    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    // 7. Catch network drops or unexpected server crashes
    console.error("Address POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}