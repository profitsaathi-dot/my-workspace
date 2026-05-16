/**
 * Forwards to Spring's `GET /api/v1/products/user/all`. Returns ALL of the
 * seller's products (any status, including INACTIVE) so the seller-app's
 * "Inactive" tab can render real data — the cached `/user/simple` endpoint
 * filters those rows out.
 *
 * Identity is derived from the JWT inside Spring; we just attach the bearer.
 */
import type { NextRequest } from "next/server";
import { productService } from "@/src/services";
import { toApiResponse } from "@/src/lib/http/errors";

export async function GET(req: NextRequest) {
  try {
    const products = await productService.ownerAll(req);
    return Response.json(products);
  } catch (err) {
    return toApiResponse(err);
  }
}
