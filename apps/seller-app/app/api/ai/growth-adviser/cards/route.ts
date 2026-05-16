import type { NextRequest } from "next/server";
import { growthCardService } from "@/src/services";
import { toApiResponse } from "@/src/lib/http/errors";
import type { GrowthCardStatus } from "@/src/types/growthCard";

const ALLOWED: ReadonlyArray<GrowthCardStatus> = [
  "ACTIVE",
  "READ",
  "DONE",
  "DISMISSED",
  "STALE",
];

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("status") ?? "ACTIVE";
    const status: GrowthCardStatus = (ALLOWED as readonly string[]).includes(raw)
      ? (raw as GrowthCardStatus)
      : "ACTIVE";
    const data = await growthCardService.list(req, status);
    return Response.json(data);
  } catch (err) {
    return toApiResponse(err);
  }
}
