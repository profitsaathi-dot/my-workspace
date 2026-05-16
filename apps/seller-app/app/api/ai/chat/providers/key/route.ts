import type { NextRequest } from "next/server";
import { aiChatService } from "@/src/services";
import { toApiResponse } from "@/src/lib/http/errors";
import type { AiProvider } from "@/src/types/aiChat";

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as { provider?: AiProvider; apiKey?: string };
    if (!body.provider) {
      return Response.json({ message: "Missing provider" }, { status: 400 });
    }
    const status = await aiChatService.saveProviderKey(req, body.provider, body.apiKey ?? "");
    return Response.json(status);
  } catch (err) {
    return toApiResponse(err);
  }
}
