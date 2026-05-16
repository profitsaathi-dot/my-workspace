"use client";

import { Clock } from "lucide-react";

type Overall = "up" | "degraded" | "down" | "unknown";

const titles: Record<Overall, string> = {
  up: "System Status: UP",
  degraded: "System Status: DEGRADED",
  down: "System Status: DOWN",
  unknown: "System Status: UNKNOWN",
};

/**
 * Big hero banner — accent-coloured gradient on the left half of the page,
 * with a decorative pulsing square on the right and a "last checked"
 * timestamp at the bottom. Adapts to the active accent picker color.
 */
export function SystemStatusHero({
  overall,
  fetchedAt,
}: {
  overall: Overall;
  fetchedAt?: string;
}) {
  // Map overall status to a gradient pair. UP uses the user's accent so
  // switching the accent in settings re-themes the hero too.
  const gradient =
    overall === "down"
      ? "from-red-700 to-red-500"
      : overall === "degraded"
        ? "from-amber-700 to-amber-500"
        : overall === "unknown"
          ? "from-zinc-700 to-zinc-500"
          : "";

  const formatted = fetchedAt
    ? new Date(fetchedAt).toLocaleString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZoneName: "short",
      })
    : null;

  return (
    <div
      className={
        gradient
          ? `relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white shadow-md`
          : "relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-2xl p-6 text-white shadow-md"
      }
      style={
        gradient
          ? undefined
          : {
              background:
                "linear-gradient(135deg, var(--accent-strong, var(--accent)) 0%, var(--accent) 100%)",
            }
      }
    >
      <div className="relative z-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
          Global node performance
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          {titles[overall]}
        </h1>
      </div>

      <div className="relative z-10 mt-6 flex items-center gap-2 text-sm text-white/80">
        <Clock className="size-4" />
        <span>{formatted ? `Last checked: ${formatted}` : "Awaiting first health probe…"}</span>
      </div>

      {/* Decorative pulsing square — purely visual */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-6 hidden items-center sm:flex"
      >
        <div className="relative grid size-32 place-items-center">
          <div className="absolute inset-0 rounded-2xl ring-2 ring-white/30" />
          <div className="absolute inset-3 rounded-xl ring-2 ring-white/20" />
          <span className="relative size-2.5 rounded-full bg-white shadow-[0_0_24px_4px_rgba(255,255,255,0.7)]" />
        </div>
      </div>
    </div>
  );
}
