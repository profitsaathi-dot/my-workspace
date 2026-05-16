/**
 * Admin sellers — list (GET) and create (POST).
 *
 *   GET  /admin/api/admin/sellers?status=ACTIVE   → /api/v1/admin/sellers
 *   POST /admin/api/admin/sellers                 → /api/v1/auth/signup/seller
 *
 * Both attach the admin's JWT server-side. Create reuses the existing
 * signup endpoint so the credentials row + seller row are provisioned in
 * the same backend transaction (and the welcome mail goes out).
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

export async function GET(req: NextRequest) {
  const auth = await bearerOr401(req);
  if (auth instanceof NextResponse) return auth;

  const status = req.nextUrl.searchParams.get("status");
  const url = new URL(`${env.NEXT_PUBLIC_API_URL}${apiRoutes.admin.sellers}`);
  if (status) url.searchParams.set("status", status);

  try {
    const upstream = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${auth}` },
      cache: "no-store",
    });
    return relay(upstream, await upstream.text());
  } catch (err) {
    console.error("[admin/sellers GET] proxy failed:", err);
    return NextResponse.json({ error: "Upstream unreachable" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await bearerOr401(req);
  if (auth instanceof NextResponse) return auth;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    // signup/seller is permitAll on the backend, but we still send the
    // admin's bearer so the audit trail (LastModifiedBy) gets stamped.
    const upstream = await fetch(
      `${env.NEXT_PUBLIC_API_URL}${apiRoutes.admin.signupSeller}`,
      {
        method: "POST",
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
    console.error("[admin/sellers POST] proxy failed:", err);
    return NextResponse.json({ error: "Upstream unreachable" }, { status: 502 });
  }
}
