/**
 * Owner-side dynamic-price endpoints.
 *   GET  → seller's own listings (newest first)
 *   POST → create a new listing for an existing product the seller owns
 */
import type { NextRequest } from "next/server";
import { dynamicPriceService } from "@/src/services";
import { toApiResponse } from "@/src/lib/http/errors";
import type { DynamicPriceCreateRequest } from "@/src/types/dynamicPrice";

export async function GET(req: NextRequest) {
  try {
    const listings = await dynamicPriceService.mine(req);
    return Response.json(listings);
  } catch (err) {
    return toApiResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DynamicPriceCreateRequest;
    const created = await dynamicPriceService.create(req, body);
    return Response.json(created, { status: 201 });
  } catch (err) {
    return toApiResponse(err);
  }
}
