import type { NextRequest } from "next/server";
import { aiChatService } from "@/src/services";
import { toApiResponse } from "@/src/lib/http/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const n = Number(id);
    if (!Number.isFinite(n)) {
      return Response.json({ message: "Invalid session id" }, { status: 400 });
    }
    return Response.json(await aiChatService.getSession(req, n));
  } catch (err) {
    return toApiResponse(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const n = Number(id);
    if (!Number.isFinite(n)) {
      return Response.json({ message: "Invalid session id" }, { status: 400 });
    }
    await aiChatService.deleteSession(req, n);
    return new Response(null, { status: 204 });
  } catch (err) {
    return toApiResponse(err);
  }
}
