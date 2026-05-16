import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers"; // <-- 1. Added this import
import {
  backendUrl,
  readErrorMessage,
  type PasskeyStatusResponse,
} from "@/src/lib/auth/backend-auth";
import {
  createChallenge,
} from "@/src/lib/auth/passkey-store";
import {
  getPasskeyOrigin,
  getPasskeyRpId,
} from "@/src/lib/auth/passkey-config";
import { getSession } from "@/src/lib/auth/session";

export async function POST() {
  const session = await getSession();
  if (!session?.accessToken || !session.user?.email || !session.user?.subjectId) {
    return NextResponse.json(
      { message: "Sign in before enabling passkeys" },
      { status: 401 },
    );
  }

  const statusResponse = await fetch(backendUrl("/api/v1/auth/passkeys/me"), {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: "no-store",
  });

  if (!statusResponse.ok) {
    return NextResponse.json(
      {
        message: await readErrorMessage(
          statusResponse,
          "Couldn't load your passkey status",
        ),
      },
      { status: statusResponse.status },
    );
  }

  const status = (await statusResponse.json()) as PasskeyStatusResponse;
  const origin = await getPasskeyOrigin();
  const options = await generateRegistrationOptions({
    rpName: "ProfitSaathi Seller",
    rpID: getPasskeyRpId(origin),
    // <-- 2. Converted the string to a Uint8Array
    userID: isoUint8Array.fromUTF8String(String(session.user.subjectId)), 
    userName: session.user.email,
    userDisplayName: session.user.name ?? session.user.email,
    attestationType: "none",
    excludeCredentials: status.credentialIds.map((id) => ({
      id,
      type: "public-key" as const,
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
      authenticatorAttachment: "platform",
    },
  });

  const challengeId = createChallenge(options.challenge);

  return NextResponse.json({
    ...options,
    challengeId,
  });
}