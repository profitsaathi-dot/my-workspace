"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export const ACCENTS = [
  { value: "emerald", label: "Emerald", color: "#10b981" },
  { value: "sky", label: "Sky", color: "#0ea5e9" },
  { value: "violet", label: "Violet", color: "#8b5cf6" },
  { value: "rose", label: "Rose", color: "#f43f5e" },
  { value: "amber", label: "Amber", color: "#f59e0b" },
] as const;

export type AccentChoice = (typeof ACCENTS)[number]["value"];

interface AccentPickerProps {
  value: AccentChoice;
  onChange: (value: AccentChoice) => void;
  className?: string;
}

export function AccentPicker({ value, onChange, className }: AccentPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Accent color"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {ACCENTS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            title={opt.label}
            className={cn(
              "group inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium transition",
              selected
                ? "border-transparent text-white shadow-sm"
                : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            style={selected ? { background: opt.color } : undefined}
          >
            <span
              className={cn(
                "size-4 rounded-full transition",
                selected ? "ring-2 ring-white/40" : ""
              )}
              style={{ background: opt.color }}
            />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function applyAccent(accent: AccentChoice) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.accent = accent;
}

const ACCENT_KEY = "ps_accent";

export function useAccent(): [AccentChoice, (a: AccentChoice) => void] {
  const [accent, setAccentState] = React.useState<AccentChoice>("emerald");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(ACCENT_KEY) as AccentChoice | null;
    const valid = ACCENTS.find((a) => a.value === saved)?.value;
    const next = valid ?? "emerald";
    setAccentState(next);
    applyAccent(next);
  }, []);

  const setAccent = React.useCallback((next: AccentChoice) => {
    setAccentState(next);
    applyAccent(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACCENT_KEY, next);
    }
  }, []);

  return [accent, setAccent];
}
