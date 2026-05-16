/**
 * Verify the email OTP the user just entered.
 *
 * Body: { identifier: string, otp: string }
 *
 * Forwarded to Spring as AES-encrypted `{ request }`. Spring's `OtpService`
 * handles BOTH the OTP check and the `users.email_verified_at = NOW()`
 * stamp atomically inside one transaction — we don't need a follow-up
 * write from this route.
 */
import type { NextRequest } from "next/server";
import { otpService } from "@/src/services";
import { BadRequestError, toApiResponse } from "@/src/lib/http/errors";
import { encryptAES } from "@/src/lib/crypto/aes";

interface Body {
  identifier?: string;
  otp?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (!body.identifier?.trim()) throw new BadRequestError("identifier required");
    if (!body.otp?.trim()) throw new BadRequestError("otp required");

    const encrypted = await encryptAES(
      JSON.stringify({
        identifier: body.identifier.trim(),
        otp: body.otp.trim(),
      })
    );

    const result = await otpService.verifyEmail(req, encrypted);
    return Response.json(result);
  } catch (err) {
    return toApiResponse(err);
  }
}
