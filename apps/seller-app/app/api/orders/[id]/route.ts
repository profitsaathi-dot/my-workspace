/**
 * Single-order proxy:
 *   GET    /api/orders/{id}  → Spring GET /api/v1/order/{id}
 *   PATCH  /api/orders/{id}  → Spring PATCH /api/v1/order/{id}
 *
 * Spring scopes both endpoints to the JWT's seller — we don't need to
 * re-check ownership here, just forward with the bearer.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { orderService } from "@/src/services";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";

const Body = z
  .object({
    customerName: z.string().trim().min(2).max(255).optional(),
    phoneNumber: z
      .string()
      .regex(/^[6-9]\d{9}$/, "phoneNumber must be a 10-digit Indian mobile number")
      .optional(),
    address: z.string().trim().min(5).max(1024).optional(),
    comments: z.string().max(1024).optional(),
    orderStatus: z
      .enum([
        "PENDING",
        "CONFIRMED",
        "SHIPPED",
        "DELIVERED",
        "DELIVERY_FAILED",
        "CANCELLED",
      ])
      .optional(),
    // REFUND intentionally not allowed — that status is set only by the
    // refund endpoint, never via the generic order PATCH. Including it
    // here would let a client bypass the refund flow.
    paymentStatus: z.enum(["INITIATED", "PAID", "FAILED"]).optional(),
    shippingVendor: z.string().max(64).optional(),
    trackingId: z.string().max(128).optional(),
  })
  .refine((b) => Object.keys(b).length > 0, {
    message: "Provide at least one field to update",
  });

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const order = await orderService.byId(req, id);
    return Response.json(order);
  } catch (err) {
    return toApiResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const json = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.errors[0]?.message ?? "Invalid body");
    }
    const updated = await orderService.update(req, id, parsed.data);
    return Response.json(updated);
  } catch (err) {
    return toApiResponse(err);
  }
}
