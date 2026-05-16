import type { NextRequest } from "next/server";
import { whatsAppService } from "@/src/services";
import { toApiResponse } from "@/src/lib/http/errors";

export async function POST(req: NextRequest) {
  try {
    const data = await whatsAppService.connect(req);
    return Response.json(data);
  } catch (err) {
    return toApiResponse(err);
  }
}
