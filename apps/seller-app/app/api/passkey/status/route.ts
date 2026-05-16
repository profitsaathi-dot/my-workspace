import type { NextRequest } from "next/server";
import { apiClient } from "@/src/lib/http/client";
import { toApiResponse } from "@/src/lib/http/errors";

export async function GET(req: NextRequest) {
  try {
    const status = await apiClient.get("/api/v1/auth/passkeys/me", {
      authFromRequest: req,
    });
    return Response.json(status);
  } catch (err) {
    return toApiResponse(err);
  }
}
