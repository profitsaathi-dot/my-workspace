/**
 * Public order placement against a dynamic-price token.
 *
 * Posts directly to Spring's /api/v1/order with purchaseType=DIRECT and the
 * token attached. Spring resolves the listing → product → unit price and
 * flips the listing to USED so the link can't be reused.
 *
 * No auth — the token is the secret.
 */
import type { NextRequest } from "next/server";
import { apiClient } from "@/src/lib/http/client";
import { apiRoutes } from "@/src/config/api-routes";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";

interface PublicOrderRequest {
  token: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  quantity: number;
  comments?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<PublicOrderRequest>;

    if (!body.token) throw new BadRequestError("Missing token");
    if (!body.customerName?.trim()) throw new BadRequestError("Customer name is required");
    if (!body.phoneNumber?.trim()) throw new BadRequestError("Phone number is required");
    if (!body.address?.trim()) throw new BadRequestError("Address is required");
    const qty = Number(body.quantity);
    if (!Number.isFinite(qty) || qty <= 0) throw new BadRequestError("Quantity must be > 0");

    const upstream = await apiClient.post<{ message: string; orderId: string }>(
      apiRoutes.orders.create,
      {
        customerName: body.customerName.trim(),
        phoneNumber: body.phoneNumber.trim(),
        address: body.address.trim(),
        quantity: qty,
        purchaseType: "DIRECT",
        dynamicPriceToken: body.token,
        comments: body.comments?.trim() ?? "",
      }
    );

    return Response.json(upstream, { status: 201 });
  } catch (err) {
    return toApiResponse(err);
  }
}
