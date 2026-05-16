/**
 * NextAuth configuration — admin-app, Spring JWT backend.
 *
 * The admin app authenticates against the monolith's `/api/v1/auth/login`
 * endpoint (email + password). The backend issues an access + refresh token
 * pair; we park them on NextAuth's encrypted JWT and rotate them through
 * `/api/v1/auth/refresh` from the `jwt` callback. Only credentials whose
 * backend role is `ADMIN` are allowed past `authorize()` — sellers and
 * customers get a generic "Invalid credentials" error.
 */
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import { BASE_PATH, env } from "@/lib/env";
import { apiRoutes } from "@/lib/api/routes";

const useSecure = env.isProd;
const cookiePrefix = useSecure ? "__Secure-" : "";

/** NextAuth does not auto-prepend Next's basePath to `pages.*` URLs, so the
 *  sign-in / error pages must include `/admin` explicitly. Otherwise a
 *  failed authorize() redirects to `${origin}/login` which 404s. */
const SIGNIN_PATH = `${BASE_PATH}/login`;

interface BackendTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  role: "SELLER" | "CUSTOMER" | "ADMIN";
  subjectId: number | null;
  email: string;
}

async function backendLogin(
  email: string,
  password: string,
): Promise<BackendTokenResponse> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${apiRoutes.auth.login}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.message) detail = body.message;
    } catch {
      // ignore
    }
    throw new Error(detail || "Login failed");
  }
  return (await res.json()) as BackendTokenResponse;
}

async function backendRefresh(refreshToken: string): Promise<BackendTokenResponse> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`refresh ${res.status}`);
  return (await res.json()) as BackendTokenResponse;
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const refresh = token.refreshToken as string | undefined;
    if (!refresh) throw new Error("missing refresh token");
    const r = await backendRefresh(refresh);
    return {
      ...token,
      accessToken: r.accessToken,
      refreshToken: r.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + r.expiresInSeconds,
      role: r.role,
      email: r.email,
      subjectId: r.subjectId ?? undefined,
      error: undefined,
    };
  } catch (error) {
    console.error("[admin-auth] RefreshAccessToken error", error);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

const baseCookie = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/",
  secure: useSecure,
};

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: useSecure,
  session: { strategy: "jwt" },
  pages: {
    signIn: SIGNIN_PATH,
    error: SIGNIN_PATH,
    signOut: SIGNIN_PATH,
  },

  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email & password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        try {
          const r = await backendLogin(email, password);
          if (r.role !== "ADMIN") {
            // Hide the existence of non-admin accounts from the form.
            throw new Error("Invalid credentials");
          }
          // Returned object is fed straight into the `jwt` callback as `user`.
          return {
            id: String(r.subjectId ?? r.email),
            email: r.email,
            name: r.email,
            accessToken: r.accessToken,
            refreshToken: r.refreshToken,
            expiresAt: Math.floor(Date.now() / 1000) + r.expiresInSeconds,
            role: r.role,
            subjectId: r.subjectId ?? undefined,
          } as unknown as { id: string; email: string; name: string };
        } catch (err) {
          console.warn("[admin-auth] login failed:", (err as Error).message);
          return null;
        }
      },
    }),
  ],

  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: { ...baseCookie },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: { ...baseCookie, httpOnly: false },
    },
    csrfToken: {
      name: useSecure
        ? "__Host-next-auth.csrf-token"
        : "next-auth.csrf-token",
      options: { ...baseCookie },
    },
  },

  callbacks: {
    /**
     * NextAuth's default redirect callback uses the NEXTAUTH_URL origin and
     * has no awareness of Next's basePath. A bare callbackUrl of "/" would
     * resolve to `http://localhost:8084/` (outside /admin). Force every
     * relative target onto the /admin tree.
     */
    async redirect({ url, baseUrl }) {
      const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      if (url.startsWith("/")) {
        if (url === "/" || url === "") return `${base}${BASE_PATH}/`;
        if (url.startsWith(BASE_PATH)) return `${base}${url}`;
        return `${base}${BASE_PATH}${url}`;
      }
      try {
        const target = new URL(url);
        if (target.origin === base) return url;
      } catch {
        // not an absolute URL — fall through
      }
      return `${base}${BASE_PATH}/`;
    },
    async jwt({ token, user }) {
      // First sign-in — `user` is what authorize() returned.
      if (user) {
        const u = user as unknown as {
          accessToken: string;
          refreshToken: string;
          expiresAt: number;
          role: string;
          email: string;
          subjectId?: number;
        };
        return {
          ...token,
          accessToken: u.accessToken,
          refreshToken: u.refreshToken,
          expiresAt: u.expiresAt,
          role: u.role,
          email: u.email,
          subjectId: u.subjectId,
        };
      }

      // Still valid (60-second buffer).
      const expiresAt = (token.expiresAt as number | undefined) ?? 0;
      if (Date.now() < expiresAt * 1000 - 60_000) return token;

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.error = token.error as string | undefined;
      session.role = token.role as string | undefined;
      if (session.user) {
        session.user.email = (token.email as string | undefined) ?? session.user.email;
      }
      return session;
    },
  },
};
