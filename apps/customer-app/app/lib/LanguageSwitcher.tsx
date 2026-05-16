"use client";

import * as React from "react";
import { Globe, Check } from "lucide-react";
import { LANGUAGES, type Locale } from "@/i18n";

interface Props {
  className?: string;
  /** Show the current locale's label inline next to the globe icon. */
  showLabel?: boolean;
}

function readLocaleCookie(): Locale {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|; )locale=([^;]+)/);
  if (!m) return "en";
  const v = decodeURIComponent(m[1]).toLowerCase();
  const found = LANGUAGES.find((l) => l.code === v);
  return found?.code ?? "en";
}

/**
 * Header-friendly language picker. Anonymous-safe: writes the `locale` cookie
 * and forces a hard reload so next-intl re-resolves messages on the next
 * request. No backend call, so it works whether the user is logged in or not.
 */
export function LanguageSwitcher({ className, showLabel = false }: Props) {
  const [current, setCurrent] = React.useState<Locale>("en");
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setCurrent(readLocaleCookie());
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const change = (next: Locale) => {
    setOpen(false);
    if (next === current) return;
    document.cookie = `locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  };

  const active = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Change language"
        className="inline-flex items-center gap-2 rounded-lg border border-themed bg-card px-3 py-2 text-sm font-medium hover:bg-muted transition"
      >
        <Globe className="size-4" />
        <span className={showLabel ? "" : "hidden sm:inline"}>{active.native}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-52 rounded-xl border border-themed bg-card shadow-lg overflow-hidden z-50 animate-slide-in-right"
        >
          {LANGUAGES.map((lang) => {
            const selected = lang.code === current;
            return (
              <button
                key={lang.code}
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => change(lang.code)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition ${
                  selected
                    ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                    : "hover:bg-muted"
                }`}
              >
                <span className="flex flex-col">
                  <span className="font-medium">{lang.native}</span>
                  <span className="text-[11px] text-muted-foreground">{lang.label}</span>
                </span>
                {selected && <Check className="size-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
