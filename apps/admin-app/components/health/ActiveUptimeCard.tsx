"use client";

import { TrendingUp } from "lucide-react";

/**
 * Active uptime KPI tile. Today the uptime number is a static placeholder
 * (we don't have historical health data yet) — wire to a real source by
 * passing a computed `percent` and `trendDelta`.
 */
export function ActiveUptimeCard({
  percent = 99.98,
  trendDelta = 0.04,
  segments = 5,
}: {
  percent?: number;
  trendDelta?: number;
  segments?: number;
}) {
  const trendingPositive = trendDelta >= 0;
  const sign = trendingPositive ? "+" : "";

  return (
    <div className="flex min-h-[200px] flex-col justify-between rounded-2xl border bg-card p-6 shadow-sm">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Active uptime
        </p>
        <p className="mt-3 text-5xl font-bold tracking-tight tabular-nums text-[color:var(--accent)] sm:text-6xl">
          {percent.toFixed(2)}
          <span className="ml-1 text-2xl font-semibold text-foreground/80 sm:text-3xl">
            %
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: segments }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{
                background: "var(--accent)",
                opacity: 0.5 + (i / segments) * 0.5,
              }}
            />
          ))}
        </div>
        <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <TrendingUp className="size-3" />
          Monthly trending {trendingPositive ? "positive" : "negative"} (
          {sign}
          {trendDelta.toFixed(2)}%)
        </p>
      </div>
    </div>
  );
}
