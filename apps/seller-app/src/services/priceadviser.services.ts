import type { NextRequest } from "next/server";

import { apiClient } from "@/src/lib/http/client";
import { apiRoutes } from "@/src/config/api-routes";

import type {
  PriceAdviserRequest,
  PriceAdviserResponse,
} from "../types/priceadviser";

export const priceadviserServices = {

  async sync(
    req: NextRequest
  ): Promise<
    | { ok: true; data: PriceAdviserResponse }
    | { ok: false; status: number; body: unknown }
  > {

    // IMPORTANT FIX
    const rawBody = await req.text();

    // Parse if needed
    const parsedBody =
      JSON.parse(rawBody) as PriceAdviserRequest;

    console.log("FORWARDING BODY:", parsedBody);

    const res = await apiClient.fetch(
      apiRoutes.ai.priceAdviserSync,
      {
        method: "POST",

        authFromRequest: req,

        headers: {
          "Content-Type": "application/json",
        },

        // IMPORTANT FIX
        body: rawBody,
      }
    );

    if (res.ok) {

      return {
        ok: true,
        data:
          (await res.json()) as PriceAdviserResponse,
      };
    }

    let body: unknown;

    try {
      body = await res.json();
    } catch {
      body = undefined;
    }

    return {
      ok: false,
      status: res.status,
      body,
    };
  },
};