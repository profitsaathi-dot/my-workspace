"use client";

import * as React from "react";
import { ACCENTS, applyAccent, type AccentChoice } from "@workspace/ui";

const COOKIE_NAME = "accent";

function readCookie(): AccentChoice | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )accent=([^;]+)/);
  if (!match) return null;
  const v = decodeURIComponent(match[1]) as AccentChoice;
  return ACCENTS.find((a) => a.value === v)?.value ?? null;
}

function writeCookie(value: AccentChoice) {
  if (typeof document === "undefined") return;
  // 1 year, root path so server layout can read it
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

/**
 * Cookie-backed accent state. SSR reads the same cookie in app/layout.tsx
 * and stamps `data-accent` on <html>, so the first paint matches.
 */
export function useAccentCookie(): [AccentChoice, (a: AccentChoice) => void] {
  const [accent, setAccentState] = React.useState<AccentChoice>("emerald");

  React.useEffect(() => {
    const next = readCookie() ?? "emerald";
    setAccentState(next);
    applyAccent(next);
  }, []);

  const setAccent = React.useCallback((next: AccentChoice) => {
    setAccentState(next);
    applyAccent(next);
    writeCookie(next);
  }, []);

  return [accent, setAccent];
}
