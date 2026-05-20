"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster, TooltipProvider } from "@workspace/ui";
import { QueryProvider } from "@/lib/query-client";
import { BASE_PATH } from "@/lib/env";

/**
 * Token-refresh strategy mirrors seller-app: SessionProvider re-fetches the
 * session every 4 minutes (well inside the backend's 60-min access-token
 * life — see security.jwt.accessTtlMinutes on the monolith) which triggers
 * our `refreshAccessToken` callback. We pair it with `refetchOnWindowFocus`
 * so an idle tab gets a fresh token on focus, and skip refetch when offline.
 *
 * basePath: NextAuth's React client (`useSession`, `signIn`, `signOut`)
 * defaults to `/api/auth` and has no awareness of Next's basePath. We point
 * it at the prefixed route here so all client-side calls land on
 * /admin/api/auth/* instead of bare /api/auth/* (which would 404).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      basePath={`${BASE_PATH}/api/auth`}
      refetchInterval={4 * 60}
      refetchOnWindowFocus
      refetchWhenOffline={false}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        themes={["light", "dark"]}
        disableTransitionOnChange
      >
        <TooltipProvider delayDuration={150}>
          <QueryProvider>
            {children}
          </QueryProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
