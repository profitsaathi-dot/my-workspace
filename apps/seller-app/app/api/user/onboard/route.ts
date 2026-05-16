/**
 * Mark the seller as onboarded.
 *
 * Forwards to Spring's `PATCH /api/v1/seller/onboard`. Spring is the single
 * writer for `sellers.onboarded_at`, `sellers.store_name`, and
 * `sellers.seller_type` — the seller-app no longer touches Postgres directly
 * for onboarding state.
 *
 * Identity is taken from the JWT on the Spring side, never from the body.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiClient } from "@/src/lib/http/client";
import { apiRoutes } from "@/src/config/api-routes";
import {
  BadRequestError,
  toApiResponse,
} from "@/src/lib/http/errors";

const Body = z.object({
  storeName: z.string().trim().min(2).max(255),
  sellerType: z.enum(["individual", "social"]),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "mobile must be a 10-digit Indian mobile number"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid body");
    }

    const upstream = await apiClient.fetch(apiRoutes.seller.onboard, {
      method: "PATCH",
      body: parsed.data,
      authFromRequest: req,
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return new Response(text || "Spring rejected the onboarding request", {
        status: upstream.status,
      });
    }

    const json = await upstream.json().catch(() => ({}));
    return Response.json(json);
  } catch (err) {
    return toApiResponse(err);
  }
}
