"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useUserStore } from "@/src/stores/user.store";

/**
 * Server-trusted routing gate. Reads `users.onboarded_at` and
 * `users.email_verified_at` from the zustand store (hydrated by `useSyncUser`
 * from `/api/user/me`, which queries Postgres directly using the JWT subject).
 *
 * The client cannot lie about these — they're plain DB columns flipped only
 * by auth-gated POST routes that re-derive the user identity from the JWT.
 *
 * Mount once at the AppShell level so it gates every protected page.
 */
export function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { status } = useSession();
  const user = useUserStore((s) => s.user);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!user) return; // wait for /api/user/me to hydrate

    const onboarded = !!user.onboardedAt;
    const verified = !!user.emailVerifiedAt;

    // These pages ARE the gates — never redirect away from them.
    const passthrough =
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/verify-email") ||
      pathname === "/login";

    if (!onboarded && !passthrough) {
      router.replace("/onboarding");
      return;
    }

    if (onboarded && !verified && !passthrough) {
      router.replace("/verify-email?callbackUrl=" + encodeURIComponent(pathname));
    }
  }, [status, pathname, router, user]);

  return null;
}
