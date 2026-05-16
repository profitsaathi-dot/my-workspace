// Module augmentation for next-auth: expose accessToken/error and the seller's
// role/subjectId on Session and JWT. The Spring backend issues access +
// refresh tokens directly (no external IdP); we mirror them onto the encrypted
// session cookie so route handlers and client components can call protected
// Spring endpoints without re-authenticating.
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
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
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    role?: string;
    subjectId?: number;
    email?: string;
    name?: string | null;
    error?: string;
  }
}
