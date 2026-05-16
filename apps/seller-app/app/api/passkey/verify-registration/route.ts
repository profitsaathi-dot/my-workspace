import { NextResponse } from "next/server";
import {
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import {
  backendUrl,
  readErrorMessage,
} from "@/src/lib/auth/backend-auth";
import {
  deleteChallenge,
  getChallenge,
} from "@/src/lib/auth/passkey-store";
import {
  getPasskeyOrigin,
  getPasskeyRpId,
} from "@/src/lib/auth/passkey-config";
import { getSession } from "@/src/lib/auth/session";

type VerifyRegistrationBody = {
  challengeId?: string;
  credential?: RegistrationResponseJSON;
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.accessToken) {
    return NextResponse.json(
      { verified: false, message: "Sign in before enabling passkeys" },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as VerifyRegistrationBody | null;
  const challengeId = body?.challengeId?.trim();
  const credential = body?.credential;

  if (!challengeId || !credential) {
    return NextResponse.json(
      { verified: false, message: "Missing passkey registration payload" },
      { status: 400 },
    );
  }

  const expectedChallenge = getChallenge(challengeId);

  if (!expectedChallenge) {
    return NextResponse.json(
      { verified: false, message: "Passkey setup expired. Please try again." },
      { status: 400 },
    );
  }

  try {
    const expectedOrigin = await getPasskeyOrigin();
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: getPasskeyRpId(expectedOrigin),
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { verified: false, message: "Passkey registration failed" },
        { status: 401 },
      );
    }

    
        const credentialId =
  verification.registrationInfo.credential?.id ??
  ("credentialID" in verification.registrationInfo
    ? Buffer.from(
        verification.registrationInfo.credentialID as Uint8Array
      ).toString("base64url")
    : undefined);
    const publicKey =
      verification.registrationInfo.credential?.publicKey ??
      ("credentialPublicKey" in verification.registrationInfo
        ? verification.registrationInfo.credentialPublicKey
        : undefined);
    const counter = verification.registrationInfo.credential?.counter ?? 0;
    const transports =
      verification.registrationInfo.credential?.transports ??
      credential.response.transports ??
      [];

    if (!credentialId || !publicKey) {
      return NextResponse.json(
        { verified: false, message: "Passkey registration data was incomplete" },
        { status: 500 },
      );
    }

    const persistResponse = await fetch(backendUrl("/api/v1/auth/passkeys/register"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
      body: JSON.stringify({
        credentialId,
        publicKey: Buffer.from(publicKey).toString("base64url"),
        counter,
        deviceType: verification.registrationInfo.credentialDeviceType,
        backedUp: verification.registrationInfo.credentialBackedUp,
        transports,
      }),
    });

    if (!persistResponse.ok) {
      return NextResponse.json(
        {
          verified: false,
          message: await readErrorMessage(
            persistResponse,
            "Couldn't save your passkey",
          ),
        },
        { status: persistResponse.status },
      );
    }

    return NextResponse.json({
      verified: true,
    });
  } catch (error) {
    console.error("[passkey] verify-registration failed", error);
    return NextResponse.json(
      {
        verified: false,
        message:
          error instanceof Error ? error.message : "Couldn't register passkey",
      },
      { status: 500 },
    );
  } finally {
    deleteChallenge(challengeId);
  }
}
