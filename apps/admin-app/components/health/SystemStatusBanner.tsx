"use client";

import { AlertTriangle, CheckCircle2, CircleHelp, XCircle } from "lucide-react";

type Overall = "up" | "degraded" | "down" | "unknown";

const config: Record<
  Overall,
  {
    title: string;
    description: string;
    icon: React.ReactNode;
    iconBg: string;
    titleColor: string;
    border: string;
  }
> = {
  up: {
    title: "System Status: UP",
    description:
      "All discovery components are reporting active. Operational latency within normal parameters.",
    icon: <CheckCircle2 className="size-7" />,
    iconBg:
      "bg-[color:var(--accent-soft)] text-[color:var(--accent)] ring-[color:var(--accent)]/30",
    titleColor: "text-[color:var(--accent)]",
    border: "border-[color:var(--accent)]/30",
  },
  degraded: {
    title: "System Status: DEGRADED",
    description:
      "Some components could not be reached. Review the panels below for the specific failures.",
    icon: <AlertTriangle className="size-7" />,
    iconBg:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30",
    titleColor: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
  },
  down: {
    title: "System Status: DOWN",
    description:
      "One or more critical components are reporting DOWN. Immediate attention recommended.",
    icon: <XCircle className="size-7" />,
    iconBg: "bg-red-500/15 text-red-600 dark:text-red-400 ring-red-500/30",
    titleColor: "text-red-600 dark:text-red-400",
    border: "border-red-500/30",
  },
  unknown: {
    title: "System Status: UNKNOWN",
    description:
      "Unable to determine system health. The discovery server may be unreachable.",
    icon: <CircleHelp className="size-7" />,
    iconBg: "bg-muted text-foreground ring-[color:var(--border)]",
    titleColor: "text-foreground",
    border: "",
  },
};

export function SystemStatusBanner({
  overall,
  fetchedAt,
}: {
  overall: Overall;
  fetchedAt?: string;
}) {
  const c = config[overall];
  return (
    <div
      className={`flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-sm ${c.border}`}
    >
      <div
        className={`grid size-14 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${c.iconBg}`}
      >
        {c.icon}
      </div>
      <div className="min-w-0 flex-1">
        <h2
          className={`text-2xl font-semibold tracking-tight ${c.titleColor}`}
        >
          {c.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
        {fetchedAt && (
          <p className="mt-2 text-[11px] text-muted-foreground/70">
            Updated {new Date(fetchedAt).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
