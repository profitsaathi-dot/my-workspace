import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8084/spring";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const body = await req.json();
    const { orderNo } = await params;

    console.log("[Review API] Submitting review for order:", orderNo);
    console.log("[Review API] Backend URL:", BACKEND_URL);
    console.log("[Review API] Request body:", body);

    const backendUrl = `${BACKEND_URL}/api/v1/reviews/order/${orderNo}`;
    console.log("[Review API] Full URL:", backendUrl);

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log("[Review API] Backend response status:", response.status);

    const data = await response.json();
    console.log("[Review API] Backend response data:", data);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[Review API] Exception:", error);
    return NextResponse.json(
      { message: "Failed to submit review", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    const endpoint =
      action === "can-review"
        ? `${BACKEND_URL}/api/v1/reviews/order/${orderNo}/can-review`
        : `${BACKEND_URL}/api/v1/reviews/order/${orderNo}`;

    const response = await fetch(endpoint);
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Review fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch review" },
      { status: 500 }
    );
  }
}
