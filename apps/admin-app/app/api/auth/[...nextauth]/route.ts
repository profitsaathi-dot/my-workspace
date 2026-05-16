import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { env } from "@/lib/env";

const handler = NextAuth({
  ...authOptions,
  debug: env.isDev,
});

export { handler as GET, handler as POST };
