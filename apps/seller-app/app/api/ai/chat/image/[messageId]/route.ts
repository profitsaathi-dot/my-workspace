import type { NextRequest } from "next/server";
import { aiChatService } from "@/src/services";
import { toApiResponse } from "@/src/lib/http/errors";

/**
 * Streams the stored image bytes from Spring through to the browser.
 * We forward upstream's status, content-type, and cache-control verbatim so
 * the seller's `<img src="/api/ai/chat/image/123">` works as a normal image.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    const n = Number(messageId);
    if (!Number.isFinite(n)) {
      return Response.json({ message: "Invalid id" }, { status: 400 });
    }
    const upstream = await aiChatService.fetchImage(req, n);
    if (!upstream.ok) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
      });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return toApiResponse(err);
  }
}
