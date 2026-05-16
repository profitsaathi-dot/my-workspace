"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  HandHeart,
  ShieldCheck,
  Lock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@workspace/ui";

interface Slide {
  key: string;
  titleKey: string;
  descKey: string;
  Icon: LucideIcon;
  /** Tailwind classes for the visual icon tile. */
  tone: string;
}

const SLIDES: Slide[] = [
  { key: "festival", titleKey: "festivalTitle", descKey: "festivalDesc", Icon: Sparkles,    tone: "bg-[color:var(--accent-soft)] text-[color:var(--accent)]" },
  { key: "smallBiz", titleKey: "smallBizTitle", descKey: "smallBizDesc", Icon: HandHeart,   tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  { key: "trusted",  titleKey: "trustedTitle",  descKey: "trustedDesc",  Icon: ShieldCheck, tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { key: "secure",   titleKey: "secureTitle",   descKey: "secureDesc",   Icon: Lock,        tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
];

const ROTATE_MS = 5000;

interface Props {
  onCta?: () => void;
}

export function DynamicHero({ onCta }: Props) {
  const t = useTranslations("customer.home");
  const tOffers = useTranslations("customer.home.offers");
  const [index, setIndex] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % SLIDES.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused]);

  const go = (next: number) => {
    setDirection(next > index ? 1 : -1);
    setIndex((next + SLIDES.length) % SLIDES.length);
  };

  const slide = SLIDES[index];
  const Icon = slide.Icon;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-themed bg-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Subtle pattern + accent glow */}
      <div className="absolute inset-0 pattern-grid opacity-50" aria-hidden />
      <div
        className="absolute -right-24 -top-24 size-72 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ background: "var(--accent)" }}
        aria-hidden
      />
      <div
        className="absolute -left-20 -bottom-20 size-56 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: "var(--accent)" }}
        aria-hidden
      />

      {/* Content */}
      <div className="relative px-6 py-8 sm:px-10 sm:py-10 min-h-[180px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.key}
            custom={direction}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 24 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col sm:flex-row sm:items-center gap-5"
          >
            <div
              className={`grid size-14 shrink-0 place-items-center rounded-xl ring-1 ring-current/10 ${slide.tone}`}
            >
              <Icon className="size-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                {tOffers(slide.titleKey)}
              </h2>
              <p className="mt-1.5 text-sm sm:text-base text-muted-foreground">
                {tOffers(slide.descKey)}
              </p>
            </div>
            {onCta && (
              <div className="hidden sm:block">
                <Button onClick={onCta} className="shrink-0">
                  {t("cta")} <ArrowRight />
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Mobile CTA (separate row to avoid overflow) */}
        {onCta && (
          <div className="mt-5 sm:hidden">
            <Button onClick={onCta} className="w-full">
              {t("cta")} <ArrowRight />
            </Button>
          </div>
        )}

        {/* Bottom controls */}
        <div className="absolute left-6 right-6 sm:left-10 sm:right-10 bottom-3 flex items-center justify-between gap-3">
          {/* dots */}
          <div className="flex items-center gap-1.5">
            {SLIDES.map((s, i) => (
              <button
                key={s.key}
                onClick={() => go(i)}
                aria-label={`Show offer ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-[color:var(--accent)]" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                }`}
              />
            ))}
          </div>

          {/* prev / next (desktop) */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => go(index - 1)}
              className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition"
              aria-label="Previous offer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => go(index + 1)}
              className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition"
              aria-label="Next offer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
