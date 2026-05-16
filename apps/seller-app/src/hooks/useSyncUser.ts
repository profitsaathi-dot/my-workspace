/**
 * Hydrates the user store from the backend after authentication.
 *
 * Source of truth: `/api/user/me` (direct Postgres). This is what the
 * OnboardingGate reads to decide whether to redirect — never localStorage.
 */
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useUserStore } from "@/src/stores/user.store";
import {
  SUPPORTED_ACCENTS,
  SUPPORTED_LANGUAGES,
  type AccentPreference,
  type LanguagePreference,
  type SellerType,
  type ThemePreference,
  type User,
} from "@/src/types/user";

function capitalize(s?: string | null) {
  if (!s) return undefined;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalizeLanguage(v: unknown): LanguagePreference | undefined {
  return typeof v === "string" &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(v)
    ? (v as LanguagePreference)
    : undefined;
}

function normalizeTheme(v: unknown): ThemePreference | undefined {
  return v === "light" || v === "dark" || v === "system" ? v : undefined;
}

function normalizeAccent(v: unknown): AccentPreference | undefined {
  return typeof v === "string" &&
    (SUPPORTED_ACCENTS as readonly string[]).includes(v)
    ? (v as AccentPreference)
    : undefined;
}

function normalize(raw: any): User | null {
  if (!raw || typeof raw !== "object") return null;
  const publicToken: string | undefined = raw.publicToken ?? raw.public_token;
  const storeName: string | undefined =
    raw.storeName ?? raw.store_name ?? capitalize(publicToken);
  const sellerType: SellerType | undefined =
    raw.sellerType === "individual" || raw.sellerType === "social"
      ? raw.sellerType
      : undefined;
  return {
    id: raw.id,
    name: raw.name ?? "",
    email: raw.email ?? "",
    publicToken: publicToken ?? "",
    storeName,
    sellerType,
    subscription: raw.subscription,
    mobile: raw.mobile ?? raw.phoneNumber ?? null,
    onboardedAt: raw.onboardedAt ?? raw.onboarded_at ?? null,
    emailVerifiedAt: raw.emailVerifiedAt ?? raw.email_verified_at ?? null,
    language: normalizeLanguage(raw.language),
    theme: normalizeTheme(raw.theme),
    accent: normalizeAccent(raw.accent),
    paymentType:
      raw.paymentType === "ONLINE" ||
      raw.paymentType === "UPI_QR" ||
      raw.paymentType === "BANK_ACCOUNT"
        ? raw.paymentType
        : null,
    paymentQRCode: raw.paymentQRCode ?? raw.payment_qrcode ?? null,
    bankAccountIfsc: raw.bankAccountIfsc ?? raw.bank_account_ifsc ?? null,
    bankAccountMasked: raw.bankAccountMasked ?? null,
  };
}

export function useSyncUser() {
  const { data: session, status } = useSession();
  const setUser = useUserStore((s) => s.setUser);
  const clear = useUserStore((s) => s.clear);

  useEffect(() => {
    if (status === "unauthenticated") {
      clear();
      return;
    }
    if (status !== "authenticated") return;

    let cancelled = false;

    // Defensive JSON read — backends behind nginx can serve HTML error pages
    // (proxy_intercept_errors), which would otherwise crash JSON.parse and
    // spam the console with "Unexpected token '<'".
    const safeJson = async (res: Response): Promise<unknown> => {
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) return null;
      try {
        return await res.json();
      } catch {
        return null;
      }
    };

    (async () => {
      try {
        // Spring's signup endpoint provisions the seller row atomically, so a
        // single read is enough — no on-demand "create" fallback like the
        // Keycloak-era flow had.
        const res = await fetch("/api/user/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = await safeJson(res);
        const u = normalize(data);
        if (!cancelled && u) setUser(u);
      } catch (err) {
        console.error("[useSyncUser] sync failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, session?.accessToken, setUser, clear]);
}
