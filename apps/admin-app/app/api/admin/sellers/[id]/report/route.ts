/**
 * Consolidated seller report — proxies /api/v1/admin/sellers/{id}/report.
 * One request returns profile + order stats + product stats so the admin
 * detail page renders without a fan-out of fetches.
 */
import { NextResponse, type NextRequest } from "next/server";
import { apiRoutes } from "@/lib/api/routes";
import { bearerOr401, relay } from "@/lib/api/proxy";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await bearerOr401(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const upstream = await fetch(
      `${env.NEXT_PUBLIC_API_URL}${apiRoutes.admin.sellerReport(id)}`,
      {
        headers: { Authorization: `Bearer ${auth}` },
        cache: "no-store",
      },
    );
    return relay(upstream, await upstream.text());
  } catch (err) {
    console.error("[admin/sellers/:id/report GET] proxy failed:", err);
    return NextResponse.json({ error: "Upstream unreachable" }, { status: 502 });
  }
}
