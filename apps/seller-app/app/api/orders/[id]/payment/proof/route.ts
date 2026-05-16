/**
 * Streams the buyer-uploaded payment-proof image for an order.
 *
 *   GET /api/orders/{id}/payment/proof
 *     1. Looks up the latest payment for the order via Spring (which scopes
 *        the lookup to the signed-in seller).
 *     2. Fetches the file bytes from Spring's /uploads/payment/<file>
 *        static resource and pipes them back to the browser.
 *
 * We proxy the bytes (rather than handing the browser a raw upstream URL)
 * for two reasons:
 *   - the file lives behind the Spring host that the browser can't reach
 *     directly in dev,
 *   - we want auth checked once, server-side, before exposing the image.
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
    const url = payment.proofImageUrl;
    if (!url) {
      return new Response("No payment proof uploaded", { status: 404 });
    }

    // Spring stores the proof as `/uploads/payment/<file>`, served by
    // Spring's WebMvcConfig static resource handler. Our nginx in dev only
    // proxies `` to Spring (port 9097); `/uploads/*` falls through
    // to Next.js and 404s. Prefix it so the gateway reaches Spring.
    const upstreamPath = url;
    const upstream = await apiClient.fetch(upstreamPath, {
      method: "GET",
      authFromRequest: req,
    });
    if (!upstream.ok) {
      return new Response("Failed to fetch proof", { status: upstream.status });
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
