import type { NextRequest } from "next/server";
import { productService } from "@/src/services";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) throw new BadRequestError("Missing token");
    const products = await productService.publicByStore(token);
    return Response.json(products);
  } catch (err) {
    return toApiResponse(err);
  }
}
