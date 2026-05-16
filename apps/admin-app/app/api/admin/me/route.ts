/**
 * Admin profile proxy. Reads the NextAuth JWT, attaches it as Bearer to the
 * Spring backend's GET /admin/me, and forwards the response. Keeps the access
 * token on the server — the browser never sees it.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { apiRoutes } from "@/lib/api/routes";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const accessToken = token?.accessToken as string | undefined;
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const upstream = await fetch(
      `${env.NEXT_PUBLIC_API_URL}${apiRoutes.admin.me}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[admin/me] proxy failed:", err);
    return NextResponse.json({ error: "Upstream unreachable" }, { status: 502 });
  }
}
