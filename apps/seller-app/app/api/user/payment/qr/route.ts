/**
 * Two-handler endpoint for the seller's UPI QR.
 *   POST /api/user/payment/qr → multipart upload (creates / replaces)
 *   GET  /api/user/payment/qr → streams the saved image bytes
 *
 * The GET path lets Settings render the existing QR via
 * <img src="/api/user/payment/qr"> so the seller doesn't have to re-upload
 * just to verify what's on file.
 */
import type { NextRequest } from "next/server";
import { apiClient } from "@/src/lib/http/client";
import { apiRoutes } from "@/src/config/api-routes";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";

export async function GET(req: NextRequest) {
  try {
    const upstream = await apiClient.fetch(apiRoutes.seller.paymentQr, {
      method: "GET",
      authFromRequest: req,
    });
    if (!upstream.ok) {
      // 404 = no QR saved yet — pass through so the page can fall back
      // to the upload prompt.
      return new Response(null, { status: upstream.status });
    }
    // Stream straight through; preserve content-type and disable caching
    // (the seller may replace the QR and we want the new bytes immediately).
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return toApiResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const incoming = await req.formData();
    const image = incoming.get("image");
    if (!(image instanceof File)) {
      throw new BadRequestError("Missing 'image' file");
    }

    const out = new FormData();
    out.append("image", image, image.name);

    const upstream = await apiClient.fetch(apiRoutes.seller.paymentQr, {
      method: "POST",
      body: out,
      authFromRequest: req,
    });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return new Response(text || "Upload rejected", { status: upstream.status });
    }
    const data = await upstream.json().catch(() => ({}));
    return Response.json(data);
  } catch (err) {
    return toApiResponse(err);
  }
}
