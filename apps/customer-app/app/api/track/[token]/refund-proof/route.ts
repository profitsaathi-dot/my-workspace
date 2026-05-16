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

    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/order/track/${encodeURIComponent(token)}/refund-proof`;
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
