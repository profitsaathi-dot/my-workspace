import type { NextRequest } from "next/server";
import { aiChatService } from "@/src/services";
import { toApiResponse } from "@/src/lib/http/errors";
import type { AiChatSendRequest } from "@/src/types/aiChat";

// Image uploads (base64) can be a few hundred kB; Next's default 1 MB body
// cap is fine here since the backend rejects anything over 4 MB anyway.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AiChatSendRequest;
    const result = await aiChatService.send(req, body);
    if (result.ok) return Response.json(result.data);
    // Forward the upstream status (e.g. 429 over-quota, 400 missing key) so
    // the client can render the right message.
    return Response.json(result.body ?? { message: "Chat failed" }, {
      status: result.status,
    });
  } catch (err) {
    return toApiResponse(err);
  }
}
