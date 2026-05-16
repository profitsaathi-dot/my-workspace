"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster, TooltipProvider } from "@workspace/ui";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <SessionProvider
      basePath="/user/api/auth"
      // FIX: Check session every 4 minutes (240 seconds) in the background.
      // ⚠️ IMPORTANT: Change `240` to be slightly LESS than your Keycloak
      // "Access Token Lifespan". If Keycloak is set to 5 mins (300s), 240s is perfect.
      refetchInterval={240}

      // FIX: Force a token check whenever the user tabs back into the app
      refetchOnWindowFocus={true}
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
            {/* Push toasts away from the iOS Dynamic Island / notch and the
                Android nav bar. env(safe-area-inset-*) resolves to 0 in the
                desktop browser, so this is a no-op on web. */}
            <Toaster
              offset={{
                top: "calc(env(safe-area-inset-top) + 1rem)",
                bottom: "calc(env(safe-area-inset-bottom) + 1rem)",
                left: "calc(env(safe-area-inset-left) + 1rem)",
                right: "calc(env(safe-area-inset-right) + 1rem)",
              }}
              mobileOffset={{
                top: "calc(env(safe-area-inset-top) + 0.75rem)",
                bottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
                left: "calc(env(safe-area-inset-left) + 0.75rem)",
                right: "calc(env(safe-area-inset-right) + 0.75rem)",
              }}
            />
          </QueryClientProvider>
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
