import { headers } from "next/headers";

export async function getPasskeyOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const explicitOrigin = requestHeaders.get("origin");
  if (explicitOrigin) {
    return new URL(explicitOrigin).origin;
  }

  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!host) {
    throw new Error("Missing host header for passkey verification");
  }

  return `${protocol}://${host}`;
}

export function getPasskeyRpId(origin: string): string {
  return new URL(origin).hostname;
}
