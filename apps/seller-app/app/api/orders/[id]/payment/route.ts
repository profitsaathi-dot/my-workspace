/**
 * Buyer-uploaded payment proof for an order:
 *   GET /api/orders/{id}/payment → Spring GET /api/v1/payment/order-id/{id}
 *
 * Spring scopes the lookup to the JWT's seller — we just forward.
 */
import type { NextRequest } from "next/server";
import { paymentService } from "@/src/services";
import { toApiResponse } from "@/src/lib/http/errors";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const payment = await paymentService.byOrderId(req, id);
    return Response.json(payment);
  } catch (err) {
    return toApiResponse(err);
  }
}
