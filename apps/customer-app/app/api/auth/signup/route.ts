/**
 * POST /user/api/auth/signup → Spring `POST /api/v1/auth/signup/customer`.
 *
 * Validates the body, forwards to Spring, and returns a normalized
 * `{ ok: true }` so the client can immediately follow up with
 * `signIn("credentials", ...)`. Tokens stay server-side — let NextAuth
 * establish the session cookie.
 */
import type { NextRequest } from "next/server";

interface SignupBody {
  email?: unknown;
  password?: unknown;
  name?: unknown;
  language?: unknown;
}

function backendUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  return `${base}/spring${path.startsWith("/") ? path : `/${path}`}`;
}

function badRequest(message: string) {
  return Response.json({ ok: false, message }, { status: 400 });
}

export async function POST(req: NextRequest) {
  let raw: SignupBody = {};
  try {
    raw = (await req.json()) as SignupBody;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const password = typeof raw.password === "string" ? raw.password : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const language = typeof raw.language === "string" ? raw.language : undefined;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest("A valid email is required");
  }
  if (password.length < 8 || password.length > 100) {
    return badRequest("Password must be 8-100 characters");
  }
  if (!name) {
    return badRequest("Name is required");
  }

  const upstream = await fetch(backendUrl("/api/v1/auth/signup/customer"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name, ...(language ? { language } : {}) }),
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
    return Response.json({ ok: false, message }, { status: upstream.status });
  }

  return Response.json({ ok: true });
}
