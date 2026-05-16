/**
 * Proxy for the AI module's admin log viewer. Forwards page/size/filter
 * params straight through to /api/v1/ai/admin/logs.
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

  const url = new URL(`${env.NEXT_PUBLIC_API_URL}${apiRoutes.admin.aiLogs}`);
  for (const k of ["page", "size", "principalEmail"]) {
    const v = req.nextUrl.searchParams.get(k);
    if (v) url.searchParams.set(k, v);
  }

  try {
    const upstream = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${auth}` },
      cache: "no-store",
    });
    return relay(upstream, await upstream.text());
  } catch (err) {
    console.error("[admin/ai/logs] proxy failed:", err);
    return NextResponse.json({ error: "Upstream unreachable" }, { status: 502 });
  }
}
