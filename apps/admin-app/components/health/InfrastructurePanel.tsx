"use client";

import { Cloud } from "lucide-react";
import { cn } from "@workspace/ui";
import type { Status } from "@/lib/services/health.service";
import { StatusPill } from "./StatusDot";
import { TileCard } from "./TileCard";

interface InfrastructurePanelProps {
  ping: Status;
  /** Did the last poll succeed? */
  lastRefresh: Status;
  /** Optional — pass `undefined` if you don't have an SSL probe yet. */
  ssl?: Status;
  pingMs?: number;
}

export function InfrastructurePanel({
  ping,
  lastRefresh,
  ssl,
  pingMs,
}: InfrastructurePanelProps) {
  return (
    <TileCard
      title="Infrastructure"
      icon={<Cloud className="size-4" />}
      iconClass="text-[color:var(--accent)]"
    >
      <div className="grid grid-cols-2 gap-2">
        <MiniTile
          label="Ping"
          value={pingMs !== undefined ? `${pingMs}ms` : undefined}
          status={ping}
          highlightValue
        />
        <MiniTile
          label="Refresh"
          value={
            lastRefresh === "up"
              ? "OK"
              : lastRefresh === "down"
                ? "FAIL"
                : "—"
          }
          status={lastRefresh}
          highlightValue
        />
      </div>
      <MiniTile
        label="SSL Certificate"
        status={ssl ?? "unknown"}
        rightPill
      />
    </TileCard>
  );
}

function MiniTile({
  label,
  value,
  status,
  highlightValue = false,
  rightPill = false,
}: {
  label: string;
  value?: string;
  status: Status;
  highlightValue?: boolean;
  rightPill?: boolean;
}) {
  const tone =
    status === "up"
      ? "text-[color:var(--accent)]"
      : status === "down"
        ? "text-red-500 dark:text-red-400"
        : "text-amber-500 dark:text-amber-400";

  if (rightPill) {
    return (
      <div className="flex items-center justify-between rounded-xl border bg-background/60 px-3 py-2.5">
        <span className="text-sm font-medium">{label}</span>
        <StatusPill status={status} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border bg-background/60 px-3 py-3">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-bold tracking-tight tabular-nums",
          highlightValue ? tone : "text-foreground",
        )}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}
