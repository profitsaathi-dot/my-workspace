import type { NextRequest } from "next/server";

import { toApiResponse } from "@/src/lib/http/errors";

import { priceadviserServices }
  from "@/src/services/priceadviser.services";

export async function POST(req: NextRequest) {

  try {

    const result =
      await priceadviserServices.sync(req);

    if (result.ok) {
      return Response.json(result.data);
    }

    return Response.json(
      result.body ?? {
        message: "Sync failed",
      },
      {
        status: result.status,
      }
    );

  } catch (err) {

    return toApiResponse(err);
  }
}