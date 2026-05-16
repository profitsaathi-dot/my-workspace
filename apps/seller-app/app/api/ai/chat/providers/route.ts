import type { NextRequest } from "next/server";
import { aiChatService } from "@/src/services";
import { toApiResponse } from "@/src/lib/http/errors";

export async function GET(req: NextRequest) {
  try {
    return Response.json(await aiChatService.providers(req));
  } catch (err) {
    return toApiResponse(err);
  }
}
