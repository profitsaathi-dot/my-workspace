/**
 * Public refund-proof image stream for a tracked order.
 *
 *   GET /api/track/{token}/refund-proof
 *     ↓
 *   Spring GET /api/v1/order/track/{token}/refund-proof
 *
 * No auth — the publicToken is the secret. Spring 404s when the order
 * has no refund proof (Razorpay refunds, or no refund at all).
 */
import type { NextRequest } from "next/server";
import { apiClient } from "@/src/lib/http/client";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await ctx.params;
    if (!token) throw new BadRequestError("Missing token");
    const upstream = await apiClient.fetch(
      `/api/v1/order/track/${encodeURIComponent(token)}/refund-proof`,
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
