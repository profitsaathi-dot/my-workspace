import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getSystemHealth } from "@/lib/services/health.service";

// Always run on the Node runtime (Edge can't reach localhost during dev) and
// never let Next cache the response — it has to be live.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const accessToken = token?.accessToken as string | undefined;
  const health = await getSystemHealth(accessToken);
  return NextResponse.json(health, {
    headers: { "Cache-Control": "no-store" },
  });
}
