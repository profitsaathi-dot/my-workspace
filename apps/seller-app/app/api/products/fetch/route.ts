import type { NextRequest } from "next/server";
import { productService } from "@/src/services";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) throw new BadRequestError("Product ID required");
    const product = await productService.byId(req, id);
    return Response.json(product);
  } catch (err) {
    return toApiResponse(err);
  }
}
