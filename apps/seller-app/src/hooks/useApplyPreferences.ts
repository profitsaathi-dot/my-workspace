/**
 * Applies the seller's persisted UI preferences (language, theme, accent)
 * once the user store is hydrated. Source of truth is the DB (via
 * `useSyncUser`); we only fall back to localStorage when the user has no DB
 * value yet.
 *
 * Theme is delegated to next-themes so its own localStorage cache stays in
 * sync. Accent is applied via the UI package's `applyAccent` helper and
 * mirrored into localStorage so `useAccent` (the picker hook) reads the same
 * value across reloads.
 */
"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { applyAccent } from "@workspace/ui";
import { useUserStore } from "@/src/stores/user.store";

const ACCENT_KEY = "ps_accent";

export function useApplyPreferences() {
  const language = useUserStore((s) => s.user?.language);
  const theme = useUserStore((s) => s.user?.theme);
  const accent = useUserStore((s) => s.user?.accent);
  const { setTheme } = useTheme();
  const appliedTheme = useRef<string | null>(null);
  const appliedAccent = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document !== "undefined" && language) {
      document.documentElement.lang = language;
    }
  }, [language]);

  useEffect(() => {
    if (!theme || appliedTheme.current === theme) return;
    appliedTheme.current = theme;
    setTheme(theme);
  }, [theme, setTheme]);

  useEffect(() => {
    if (!accent || appliedAccent.current === accent) return;
    appliedAccent.current = accent;
    applyAccent(accent);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACCENT_KEY, accent);
    }
  }, [accent]);
}
