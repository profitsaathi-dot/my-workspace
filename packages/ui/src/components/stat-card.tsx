import * as React from "react";
import { cn } from "../lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  hint?: string;
  trend?: { delta: string; direction: "up" | "down" };
  highlight?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  hint,
  trend,
  highlight,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 shadow-sm transition hover:border-[color:var(--accent)]/40",
        className
      )}
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="uppercase tracking-wide">{title}</span>
        {icon}
      </div>
      <p
        className={cn(
          "mt-3 text-2xl font-semibold tabular-nums text-foreground",
          highlight
        )}
      >
        {value}
      </p>
      {(trend || hint) && (
        <div className="mt-1 flex items-center justify-between text-xs">
          {trend ? (
            <span
              className={cn(
                "font-medium",
                trend.direction === "up"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {trend.direction === "up" ? "▲" : "▼"} {trend.delta}
            </span>
          ) : (
            <span />
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </div>
  );
}
