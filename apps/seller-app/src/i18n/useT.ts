/**
 * `useT()` — store-driven translation hook.
 *
 * Reads the current language from the user store (hydrated by `useSyncUser`).
 * Calling `setLanguage` from Settings → patchUser → store update → every
 * `useT()` consumer re-renders with the new locale. No reload, no middleware.
 *
 * Falls back to English when the user has no language set yet (first
 * sign-in) or when a key is missing from the target locale.
 *
 * Translations live as one JSON per locale under `messages/`. Add a new
 * language by dropping a new `<lang>.json` and registering it here.
 */
"use client";

import { useCallback } from "react";
import { useUserStore } from "@/src/stores/user.store";
import type { LanguagePreference } from "@/src/types/user";
import en from "../../messages/en.json";
import hi from "../../messages/hi.json";
import mr from "../../messages/mr.json";
import ta from "../../messages/ta.json";
import te from "../../messages/te.json";
import bn from "../../messages/bn.json";
import kn from "../../messages/kn.json";
import gu from "../../messages/gu.json";
import ml from "../../messages/ml.json";

type Dictionary = Record<string, string>;

const messages: Record<LanguagePreference, Dictionary> = {
  en,
  hi,
  mr,
  ta,
  te,
  bn,
  kn,
  gu,
  ml,
};

export type MessageKey = keyof typeof en;

function format(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`
  );
}

export function useT() {
  const lang = useUserStore((s) => s.user?.language) ?? "en";
  return useCallback(
    (key: MessageKey, vars?: Record<string, string | number>): string => {
      const dict =
        messages[lang as LanguagePreference] ?? messages.en;
      const template =
        (dict as Dictionary)[key as string] ??
        (messages.en as Dictionary)[key as string] ??
        (key as string);
      return format(template, vars);
    },
    [lang]
  );
}
