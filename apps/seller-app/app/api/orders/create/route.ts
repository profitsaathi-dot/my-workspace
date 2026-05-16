import type { NextRequest } from "next/server";
import { orderService } from "@/src/services";
import { toApiResponse } from "@/src/lib/http/errors";
import type { OrderCreateRequest } from "@/src/types/order";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OrderCreateRequest;
    const order = await orderService.create(req, body);
    return Response.json(order, { status: 201 });
  } catch (err) {
    return toApiResponse(err);
  }
}
