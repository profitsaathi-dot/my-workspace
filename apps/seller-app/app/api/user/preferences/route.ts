/**
 * Persist the seller's UI preferences (language, theme) via Spring.
 *
 * Forwards to Spring's `PATCH /api/v1/user/preferences`. Identity is taken
 * from the JWT on the Spring side, never from the body.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { userService } from "@/src/services";
import {
  BadRequestError,
  toApiResponse,
} from "@/src/lib/http/errors";
import { SUPPORTED_ACCENTS, SUPPORTED_LANGUAGES } from "@/src/types/user";

const Body = z
  .object({
    language: z.enum(SUPPORTED_LANGUAGES).optional(),
    theme: z.enum(["light", "dark", "system"]).optional(),
    accent: z.enum(SUPPORTED_ACCENTS).optional(),
    weeklyReportOptIn: z.boolean().optional(),
    monthlyReportOptIn: z.boolean().optional(),
  })
  .refine(
    (b) =>
      b.language !== undefined ||
      b.theme !== undefined ||
      b.accent !== undefined ||
      b.weeklyReportOptIn !== undefined ||
      b.monthlyReportOptIn !== undefined,
    { message: "Provide at least one preference field to update" }
  );

export async function PATCH(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid body");
    }

    const updated = await userService.updatePreferences(req, parsed.data);
    return Response.json(updated);
  } catch (err) {
    return toApiResponse(err);
  }
}
