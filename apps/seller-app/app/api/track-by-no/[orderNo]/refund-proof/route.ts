/**
 * Public refund-proof image stream for an order looked up by its
 * human-readable order number.
 *
 *   GET /api/track-by-no/{orderNo}/refund-proof
 *     ↓
 *   Spring GET /api/v1/order/track-by-no/{orderNo}/refund-proof
 */
import type { NextRequest } from "next/server";
import { apiClient } from "@/src/lib/http/client";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await ctx.params;
    if (!orderNo) throw new BadRequestError("Missing order ID");
    const upstream = await apiClient.fetch(
      `/api/v1/order/track-by-no/${encodeURIComponent(orderNo)}/refund-proof`,
      { method: "GET" }
    );
    if (!upstream.ok) {
      return new Response("Refund proof not available", { status: upstream.status });
    }
    const buffer = await upstream.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    return toApiResponse(err);
  }
}
