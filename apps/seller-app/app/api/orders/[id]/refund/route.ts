/**
 * Initiate a refund for an order:
 *   POST /api/orders/{id}/refund  → Spring POST /api/v1/payment/order/{id}/refund
 *
 * Spring decides whether to call Razorpay (ONLINE) or ask for a proof
 * upload (UPI_QR / BANK_ACCOUNT). The shape of the response tells the
 * client which UI step to take next.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { paymentService } from "@/src/services";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";

const Body = z
  .object({
    amount: z.number().positive().optional(),
    reason: z.string().max(512).optional(),
    // Accepted by RefundService — anything else is normalized to CANCELLED
    // server-side.
    finalOrderStatus: z.enum(["CANCELLED", "DELIVERY_FAILED"]).optional(),
  })
  .strict();

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const json = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid body");
    }
    const result = await paymentService.refund(req, id, parsed.data);
    return Response.json(result);
  } catch (err) {
    return toApiResponse(err);
  }
}
