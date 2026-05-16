"use client";

import { AlertTriangle, HardDrive } from "lucide-react";
import { cn } from "@workspace/ui";
import type { DiskSpaceHealth } from "@/lib/services/health.service";
import { TileCard } from "./TileCard";

const GB = 1024 ** 3;
const MB = 1024 ** 2;

function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${bytes} B`;
}

export function DiskSpacePanel({ disk }: { disk: DiskSpaceHealth | null }) {
  if (!disk) {
    return (
      <TileCard
        title="Disk Space"
        icon={<HardDrive className="size-4" />}
        iconClass="text-muted-foreground"
      >
        <p className="text-sm text-muted-foreground">
          Disk-space component not exposed by the actuator.
        </p>
      </TileCard>
    );
  }

  const usedRatio = disk.total > 0 ? 1 - disk.free / disk.total : 0;
  const remainingAboveThreshold = disk.free - disk.threshold;
  const usedPct = Math.round(usedRatio * 100);
  const critical = remainingAboveThreshold <= 0 || disk.status === "down";
  const warning = !critical && disk.free / disk.total < 0.1;

  const tone = critical ? "danger" : warning ? "warning" : "default";
  const barColor = critical
    ? "bg-red-500"
    : warning
      ? "bg-amber-400"
      : "bg-[color:var(--accent)]";
  const iconClass = critical
    ? "text-red-500"
    : warning
      ? "text-amber-500"
      : "text-[color:var(--accent)]";

  return (
    <TileCard
      title="Disk Space"
      tone={tone}
      icon={
        critical || warning ? (
          <AlertTriangle className="size-4" />
        ) : (
          <HardDrive className="size-4" />
        )
      }
      iconClass={iconClass}
    >
      <div className="flex items-baseline justify-between text-xs uppercase tracking-wide">
        <span className="font-semibold">
          <span
            className={cn(
              "tabular-nums",
              critical
                ? "text-red-600 dark:text-red-400"
                : "text-foreground",
            )}
          >
            {formatBytes(disk.free)}
          </span>
          <span className="ml-1 text-muted-foreground">free</span>
        </span>
        <span className="font-semibold tabular-nums text-muted-foreground">
          {formatBytes(disk.total)} total
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-[width]", barColor)}
          style={{
            width: `${Math.max(2, Math.min(100, usedRatio * 100)).toFixed(1)}%`,
          }}
        />
      </div>

      {critical ? (
        <p className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
          Warning: Storage capacity at {usedPct}%
        </p>
      ) : warning ? (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          Notice: {usedPct}% used
        </p>
      ) : (
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {usedPct}% used
        </p>
      )}
    </TileCard>
  );
}
