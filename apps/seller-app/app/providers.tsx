"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster, TooltipProvider } from "@workspace/ui";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from "react";
/**
 * Token-refresh strategy:
 *   `getToken({req})` inside route handlers only DECODES the JWT cookie —
 *   it never re-runs NextAuth's `jwt` callback. If we don't poke the
 *   /api/auth/session endpoint on a schedule, the cookie keeps the
 *   access_token from sign-in until the user manually reloads, and Spring
 *   starts returning 401s once the access token's TTL (60 min default)
 *   ticks over.
 *
 *   `refetchInterval` (in seconds) tells SessionProvider to re-fetch the
 *   session every 4 minutes — comfortably inside the access-token window —
 *   which triggers the jwt callback and our `refreshAccessToken` helper. We
 *   pair it with `refetchOnWindowFocus` so a tab that's been idle past the
 *   interval gets refreshed the moment the user returns, and skip refetch
 *   when offline so we don't burn battery on dead networks.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <SessionProvider
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
          <QueryClientProvider client={queryClient}>

  
          {children}
          </QueryClientProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
