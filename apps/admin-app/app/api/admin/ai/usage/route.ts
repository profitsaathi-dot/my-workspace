/**
 * Proxy for the AI module's aggregate usage stats — calls + cost over a
 * configurable window. Forwards the optional ?days= param.
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

  const url = new URL(`${env.NEXT_PUBLIC_API_URL}${apiRoutes.admin.aiUsage}`);
  const days = req.nextUrl.searchParams.get("days");
  if (days) url.searchParams.set("days", days);

  try {
    const upstream = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${auth}` },
      cache: "no-store",
    });
    return relay(upstream, await upstream.text());
  } catch (err) {
    console.error("[admin/ai/usage] proxy failed:", err);
    return NextResponse.json({ error: "Upstream unreachable" }, { status: 502 });
  }
}
