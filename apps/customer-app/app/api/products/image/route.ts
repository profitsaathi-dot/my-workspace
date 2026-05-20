import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// 1. Determine cookie name dynamically (Works for local dev & production)
const isProduction = process.env.NEXT_PUBLIC_ENV === "production";
const cookiePrefix = isProduction ? "__Secure-" : "";
const COOKIE_NAME = `${cookiePrefix}app2-next-auth.session-token`;

export async function GET(req: NextRequest) {
  // ✅ Get JWT token with proper cookie configuration
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: COOKIE_NAME,
    secureCookie: isProduction,
  });

  // ✅ Get product ID and image index from query
  const id = req.nextUrl.searchParams.get("id");
  const index = req.nextUrl.searchParams.get("index") || "0";

  if (!id) {
    return new Response("Product ID required", { status: 400 });
  }

  try {
    // ✅ Fetch from backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/${id}/image?index=${index}`
    );

    if (!response.ok) {
      return new Response("Failed to fetch media", { status: response.status });
    }

    // 1️⃣ DETECT CONTENT TYPE
    // Instead of hardcoding "image/jpeg", we read what the backend sent.
    // This will correctly return "video/mp4", "image/png", etc.
    const contentType = response.headers.get("Content-Type") || "application/octet-stream";

    // 2️⃣ STREAM THE RESPONSE
    // Using response.body is much more efficient for videos. 
    // It pipes the data directly from the backend to the user.
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        // Pass through Content-Length if available for the progress bar
        ...(response.headers.get("Content-Length") && {
          "Content-Length": response.headers.get("Content-Length")!,
        }),
      },
    });
  } catch (error) {
    return new Response("Internal Server Error", { status: 500 });
  }
}