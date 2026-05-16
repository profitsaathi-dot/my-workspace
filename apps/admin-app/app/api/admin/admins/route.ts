/**
 * Admin admins — list (GET).
 *
 *   GET /admin/api/admin/admins?status=ACTIVE
 *      → /api/v1/admin/admins
 */
import { NextResponse, type NextRequest } from "next/server";
import { apiRoutes } from "@/lib/api/routes";
import { bearerOr401, relay } from "@/lib/api/proxy";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await bearerOr401(req);
  if (auth instanceof NextResponse) return auth;

  const status = req.nextUrl.searchParams.get("status");
  const url = new URL(`${env.NEXT_PUBLIC_API_URL}${apiRoutes.admin.admins}`);
  if (status) url.searchParams.set("status", status);

  try {
    const upstream = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${auth}` },
      cache: "no-store",
    });
    return relay(upstream, await upstream.text());
  } catch (err) {
    console.error("[admin/admins GET] proxy failed:", err);
    return NextResponse.json({ error: "Upstream unreachable" }, { status: 502 });
  }
}
