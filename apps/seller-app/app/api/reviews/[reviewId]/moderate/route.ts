import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9097";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const token = await getToken({ req });

    if (!token?.accessToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { reviewId } = await params;
    const { searchParams } = new URL(req.url);
    const approved = searchParams.get("approved") === "true";

    const response = await fetch(
      `${BACKEND_URL}/api/v1/reviews/${reviewId}/moderate?approved=${approved}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
        },
      }
    );

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Review moderation error:", error);
    return NextResponse.json(
      { message: "Failed to moderate review" },
      { status: 500 }
    );
  }
}
