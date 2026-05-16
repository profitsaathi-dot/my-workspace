import type { NextRequest } from "next/server";
import { aiChatService } from "@/src/services";
import { toApiResponse } from "@/src/lib/http/errors";
import type { AiGenerateImageRequest } from "@/src/types/aiChat";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AiGenerateImageRequest;
    const result = await aiChatService.generateImage(req, body);
    if (result.ok) return Response.json(result.data);
    return Response.json(result.body ?? { message: "Image generation failed" }, {
      status: result.status,
    });
  } catch (err) {
    return toApiResponse(err);
  }
}
