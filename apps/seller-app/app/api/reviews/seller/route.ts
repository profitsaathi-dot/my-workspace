import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9097";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.accessToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "0";
    const size = searchParams.get("size") || "10";

    const response = await fetch(
      `${BACKEND_URL}/api/v1/reviews/seller?page=${page}&size=${size}`,
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
        },
      }
    );

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Seller reviews fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
