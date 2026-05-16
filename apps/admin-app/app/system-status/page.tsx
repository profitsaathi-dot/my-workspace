"use client";

import { Cpu, Loader2, MemoryStick } from "lucide-react";
import { Skeleton, Topbar } from "@workspace/ui";
import { ActiveUptimeCard } from "@/components/health/ActiveUptimeCard";
import { DbStatusIndicator } from "@/components/health/DbStatusIndicator";
import { DiskSpacePanel } from "@/components/health/DiskSpacePanel";
import { InfrastructurePanel } from "@/components/health/InfrastructurePanel";
import { SystemStatusHero } from "@/components/health/SystemStatusHero";
import { UsageTile } from "@/components/health/UsageTile";
import { useSystemHealth } from "@/hooks/use-system-health";

const MB = 1024 ** 2;
const GB = 1024 ** 3;
function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(0)} MB`;
  return `${bytes} B`;
}

export default function SystemStatusPage() {
  const { data: health, loading, error } = useSystemHealth({
    intervalMs: 10_000,
  });
  // Show skeletons only on the first load — subsequent polls keep the last
  // values on screen so the UI doesn't flicker every 10 seconds.
  const isInitialLoad = loading && !health;
  const overall = health?.overall ?? "unknown";
  const lastRefresh: "up" | "down" | "unknown" = error
    ? "down"
    : health
      ? "up"
      : "unknown";

  const resources = health?.resources;

  // CPU — system-wide whenever exposed; fall back to process CPU otherwise.
  const cpuRaw = resources?.cpuUsage ?? resources?.processCpuUsage ?? null;
  const cpuPercent = cpuRaw === null ? null : cpuRaw * 100;
  const cpuFromProcess =
    (resources?.cpuUsage === null || resources?.cpuUsage === undefined) &&
    resources?.processCpuUsage !== null;
  const cpuCaption = cpuFromProcess
    ? "Process CPU — host metric unavailable"
    : "Host CPU across all cores";

  // RAM — prefer system-wide (host) memory; fall back to JVM heap if the
  // server doesn't yet expose system.memory.* (older deploys).
  const usingHostRam =
    resources?.systemMemoryUsedBytes != null &&
    resources?.systemMemoryTotalBytes != null;
  const memUsed = usingHostRam
    ? resources!.systemMemoryUsedBytes!
    : resources?.jvmMemoryUsedBytes ?? null;
  const memMax = usingHostRam
    ? resources!.systemMemoryTotalBytes!
    : resources?.jvmMemoryMaxBytes ?? null;
  const memPercent =
    memUsed !== null && memMax !== null && memMax > 0
      ? (memUsed / memMax) * 100
      : null;
  const memCaption =
    memUsed !== null && memMax !== null
      ? `${formatBytes(memUsed)} / ${formatBytes(memMax)} ${
          usingHostRam ? "host RAM" : "JVM heap (host RAM not exposed)"
        }`
      : "Memory usage unavailable";

  return (
    <>
      <Topbar
        title="System status"
        subtitle="Live health from the monolith — DB, cache, disk, CPU, and RAM"
        actions={
          isInitialLoad ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Loading…
            </span>
          ) : undefined
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-3 sm:p-4 sm:gap-6 lg:p-6">
        {isInitialLoad ? (
          <SystemStatusSkeleton />
        ) : (
          <>
            {/* ── Hero row: big gradient banner + uptime KPI ───────────── */}
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SystemStatusHero
                  overall={overall}
                  fetchedAt={health?.fetchedAt}
                />
              </div>
              <ActiveUptimeCard />
            </section>

            {/* ── Five tiles: DB, disk, CPU, RAM, infra ────────────────── */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <DbStatusIndicator
                databases={health?.databases ?? []}
                caches={health?.caches ?? []}
              />
              <DiskSpacePanel disk={health?.diskSpace ?? null} />
              <UsageTile
                title="CPU Usage"
                icon={<Cpu className="size-4" />}
                percent={cpuPercent}
                caption={cpuCaption}
              />
              <UsageTile
                title="Memory Usage"
                icon={<MemoryStick className="size-4" />}
                percent={memPercent}
                caption={memCaption}
              />
              <InfrastructurePanel
                ping={health?.ping.status ?? "unknown"}
                lastRefresh={lastRefresh}
                ssl={undefined}
              />
            </section>
          </>
        )}

        {health && health.errors.length > 0 && (
          <section className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">
            <p className="font-semibold">Health probe errors</p>
            <ul className="mt-1 list-disc pl-5 text-xs opacity-80">
              {health.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}

/**
 * Mirrors the live layout (hero + uptime + 5 tiles) so the page doesn't
 * jump when real data lands. Shown only on first load — polling refreshes
 * keep the previous values on screen.
 */
function SystemStatusSkeleton() {
  return (
    <>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="lg:col-span-2 h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </section>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <TileSkeleton key={i} />
        ))}
      </section>
    </>
  );
}

function TileSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-5 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-8 w-20" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-3/4" />
    </div>
  );
}
