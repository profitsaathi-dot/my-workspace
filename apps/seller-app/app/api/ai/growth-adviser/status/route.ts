import type { NextRequest } from "next/server";
import { growthCardService } from "@/src/services";
import { toApiResponse } from "@/src/lib/http/errors";

export async function GET(req: NextRequest) {
  try {
    const data = await growthCardService.status(req);
    return Response.json(data);
  } catch (err) {
    return toApiResponse(err);
  }
}
