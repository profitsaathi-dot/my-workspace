/**
 * Owner-only cancel for an active dynamic-price listing.
 * Spring enforces ownership + status (ACTIVE → CANCELLED only).
 */
import type { NextRequest } from "next/server";
import { dynamicPriceService } from "@/src/services";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    if (!id) throw new BadRequestError("Missing id");
    const updated = await dynamicPriceService.cancel(req, id);
    return Response.json(updated);
  } catch (err) {
    return toApiResponse(err);
  }
}
