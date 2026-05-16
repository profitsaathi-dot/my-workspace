import type { NextRequest } from "next/server";
import { offerService } from "@/src/services";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) throw new BadRequestError("Product ID required");
    const offers = await offerService.byProduct(id);
    return Response.json(offers);
  } catch (err) {
    return toApiResponse(err);
  }
}
