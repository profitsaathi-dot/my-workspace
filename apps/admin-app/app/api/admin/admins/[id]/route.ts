/**
 * Admin admins — single GET + PATCH for managing other admin accounts.
 *
 *   GET   /admin/api/admin/admins/{id}  → /api/v1/admin/admins/{id}
 *   PATCH /admin/api/admin/admins/{id}  → /api/v1/admin/admins/{id}
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
      `${env.NEXT_PUBLIC_API_URL}${apiRoutes.admin.adminById(id)}`,
      {
        headers: { Authorization: `Bearer ${auth}` },
        cache: "no-store",
      },
    );
    return relay(upstream, await upstream.text());
  } catch (err) {
    console.error("[admin/admins/:id GET] proxy failed:", err);
    return NextResponse.json({ error: "Upstream unreachable" }, { status: 502 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await bearerOr401(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${env.NEXT_PUBLIC_API_URL}${apiRoutes.admin.adminById(id)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      },
    );
    return relay(upstream, await upstream.text());
  } catch (err) {
    console.error("[admin/admins/:id PATCH] proxy failed:", err);
    return NextResponse.json({ error: "Upstream unreachable" }, { status: 502 });
  }
}
