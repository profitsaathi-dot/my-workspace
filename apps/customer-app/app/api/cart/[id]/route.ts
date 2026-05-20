import { NextRequest, NextResponse } from "next/server";
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
    secureCookie: isProduction,
  });

  return token?.accessToken as string | undefined;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 1. params is a Promise in recent Next.js versions
) {
  try {
    // 1. Await the params object
    const { id } = await params;

    // 2. Get the access token from cookies
   const accessToken = await getAuthToken(req);
   
     if (!accessToken) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
     }


    // 4. External API call
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/cart/${id}`,
      {
        method: "DELETE",
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to delete item" }, 
        { status: response.status }
      );
    }

    return new NextResponse(null, { status: 204 });
    
  } catch (error) {
    // 5. Catch network errors or parsing issues
    console.error("Error deleting cart item:", error);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}