/**
 * PATCH /api/user/payment → Spring PATCH /api/v1/seller/payment
 *
 * Validation duplicates the Spring DTO regex so we surface a friendly
 * error before the round-trip if the body is obviously wrong.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiClient } from "@/src/lib/http/client";
import { apiRoutes } from "@/src/config/api-routes";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";

const Body = z
  .object({
    paymentType: z.enum(["ONLINE", "UPI_QR", "BANK_ACCOUNT"]).optional(),
    paymentQRCode: z.string().max(1024).optional(),
    bankAccountNumber: z
      .string()
      .regex(/^\d{9,18}$/, "Bank account must be 9–18 digits")
      .optional(),
    bankAccountIfsc: z
      .string()
      .regex(
        /^[A-Z]{4}0[A-Z0-9]{6}$/,
        "IFSC must be 4 letters + 0 + 6 alphanumeric"
      )
      .optional(),
  })
  .refine((b) => Object.keys(b).length > 0, {
    message: "Provide at least one field to update",
  });

export async function PATCH(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid body");
    }
    const upstream = await apiClient.fetch(apiRoutes.seller.payment, {
      method: "PATCH",
      body: parsed.data,
      authFromRequest: req,
    });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return new Response(text || "Spring rejected the payment update", {
        status: upstream.status,
      });
    }
    const data = await upstream.json().catch(() => ({}));
    return Response.json(data);
  } catch (err) {
    return toApiResponse(err);
  }
}
