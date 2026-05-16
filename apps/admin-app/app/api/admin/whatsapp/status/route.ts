/**
 * Admin WhatsApp/WAHA overview proxy. Fetches the consolidated read-model
 * (server status + active sessions enriched with seller info) from the
 * monolith with the admin's JWT attached server-side.
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

  try {
    const upstream = await fetch(
      `${env.NEXT_PUBLIC_API_URL}${apiRoutes.admin.whatsappStatus}`,
      {
        headers: { Authorization: `Bearer ${auth}` },
        cache: "no-store",
      },
    );
    return relay(upstream, await upstream.text());
  } catch (err) {
    console.error("[admin/whatsapp/status] proxy failed:", err);
    return NextResponse.json({ error: "Upstream unreachable" }, { status: 502 });
  }
}
