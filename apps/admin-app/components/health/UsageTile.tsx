"use client";

import { cn } from "@workspace/ui";
import { TileCard } from "./TileCard";

/**
 * CPU / Memory usage tile. Shows a circular ring gauge with the percent in
 * the centre + a small caption underneath (e.g. "256 MB / 1 GB").
 *
 * Pass `percent` as 0..100. Colour shifts to amber at >70% and red at >90%
 * so a glance at the dashboard tells you which resource is in trouble.
 */
export function UsageTile({
  title,
  icon,
  percent,
  caption,
  unavailableMessage = "Not reported",
}: {
  title: string;
  icon: React.ReactNode;
  /** 0..100, or null when the metric is unavailable. */
  percent: number | null;
  caption?: string;
  unavailableMessage?: string;
}) {
  if (percent === null) {
    return (
      <TileCard title={title} icon={icon} iconClass="text-muted-foreground">
        <p className="text-sm text-muted-foreground">{unavailableMessage}</p>
      </TileCard>
    );
  }

  const clamped = Math.max(0, Math.min(100, percent));
  const tone =
    clamped >= 90
      ? { ring: "stroke-red-500", text: "text-red-500 dark:text-red-400" }
      : clamped >= 70
        ? { ring: "stroke-amber-500", text: "text-amber-500 dark:text-amber-400" }
        : {
            ring: "stroke-[color:var(--accent)]",
            text: "text-[color:var(--accent)]",
          };

  // SVG ring math — 36-px viewBox keeps the dashoffset clean.
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <TileCard title={title} icon={icon} iconClass={tone.text}>
      <div className="flex items-center gap-4">
        <div className="relative grid size-20 shrink-0 place-items-center">
          <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
            <circle
              cx="18"
              cy="18"
              r={radius}
              fill="none"
              className="stroke-muted"
              strokeWidth="3.5"
            />
            <circle
              cx="18"
              cy="18"
              r={radius}
              fill="none"
              className={cn(tone.ring, "transition-[stroke-dashoffset] duration-500")}
              strokeWidth="3.5"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          <span
            className={cn(
              "pointer-events-none absolute inset-0 grid place-items-center text-base font-bold tabular-nums",
              tone.text,
            )}
          >
            {clamped.toFixed(0)}%
          </span>
        </div>
        {caption && (
          <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
            {caption}
          </p>
        )}
      </div>
    </TileCard>
  );
}
