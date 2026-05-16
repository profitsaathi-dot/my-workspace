import type { NextRequest } from "next/server";
import { orderService } from "@/src/services";
import { toApiResponse } from "@/src/lib/http/errors";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const result = await orderService.list(req, {
      page: numberParam(url.searchParams.get("page"), 0),
      size: numberParam(url.searchParams.get("size"), 10),
      status: url.searchParams.get("status") ?? undefined,
      productId: url.searchParams.get("productId") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
    });
    return Response.json(result);
  } catch (err) {
    return toApiResponse(err);
  }
}

function numberParam(raw: string | null, fallback: number): number {
  if (raw === null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}
