import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import {
  backendUrl,
  readErrorMessage,
  type BackendTokenResponse,
  type PasskeyCredentialResponse,
} from "@/src/lib/auth/backend-auth";
import {
  deleteChallenge,
  getChallenge,
  saveLoginTicket,
} from "@/src/lib/auth/passkey-store";
import {
  getPasskeyOrigin,
  getPasskeyRpId,
} from "@/src/lib/auth/passkey-config";

type VerifyBody = {
  challengeId?: string;
  credential?: AuthenticationResponseJSON;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as VerifyBody | null;
  const challengeId = body?.challengeId?.trim();
  const credential = body?.credential;
  const credentialId = credential?.id?.trim();

  if (!challengeId || !credential || !credentialId) {
    return Response.json(
      {
        verified: false,
        message: "Missing passkey challenge or credential",
      },
      { status: 400 },
    );
  }

  const expectedChallenge = getChallenge(challengeId);
  if (!expectedChallenge) {
    return Response.json(
      {
        verified: false,
        message: "Passkey challenge expired. Please try again.",
      },
      { status: 400 },
    );
  }

  try {
    const storedCredentialResponse = await fetch(
      backendUrl(
        `/api/v1/auth/passkeys/credential/${encodeURIComponent(credentialId)}`,
      ),
      {
        cache: "no-store",
      },
    );

    if (!storedCredentialResponse.ok) {
      const message = await readErrorMessage(
        storedCredentialResponse,
        "Passkey not found",
      );
      return Response.json(
        {
          verified: false,
          message,
        },
        { status: storedCredentialResponse.status },
      );
    }

    const storedCredential =
      (await storedCredentialResponse.json()) as PasskeyCredentialResponse;

    const expectedOrigin = await getPasskeyOrigin();
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: getPasskeyRpId(expectedOrigin),
      credential: {
        id: storedCredential.credentialId,
        publicKey: Buffer.from(storedCredential.publicKey, "base64url"),
        counter: storedCredential.counter,
      },
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.authenticationInfo) {
      return Response.json(
        {
          verified: false,
          message: "Passkey verification failed",
        },
        { status: 401 },
      );
    }

    const loginResponse = await fetch(backendUrl("/api/v1/auth/passkeys/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        credentialId: verification.authenticationInfo.credentialID,
        counter: verification.authenticationInfo.newCounter,
      }),
    });

    if (!loginResponse.ok) {
      const message = await readErrorMessage(
        loginResponse,
        "Passkey login failed",
      );
      return Response.json(
        {
          verified: false,
          message,
        },
        { status: loginResponse.status },
      );
    }

    const tokens = (await loginResponse.json()) as BackendTokenResponse;
    const ticket = saveLoginTicket(tokens);

    return Response.json({
      verified: true,
      ticket,
    });
  } catch (error) {
    console.error("[passkey] verify-authentication failed", error);
    return Response.json(
      {
        verified: false,
        message:
          error instanceof Error ? error.message : "Passkey login failed",
      },
      { status: 500 },
    );
  } finally {
    deleteChallenge(challengeId);
  }
}
