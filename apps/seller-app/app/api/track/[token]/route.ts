/**
 * Public order-tracking proxy. No auth — the order's publicToken is the
 * secret that gates this lookup. Forwards straight to Spring's
 * `/api/v1/order/track/{token}` and returns the sanitised payload.
 */
import type { NextRequest } from "next/server";
import { apiClient } from "@/src/lib/http/client";
import { apiRoutes } from "@/src/config/api-routes";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";
import type { PublicTracking } from "@/src/types/tracking";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await ctx.params;
    if (!token) throw new BadRequestError("Missing token");
    const data = await apiClient.get<PublicTracking>(
      apiRoutes.orders.publicTrack(token)
    );
    return Response.json(data);
  } catch (err) {
    return toApiResponse(err);
  }
}
