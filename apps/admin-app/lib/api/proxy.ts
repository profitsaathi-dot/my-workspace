/**
 * Tiny helpers shared by every Next route handler that proxies the
 * admin app's UI requests to the Spring monolith. Keeps each handler down
 * to a few lines instead of copy-pasted bearer extraction + relay logic.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Returns the admin's JWT bearer string, or a 401 response if the request
 * isn't authenticated. Callers `if (auth instanceof NextResponse) return auth;`.
 */
export async function bearerOr401(req: NextRequest): Promise<string | NextResponse> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const accessToken = token?.accessToken as string | undefined;
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return accessToken;
}

/**
 * Mirror an upstream Spring response back to the browser, preserving status
 * code and content-type and disabling caches. Use as `relay(upstream, await upstream.text())`.
 */
export function relay(upstream: Response, body: string): NextResponse {
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
