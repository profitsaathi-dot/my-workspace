import type { NextRequest } from "next/server";
import { growthCardService } from "@/src/services";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";
import type { GrowthCardClientStatus } from "@/src/types/growthCard";

const ALLOWED: ReadonlyArray<GrowthCardClientStatus> = ["READ", "DONE", "DISMISSED"];

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      throw new BadRequestError("Invalid card id");
    }
    const body = (await req.json().catch(() => ({}))) as { status?: string };
    if (!body.status || !(ALLOWED as readonly string[]).includes(body.status)) {
      throw new BadRequestError("status must be one of READ | DONE | DISMISSED");
    }
    const card = await growthCardService.patch(
      req,
      numericId,
      body.status as GrowthCardClientStatus
    );
    return Response.json(card);
  } catch (err) {
    return toApiResponse(err);
  }
}
