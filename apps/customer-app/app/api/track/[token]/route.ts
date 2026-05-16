import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await ctx.params;
    if (!token) {
      return Response.json({ message: "Missing token" }, { status: 400 });
    }

    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/order/track/${encodeURIComponent(token)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return Response.json(
        { message: (data as { message?: string }).message || "Order not found" },
        { status: response.status }
      );
    }

    return Response.json(data, { status: 200 });
  } catch (error) {
    console.error("Track API Error:", error);
    return Response.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
