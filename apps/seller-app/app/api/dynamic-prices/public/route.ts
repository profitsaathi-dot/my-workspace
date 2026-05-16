/**
 * Public lookup for a dynamic-price link. No auth — the token is the secret.
 * Used by the customer-facing page at /dp/[token].
 */
import type { NextRequest } from "next/server";
import { dynamicPriceService } from "@/src/services";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) throw new BadRequestError("Missing token");
    const listing = await dynamicPriceService.public(token);
    return Response.json(listing);
  } catch (err) {
    return toApiResponse(err);
  }
}
