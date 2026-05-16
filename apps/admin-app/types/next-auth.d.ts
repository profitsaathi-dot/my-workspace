// Module augmentation for next-auth: expose accessToken, refreshToken, role
// and error on Session and JWT so the rest of the app can read them with
// full types. Tokens are issued by the Spring monolith via
// `/api/v1/auth/login` and refreshed via `/api/v1/auth/refresh`.
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    role?: string;
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    role?: string;
    subjectId?: number;
    error?: string;
  }
}
