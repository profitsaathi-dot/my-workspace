import { cn } from "@workspace/ui";
import type { Status } from "@/lib/services/health.service";

const tone: Record<Status, string> = {
  up: "bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]",
  down: "bg-red-400 shadow-[0_0_0_3px_rgba(239,68,68,0.18)]",
  unknown: "bg-amber-400 shadow-[0_0_0_3px_rgba(245,158,11,0.18)]",
};

export function StatusDot({
  status,
  className,
  pulse = false,
}: {
  status: Status;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        tone[status],
        pulse && status === "up" && "animate-pulse",
        className,
      )}
    />
  );
}

const pillTone: Record<Status, string> = {
  up: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  down: "bg-red-500/15 text-red-400 ring-red-500/30",
  unknown: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
};

const pillLabel: Record<Status, string> = {
  up: "UP",
  down: "DOWN",
  unknown: "UNKNOWN",
};

export function StatusPill({
  status,
  className,
  label,
}: {
  status: Status;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        pillTone[status],
        className,
      )}
    >
      {label ?? pillLabel[status]}
    </span>
  );
}
