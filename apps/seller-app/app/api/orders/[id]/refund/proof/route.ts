/**
 * Upload the seller's refund-proof screenshot for a UPI/bank refund:
 *   POST /api/orders/{id}/refund/proof (multipart)
 *     ↓
 *   Spring POST /api/v1/payment/order/{id}/refund/proof
 *
 * We re-stream the multipart body — Next's request.formData() reconstitutes
 * the payload, and we forward it to Spring with auth attached.
 */
import type { NextRequest } from "next/server";
import { paymentService } from "@/src/services";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const incoming = await req.formData();
    const file = incoming.get("file");
    if (!(file instanceof File)) {
      throw new BadRequestError("file is required");
    }

    // Rebuild the form so we control field names — also strips anything
    // unexpected the browser might tack on.
    const out = new FormData();
    out.set("file", file, file.name);
    const amount = incoming.get("amount");
    if (typeof amount === "string" && amount.length > 0) out.set("amount", amount);
    const reason = incoming.get("reason");
    if (typeof reason === "string" && reason.length > 0) out.set("reason", reason);
    const finalOrderStatus = incoming.get("finalOrderStatus");
    if (typeof finalOrderStatus === "string"
        && (finalOrderStatus === "CANCELLED" || finalOrderStatus === "DELIVERY_FAILED")) {
      out.set("finalOrderStatus", finalOrderStatus);
    }

    const result = await paymentService.uploadRefundProof(req, id, out);
    return Response.json(result);
  } catch (err) {
    return toApiResponse(err);
  }
}
