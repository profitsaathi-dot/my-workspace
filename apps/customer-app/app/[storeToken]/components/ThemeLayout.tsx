"use client";

import { useEffect, useState } from "react";
import {
  Fraunces,
  Noto_Sans,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_Kannada,
  Noto_Sans_Malayalam,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
} from "next/font/google";
import { useTheme } from "next-themes";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
});

const body = Noto_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-devanagari" });
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-tamil" });
const telugu = Noto_Sans_Telugu({ subsets: ["telugu"], variable: "--font-telugu" });
const malayalam = Noto_Sans_Malayalam({ subsets: ["malayalam"], variable: "--font-malayalam" });
const bengali = Noto_Sans_Bengali({ subsets: ["bengali"], variable: "--font-bengali" });
const kannada = Noto_Sans_Kannada({ subsets: ["kannada"], variable: "--font-kannada" });

export default function ThemeLayout({ children }: any) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? (resolvedTheme === "dark") : true;
  const setDarkMode = (next: boolean) => setTheme(next ? "dark" : "light");

  return (
    <div
      className={`${display.variable} ${body.variable} ${devanagari.variable} ${tamil.variable} ${telugu.variable} ${malayalam.variable} ${bengali.variable} ${kannada.variable} font-body min-h-screen bg-background text-foreground transition-colors duration-300`}
      data-loaded={mounted ? "true" : "false"}
    >
      {children({ darkMode: isDark, setDarkMode })}

      <style jsx global>{`
        .font-body {
          font-family: var(--font-body), var(--font-devanagari), var(--font-tamil),
            var(--font-telugu), var(--font-malayalam), var(--font-bengali),
            var(--font-kannada), sans-serif;
        }
        .font-display {
          font-family: var(--font-display), var(--font-body), serif;
        }
        .reveal {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        [data-loaded="true"] .reveal {
          opacity: 1;
          transform: translateY(0);
        }
        .delay-1 { transition-delay: 120ms; }
        .delay-2 { transition-delay: 220ms; }
        .delay-3 { transition-delay: 320ms; }
        .delay-4 { transition-delay: 420ms; }
        .delay-5 { transition-delay: 520ms; }

        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50%      { transform: translateY(-12px) translateX(6px); }
        }
        .floating-badge { animation: float 10s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .reveal,
          .floating-badge {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
