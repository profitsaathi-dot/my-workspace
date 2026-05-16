import { env } from "@/src/config/env";

export interface BackendTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  role: string;
  subjectId: number;
  email: string;
}

export interface PasskeyCredentialResponse {
  credentialId: string;
  publicKey: string;
  counter: number;
}

export interface PasskeyStatusResponse {
  enabled: boolean;
  credentialIds: string[];
}

export function backendUrl(path: string): string {
  const base = env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const text = await response.text();
    if (!text.trim()) return fallback;

    const body = JSON.parse(text);
    if (typeof body?.message === "string" && body.message.trim()) {
      return body.message;
    }
    return text;
  } catch {
    /* ignore */
  }

  return fallback;
}
