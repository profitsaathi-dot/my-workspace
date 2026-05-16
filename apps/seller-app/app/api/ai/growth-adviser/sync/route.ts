import type { NextRequest } from "next/server";
import { growthCardService } from "@/src/services";
import { toApiResponse } from "@/src/lib/http/errors";

export async function POST(req: NextRequest) {
  try {
    const result = await growthCardService.sync(req);
    if (result.ok) return Response.json(result.data);
    // Forward the upstream status (e.g. 429 cooldown active) verbatim so
    // the client can render the retry-after countdown.
    return Response.json(result.body ?? { message: "Sync failed" }, {
      status: result.status,
    });
  } catch (err) {
    return toApiResponse(err);
  }
}
