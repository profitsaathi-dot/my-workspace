/**
 * Public order-tracking proxy by order number. No auth — the customer
 * just needs the seller's order ID. Forwards to Spring's
 * `/api/v1/order/track-by-no/{orderNo}` and returns the sanitised payload.
 */
import type { NextRequest } from "next/server";
import { apiClient } from "@/src/lib/http/client";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";
import type { PublicTracking } from "@/src/types/tracking";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await ctx.params;
    if (!orderNo) throw new BadRequestError("Missing order ID");
    const data = await apiClient.get<PublicTracking>(
      `/api/v1/order/track-by-no/${encodeURIComponent(orderNo)}`
    );
    return Response.json(data);
  } catch (err) {
    return toApiResponse(err);
  }
}
