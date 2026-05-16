import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// 1. Dynamically determine the cookie name based on the environment
const isProduction = process.env.NEXT_PUBLIC_ENV === "production";
const cookiePrefix = isProduction ? "__Secure-" : "";
const COOKIE_NAME = `${cookiePrefix}app2-next-auth.session-token`;

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/cart`;

// Helper to get access token and handle auth errors
async function getAuthToken(req: NextRequest) {
  // BUG FIX: When using custom cookie names, getToken needs the `secureCookie` 
  // flag explicitly declared to match your environment. Without this, it falls 
  // back to default behavior and fails to read/decrypt your custom cookie.
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: COOKIE_NAME,
    secureCookie: isProduction, 
  });

  return token?.accessToken as string | undefined;
}

export async function GET(req: NextRequest) {
  const accessToken = await getAuthToken(req);

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = await fetch(API_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return new NextResponse("Failed to fetch cart", { status: response.status });
  return NextResponse.json(await response.json());
}

export async function PUT(req: NextRequest) {
 const accessToken = await getAuthToken(req);

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const response = await fetch(API_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) return new NextResponse("Failed to update cart", { status: response.status });
  return NextResponse.json(await response.json());
}