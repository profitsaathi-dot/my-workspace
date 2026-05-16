/**
 * POST /api/auth/signup → Spring `POST /api/v1/auth/signup/seller`.
 *
 * Validates the body against the Spring DTO, forwards to Spring, and returns
 * a normalized `{ ok: true }` so the client can immediately follow up with
 * `signIn("credentials", ...)`. We never echo the access/refresh tokens to
 * the browser — let NextAuth handle session establishment.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { env } from "@/src/config/env";

const Body = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(100),
  name: z.string().trim().min(1).max(255),
  storeName: z.string().trim().max(255).optional(),
});

function backendUrl(path: string): string {
  const base = env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { ok: false, message: parsed.error.errors[0]?.message ?? "Invalid body" },
      { status: 400 }
    );
  }

  const upstream = await fetch(backendUrl("/api/v1/auth/signup/seller"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });

  if (!upstream.ok) {
    let message = "Signup failed";
    try {
      const body = await upstream.json();
      if (typeof body?.message === "string" && body.message.length < 300) {
        message = body.message;
      }
    } catch {
      try {
        const text = await upstream.text();
        if (text && text.length < 300) message = text;
      } catch {
        /* ignore */
      }
    }
    return Response.json(
      { ok: false, message },
      { status: upstream.status }
    );
  }

  return Response.json({ ok: true });
}
