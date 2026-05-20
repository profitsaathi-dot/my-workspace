import { NextRequest, NextResponse } from "next/server";

// Use the proxy URL from environment (http://localhost:8084/spring/)
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8084/spring";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    console.log("[Dynamic Price API] Fetching token:", token);
    console.log("[Dynamic Price API] Backend URL:", BACKEND_URL);

    // Backend expects query parameter, not path parameter
    const backendUrl = `${BACKEND_URL}/api/v1/dynamic-prices/public?token=${token}`;
    console.log("[Dynamic Price API] Full URL:", backendUrl);

    const response = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log("[Dynamic Price API] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Dynamic Price API] Error response:", errorText);
      return NextResponse.json(
        { error: "Dynamic price not found" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("[Dynamic Price API] Success, data:", JSON.stringify(data, null, 2));
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Dynamic Price API] Exception:", error);
    return NextResponse.json(
      { error: "Failed to fetch dynamic price", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
