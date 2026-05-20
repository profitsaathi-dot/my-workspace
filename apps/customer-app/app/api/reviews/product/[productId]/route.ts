import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8084/spring";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "0";
    const size = searchParams.get("size") || "10";

    const response = await fetch(
      `${BACKEND_URL}/api/v1/reviews/product/${productId}?page=${page}&size=${size}`
    );

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Reviews fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
