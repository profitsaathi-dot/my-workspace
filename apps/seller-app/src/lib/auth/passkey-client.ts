"use client";

import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startRegistration,
} from "@simplewebauthn/browser";
import type { PasskeyStatusResponse } from "@/src/lib/auth/backend-auth";

export type PasskeySupport = {
  webauthnSupported: boolean;
  platformAuthenticatorAvailable: boolean;
  canRegister: boolean;
  message?: string;
};

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function getPasskeySupport(): Promise<PasskeySupport> {
  if (!browserSupportsWebAuthn()) {
    return {
      webauthnSupported: false,
      platformAuthenticatorAvailable: false,
      canRegister: false,
      message: "This browser does not support passkeys.",
    };
  }

  if (typeof window !== "undefined" && !window.isSecureContext) {
    return {
      webauthnSupported: true,
      platformAuthenticatorAvailable: false,
      canRegister: false,
      message:
        "Passkeys need a secure origin. On your Mac, open the seller app at http://localhost:8084 for local testing, or use HTTPS on any other hostname.",
    };
  }

  const platformAvailable = await platformAuthenticatorIsAvailable();
  if (!platformAvailable) {
    return {
      webauthnSupported: true,
      platformAuthenticatorAvailable: false,
      canRegister: false,
      message:
        "Touch ID or a device passkey is not available here. Use Safari or Chrome on macOS, and open http://localhost:8084 instead of an IP address when testing locally.",
    };
  }

  return {
    webauthnSupported: true,
    platformAuthenticatorAvailable: true,
    canRegister: true,
  };
}

export async function fetchPasskeyStatus(): Promise<PasskeyStatusResponse> {
  const res = await fetch("/api/passkey/status", {
    cache: "no-store",
  });

  const json = (await readJson(res)) as
    | PasskeyStatusResponse
    | { message?: string }
    | null;

  if (!res.ok) {
    throw new Error(
      (json && "message" in json && json.message) ||
        "Couldn't check passkey status",
    );
  }

  const data = json as PasskeyStatusResponse;

  return {
    enabled: Boolean(data.enabled),
    credentialIds: Array.isArray(data.credentialIds)
      ? data.credentialIds
      : [],
  };
}

export async function registerCurrentSessionPasskey(): Promise<void> {
  const optionsResponse = await fetch("/api/passkey/register-options", {
    method: "POST",
  });

  const optionsPayload = (await readJson(optionsResponse)) as
    | {
        challengeId?: string;
        message?: string;
        [key: string]: unknown;
      }
    | null;

  if (!optionsResponse.ok || !optionsPayload?.challengeId) {
    throw new Error(
      optionsPayload?.message || "Couldn't start passkey setup",
    );
  }

  const challengeId = optionsPayload.challengeId;

  const options = optionsPayload as unknown as Parameters<
  typeof startRegistration
>[0]["optionsJSON"];

  const credential = await startRegistration({
    optionsJSON: options,
  });

  const verifyResponse = await fetch("/api/passkey/verify-registration", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      challengeId,
      credential,
    }),
  });

  const verification = (await readJson(verifyResponse)) as {
  verified?: boolean;
  message?: string;
};

  if (!verifyResponse.ok || !verification?.verified) {
    throw new Error(
      (verification as any)?.message || "Couldn't finish passkey setup",
    );
  }
}