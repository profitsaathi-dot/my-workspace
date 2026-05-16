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
 *   - When the access token is within 60s of expiry, the `jwt` callback calls
 *     `POST /api/v1/auth/refresh` to rotate it. If the refresh fails the JWT
 *     is flagged with `error: "RefreshAccessTokenError"` and the proxy
 *     middleware bounces the user to sign-out.
 *
 * Cookie strategy:
 *   - In dev (HTTP, behind nginx) we MUST use unsecured cookie names; the
 *     browser drops `__Secure-` cookies on plain HTTP.
 *   - We pin every NextAuth cookie (sessionToken, callbackUrl, csrfToken)
 *     with sameSite=lax + path=/.
 */
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";
import { env } from "@/src/config/env";
import {
  backendUrl,
  type BackendTokenResponse,
} from "@/src/lib/auth/backend-auth";
import { consumeLoginTicket } from "@/src/lib/auth/passkey-store";

const useSecure = env.isProd;
const cookiePrefix = useSecure ? "__Secure-" : "";

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!token.refreshToken) throw new Error("Missing refresh token");

    const res = await fetch(backendUrl("/api/v1/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });
    if (!res.ok) throw await res.text();

    const refreshed = (await res.json()) as BackendTokenResponse;
    console.log("[auth] refresh OK", {
      email: refreshed.email,
      role: refreshed.role,
      subjectId: refreshed.subjectId,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresInSeconds: refreshed.expiresInSeconds,
    });
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

const baseCookie = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/",
  secure: useSecure,
};

export const authOptions: NextAuthOptions = {
  // Tell NextAuth not to upgrade cookie names when the runtime detects HTTPS
  // headers it didn't expect (e.g. nginx X-Forwarded-Proto). In dev we want
  // plain cookies; setting this explicitly avoids inconsistent behavior.
  useSecureCookies: useSecure,

  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
  },

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
          // Surface a readable message to the login page via NextAuth's
          // `error` query param. Keep it short — Spring returns a JSON
          // body on 400/401 but we don't want to leak stack traces.
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
        console.log("[auth] login OK", {
          email: tokens.email,
          role: tokens.role,
          subjectId: tokens.subjectId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresInSeconds: tokens.expiresInSeconds,
        });
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
    CredentialsProvider({
      id: "passkey",
      name: "Passkey",
      credentials: {
        ticket: { label: "Ticket", type: "text" },
      },
      async authorize(credentials) {
        const tokens = consumeLoginTicket(credentials?.ticket);
        if (!tokens) return null;

        return {
          id: String(tokens.subjectId),
          email: tokens.email,
          name: null,
          role: tokens.role,
          subjectId: tokens.subjectId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt:
            Math.floor(Date.now() / 1000) + tokens.expiresInSeconds,
        };
      },
    }),

     // NEW GOOGLE LOGIN
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
      // CSRF cookie name is __Host- in prod
      name: useSecure ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      options: { ...baseCookie },
    },
  },

  callbacks: {
    async jwt({ token, user, account }) {

       /**
   * GOOGLE LOGIN
   */
  if (
    account?.provider === "google" &&
    user?.email
  ) {

    try {
        console.log("email from google", user.email);
      const response = await fetch(
        
        `${env.NEXT_PUBLIC_API_URL}/api/v1/auth/oauth/google`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: user.email,
            name: user.name,
          }),

          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("Google backend auth failed");
      }

      const r =
        (await response.json()) as BackendTokenResponse;

      if (r.role !== "SELLER") {
        throw new Error("Not a seller account");
      }

      return {
        ...token,
        accessToken: r.accessToken,
        refreshToken: r.refreshToken,
        expiresAt:
          Math.floor(Date.now() / 1000) +
          r.expiresInSeconds,
        role: r.role,
        email: r.email,
        subjectId: r.subjectId ?? undefined,
      };

    } catch (e) {

      console.error(
        "[seller-auth] Google login failed",
        e
      );

      return {
        ...token,
        error: "GoogleLoginError",
      };
    }
  }

  /**
   * CREDENTIALS LOGIN
   */

      // First sign-in: persist backend tokens onto the JWT.
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

      // Token still valid (60s buffer before expiry).
      const expiresAt = (token.expiresAt as number | undefined) ?? 0;
      if (Date.now() < expiresAt * 1000 - 60_000) return token;

      // Expired — rotate it.
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.error = token.error as string | undefined;
      session.user = {
        ...session.user,
        id: token.subjectId != null ? String(token.subjectId) : undefined,
        email: token.email ?? session.user?.email,
        name: (token.name as string | null | undefined) ?? session.user?.name,
        role: token.role as string | undefined,
        subjectId: token.subjectId as number | undefined,
      };
      return session;
    },
  },
};
