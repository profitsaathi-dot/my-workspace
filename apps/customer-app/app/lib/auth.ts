/**
 * NextAuth configuration — Spring-backend Credentials provider.
 *
 * Auth flow:
 *   - `signIn("credentials", { email, password })` calls Spring's
 *     `POST /api/v1/auth/login`. The backend returns
 *     `{ accessToken, refreshToken, expiresInSeconds, role, subjectId, email }`.
 *   - We pack those onto NextAuth's encrypted JWT cookie. Route handlers read
 *     the cookie via `getToken` and forward the access token as a Bearer
 *     header on calls to Spring.
 *   - When the access token is within 60s of expiry the `jwt` callback calls
 *     `POST /api/v1/auth/refresh` to rotate it. A failed refresh is signalled
 *     with `error: "RefreshAccessTokenError"`; the proxy bounces such users to
 *     sign-in.
 *
 * Cookie name preserved as `app2-next-auth.session-token` so existing sessions
 * keep working through the swap (and the `secureCookie` helpers in route
 * handlers continue to find the cookie).
 */
import { NextAuthOptions, DefaultSession } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    error?: string;
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      role?: string;
      subjectId?: number;
    };
  }
  interface User {
    id: string;
    email: string;
    name?: string | null;
    role?: string;
    subjectId?: number;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    role?: string;
    subjectId?: number;
    email?: string;
    error?: string;
  }
}

interface BackendTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  role: string;
  subjectId: number;
  email: string;
}

function backendUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  return `${base}/spring${path.startsWith("/") ? path : `/${path}`}`;
}

async function refreshAccessToken(token: any) {
  try {
    if (!token.refreshToken) throw new Error("Missing refresh token");
    const response = await fetch(backendUrl("/api/v1/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Refresh failed: ${response.status} - ${errorText}`);
    }
    const refreshed = (await response.json()) as BackendTokenResponse;
    return {
      ...token,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expiresInSeconds,
      role: refreshed.role,
      subjectId: refreshed.subjectId,
      email: refreshed.email,
      error: undefined,
    };
  } catch (error) {
    console.error("RefreshAccessToken error", error);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

const isProduction = process.env.NEXT_PUBLIC_ENV === "production";
const cookiePrefix = isProduction ? "__Secure-" : "";
const app2CookieName = `${cookiePrefix}app2-next-auth.session-token`;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email + password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const res = await fetch(backendUrl("/api/v1/auth/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        if (!res.ok) {
          let message = "Invalid email or password";
          try {
            const body = await res.json();
            if (typeof body?.message === "string" && body.message.length < 200) {
              message = body.message;
            }
          } catch {
            /* ignore */
          }
          throw new Error(message);
        }

        const tokens = (await res.json()) as BackendTokenResponse;
        return {
          id: String(tokens.subjectId),
          email: tokens.email,
          name: null,
          role: tokens.role,
          subjectId: tokens.subjectId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: Math.floor(Date.now() / 1000) + tokens.expiresInSeconds,
        };
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  session: { strategy: "jwt" },

  cookies: {
    sessionToken: {
      name: app2CookieName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },

  callbacks: {
    async jwt({ token, user }) {
      const now = Math.floor(Date.now() / 1000);

      // First sign-in
      if (user) {
        return {
          ...token,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          expiresAt: user.expiresAt,
          role: user.role,
          subjectId: user.subjectId,
          email: user.email,
          name: user.name ?? null,
        };
      }

      // Token still valid (60s buffer before expiry)
      if (typeof token.expiresAt === "number" && now < token.expiresAt - 60) {
        return token;
      }

      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.error = token.error as string | undefined;
      session.user = {
        ...session.user,
        id: token.subjectId != null ? String(token.subjectId) : undefined,
        email: (token.email as string | undefined) ?? session.user?.email,
        name: (token.name as string | null | undefined) ?? session.user?.name,
        role: token.role as string | undefined,
        subjectId: token.subjectId as number | undefined,
      };
      return session;
    },
  },
};
