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
