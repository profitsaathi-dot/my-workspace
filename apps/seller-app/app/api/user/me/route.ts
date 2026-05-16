/**
 * Forwards to Spring's `GET /api/v1/seller/me`. Spring derives identity from
 * the JWT and returns the full seller row (including `language` / `theme`).
 *
 * This is the endpoint `useSyncUser` polls to hydrate the client store.
 */
import type { NextRequest } from "next/server";
import { userService } from "@/src/services";
import { toApiResponse } from "@/src/lib/http/errors";

export async function GET(req: NextRequest) {
  try {
    const user = await userService.getMe(req);
    return Response.json(user);
  } catch (err) {
    return toApiResponse(err);
  }
}
