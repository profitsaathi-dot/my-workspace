import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await ctx.params;
    if (!orderNo) {
      return Response.json({ message: "Missing order ID" }, { status: 400 });
    }

    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/order/track-by-no/${encodeURIComponent(orderNo)}/refund-proof`;
    const response = await fetch(url, { method: "GET", cache: "no-store" });

    if (!response.ok) {
      return new Response("Refund proof not available", { status: response.status });
    }
    const buffer = await response.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("Refund proof API Error:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
