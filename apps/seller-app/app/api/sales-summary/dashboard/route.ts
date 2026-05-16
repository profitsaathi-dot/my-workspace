/**
 * Proxies Spring's `GET /api/v1/sales-summary/dashboard` — aggregate totals
 * for the seller. Identity is derived from the JWT inside Spring; we just
 * forward the bearer.
 */
import type { NextRequest } from "next/server";
import { salesSummaryService } from "@/src/services";
import { toApiResponse } from "@/src/lib/http/errors";

export async function GET(req: NextRequest) {
  try {
    const data = await salesSummaryService.dashboard(req);
    return Response.json(data);
  } catch (err) {
    return toApiResponse(err);
  }
}
