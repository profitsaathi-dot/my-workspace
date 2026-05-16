/**
 * Streams the seller-uploaded refund-proof image for an order.
 *
 *   GET /api/orders/{id}/payment/refund-proof
 *
 * Mirrors `/api/orders/{id}/payment/proof` but pulls `refundProofUrl`
 * instead of `proofImageUrl`. Only relevant after a UPI / bank refund —
 * Razorpay refunds never produce one.
 */
import type { NextRequest } from "next/server";
import { paymentService } from "@/src/services";
import { apiClient } from "@/src/lib/http/client";
import { toApiResponse } from "@/src/lib/http/errors";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const payment = await paymentService.byOrderId(req, id);
    const url = payment.refundProofUrl;
    if (!url) {
      return new Response("No refund proof uploaded", { status: 404 });
    }

    const upstreamPath = url;
    const upstream = await apiClient.fetch(upstreamPath, {
      method: "GET",
      authFromRequest: req,
    });
    if (!upstream.ok) {
      return new Response("Failed to fetch refund proof", { status: upstream.status });
    }

    const buffer = await upstream.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    return toApiResponse(err);
  }
}
