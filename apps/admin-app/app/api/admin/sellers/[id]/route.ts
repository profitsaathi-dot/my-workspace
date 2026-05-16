/**
 * Admin sellers — single-seller GET + PATCH.
 *
 *   GET   /admin/api/admin/sellers/{id}   → /api/v1/admin/sellers/{id}
 *   PATCH /admin/api/admin/sellers/{id}   → /api/v1/admin/sellers/{id}
 */
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { apiRoutes } from "@/lib/api/routes";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function bearerOr401(req: NextRequest): Promise<string | NextResponse> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const accessToken = token?.accessToken as string | undefined;
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return accessToken;
}

function relay(upstream: Response, body: string): NextResponse {
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await bearerOr401(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const upstream = await fetch(
      `${env.NEXT_PUBLIC_API_URL}${apiRoutes.admin.sellerById(id)}`,
      {
        headers: { Authorization: `Bearer ${auth}` },
        cache: "no-store",
      },
    );
    return relay(upstream, await upstream.text());
  } catch (err) {
    console.error("[admin/sellers/:id GET] proxy failed:", err);
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
      `${env.NEXT_PUBLIC_API_URL}${apiRoutes.admin.sellerById(id)}`,
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
    console.error("[admin/sellers/:id PATCH] proxy failed:", err);
    return NextResponse.json({ error: "Upstream unreachable" }, { status: 502 });
  }
}
