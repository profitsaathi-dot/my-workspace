import NextAuth from "next-auth";
import { authOptions } from "@/src/lib/auth/options";
import { env } from "@/src/config/env";

const handler = NextAuth({
  ...authOptions,
  debug: env.isDev,
});

export { handler as GET, handler as POST };
