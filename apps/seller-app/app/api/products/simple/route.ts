import type { NextRequest } from "next/server";
import { productService } from "@/src/services";
import { toApiResponse } from "@/src/lib/http/errors";

export async function GET(req: NextRequest) {
  try {
    const products = await productService.ownerSimple(req);
    return Response.json(products);
  } catch (err) {
    return toApiResponse(err);
  }
}
