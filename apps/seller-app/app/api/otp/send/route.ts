/**
 * Send an email OTP via Spring → Kafka → notification_service.
 *
 * Body: { emails: string[], cc?: string[], name: string }
 * Forwarded to Spring as AES-encrypted `{ request }` (same envelope the
 * products endpoint uses).
 */
import type { NextRequest } from "next/server";
import { otpService } from "@/src/services";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";
import { encryptAES } from "@/src/lib/crypto/aes";

interface Body {
  emails?: string[];
  cc?: string[];
  name?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (!body.emails?.length) throw new BadRequestError("emails[] required");
    if (!body.name?.trim()) throw new BadRequestError("name required");

    const encrypted = await encryptAES(
      JSON.stringify({
        emails: body.emails,
        cc: body.cc ?? [],
        name: body.name.trim(),
      })
    );

    const result = await otpService.sendEmail(req, encrypted);
    return Response.json(result);
  } catch (err) {
    return toApiResponse(err);
  }
}
