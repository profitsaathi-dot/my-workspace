/**
 * IFSC lookup proxy. Forwards `GET /api/ifsc/<code>` to Razorpay's free
 * IFSC service (`https://ifsc.razorpay.com/<code>`) and returns the
 * relevant fields. Going via our own server-side route lets us:
 *   - sidestep any CORS quirks on the user's network/browser,
 *   - validate the format before hitting the upstream,
 *   - normalize 404s into a clean 404 with a friendly message.
 *
 * No body, no auth required from the upstream — Razorpay exposes this as
 * a public utility. We still keep it behind the seller-app's auth gate
 * because only signed-in sellers should be running these lookups from
 * inside Settings.
 */
import type { NextRequest } from "next/server";
import { BadRequestError, NotFoundError, toApiResponse } from "@/src/lib/http/errors";

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await ctx.params;
    const normalized = (code ?? "").trim().toUpperCase();
    if (!IFSC_REGEX.test(normalized)) {
      throw new BadRequestError("Invalid IFSC format");
    }

    const upstream = await fetch(
      `https://ifsc.razorpay.com/${encodeURIComponent(normalized)}`,
      { cache: "no-store" }
    );

    if (upstream.status === 404) {
      throw new NotFoundError("No bank found for that IFSC");
    }
    if (!upstream.ok) {
      // Razorpay returns 200/404 normally; any other status is unexpected.
      const text = await upstream.text().catch(() => "");
      return new Response(text || "Lookup failed", { status: upstream.status });
    }

    const data = (await upstream.json()) as Record<string, string>;

    // Pass through the fields the UI cares about. Keeps the response
    // small and decoupled from any future changes Razorpay makes.
    return Response.json({
      ifsc: data.IFSC ?? normalized,
      bank: data.BANK ?? null,
      branch: data.BRANCH ?? null,
      city: data.CITY ?? null,
      state: data.STATE ?? null,
      district: data.DISTRICT ?? null,
      address: data.ADDRESS ?? null,
      contact: data.CONTACT ?? null,
    });
  } catch (err) {
    return toApiResponse(err);
  }
}
