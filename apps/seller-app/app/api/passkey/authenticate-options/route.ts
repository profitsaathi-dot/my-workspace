import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { createChallenge } from "@/src/lib/auth/passkey-store";
import {
  getPasskeyOrigin,
  getPasskeyRpId,
} from "@/src/lib/auth/passkey-config";

export async function POST() {
  const origin = await getPasskeyOrigin();
  const options = await generateAuthenticationOptions({
    rpID: getPasskeyRpId(origin),
    userVerification: "required",
  });

  const challengeId = createChallenge(options.challenge);

  return Response.json({
    ...options,
    challengeId,
  });
}
