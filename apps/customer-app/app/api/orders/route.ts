import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Match the customer-app's custom NextAuth cookie name.
const isProduction = process.env.NEXT_PUBLIC_ENV === "production";
const cookiePrefix = isProduction ? "__Secure-" : "";
const COOKIE_NAME = `${cookiePrefix}app2-next-auth.session-token`;

// ✅ POST (existing)
export async function POST(req: NextRequest) {
  try {
    // Read the NextAuth JWT *correctly* — without cookieName the custom
    // `app2-next-auth.session-token` cookie can't be decoded and the bearer
    // header was previously sending the token object literal instead of the
    // accessToken string.
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: COOKIE_NAME,
      secureCookie: isProduction,
    });
    const accessToken = token?.accessToken as string | undefined;

    const body = await req.json();

    // Logged-in buyers hit `/owner` (identity from JWT). Anonymous buyers
    // hit `/order` and the backend resolves the seller from
    // purchaseType=DIRECT + product.getSeller().
    const baseUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/order`;
    const url = accessToken ? `${baseUrl}/owner` : baseUrl;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { message: data.message || "Backend error" },
        { status: response.status }
      );
    }

    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error("Order API Error:", error);
    return Response.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}


// ✅ GET (new)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // required param
    const number = searchParams.get("number");

    if (!number) {
      return Response.json(
        { message: "number is required" },
        { status: 400 }
      );
    }

    // optional params with defaults
    const page = searchParams.get("page") || "0";
    const size = searchParams.get("size") || "10";
    const status = searchParams.get("status");
    const productId = searchParams.get("productId");
    const search = searchParams.get("search");

    // build query string cleanly
    const query = new URLSearchParams({
      page,
      size,
      number,
      ...(status && { status }),
      ...(productId && { productId }),
      ...(search && { search }),
    });

    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/order/public?${query.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { message: data.message || "Backend error" },
        { status: response.status }
      );
    }

    return Response.json(data, { status: 200 });

  } catch (error) {
    console.error("GET Order API Error:", error);

    return Response.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}