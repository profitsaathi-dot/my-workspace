"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Loader2,
  MessageSquare,
  Phone,
  PowerOff,
  QrCode,
  RefreshCcw,
  Search,
  ServerCog,
  Store,
  XCircle,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
  StatCard,
  Topbar,
} from "@workspace/ui";
import { BASE_PATH } from "@/lib/env";

type ServerStatus = "UP" | "DOWN" | "UNKNOWN";

interface SessionRow {
  name: string;
  status?: string | null;
  wahaStatus?: string | null;
  connected: boolean;
  phoneNumber?: string | null;
  pushName?: string | null;
  sellerId?: number | null;
  sellerName?: string | null;
  sellerEmail?: string | null;
  storeName?: string | null;
  updatedAt?: string | null;
}

interface WhatsAppOverview {
  server: ServerStatus;
  counts: {
    total: number;
    working: number;
    connected: number;
    scanning: number;
    failed: number;
    stopped: number;
    other: number;
    byStatus: Record<string, number>;
  };
  sessions: SessionRow[];
}

const STATUS_VARIANT: Record<string, "success" | "default" | "warning" | "danger" | "info"> = {
  WORKING: "success",
  STARTING: "info",
  SCAN_QR_CODE: "warning",
  STOPPED: "default",
  FAILED: "danger",
  UNKNOWN: "default",
};

export default function WhatsAppPage() {
  const [data, setData] = useState<WhatsAppOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/admin/whatsapp/status`, {
        cache: "no-store",
      });
      if (!res.ok) {
        let detail = res.statusText;
        try {
          const body = await res.json();
          if (body?.message) detail = body.message;
          else if (body?.error) detail = body.error;
        } catch {
          /* ignore */
        }
        throw new Error(detail);
      }
      setData((await res.json()) as WhatsAppOverview);
    } catch (e) {
      setError((e as Error).message || "Failed to load WhatsApp overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh every 15s in the background. Keep the previous render on screen
  // so users don't see a flicker each tick.
  useEffect(() => {
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);

  const sessions = data?.sessions ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) =>
      [s.name, s.sellerName, s.sellerEmail, s.storeName, s.phoneNumber, s.pushName]
        .filter(Boolean)
        .some((v) => v!.toString().toLowerCase().includes(q)),
    );
  }, [sessions, search]);

  return (
    <>
      <Topbar
        title="WhatsApp (WAHA)"
        subtitle="WAHA server health and per-seller session status"
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="size-3.5" />
            )}
            Refresh
          </Button>
        }
      />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-3 sm:p-4 sm:gap-6 lg:p-6">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loading && !data ? (
          <OverviewSkeleton />
        ) : data ? (
          <>
            <ServerStatusCard status={data.server} />
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
              <StatCard
                title="Total"
                value={data.counts.total.toLocaleString()}
                icon={<MessageSquare className="size-4 text-[color:var(--accent)]" />}
                hint="All known sessions"
              />
              <StatCard
                title="Working"
                value={data.counts.working.toLocaleString()}
                icon={<CheckCircle2 className="size-4 text-emerald-500" />}
                hint="WAHA status: WORKING"
              />
              <StatCard
                title="Scanning QR"
                value={data.counts.scanning.toLocaleString()}
                icon={<QrCode className="size-4 text-amber-500" />}
                hint="Awaiting QR scan"
              />
              <StatCard
                title="Failed"
                value={data.counts.failed.toLocaleString()}
                icon={<XCircle className="size-4 text-red-500" />}
                hint="WAHA status: FAILED"
              />
              <StatCard
                title="Stopped"
                value={data.counts.stopped.toLocaleString()}
                icon={<PowerOff className="size-4 text-muted-foreground" />}
                hint="Manually stopped"
              />
            </section>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status breakdown</CardTitle>
                <CardDescription>
                  Distribution of session status across all sellers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StatusBars buckets={data.counts.byStatus} total={data.counts.total} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by seller, store, phone, or session name"
                    className="pl-9"
                  />
                </div>
              </CardContent>
            </Card>

            {filtered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <MessageSquare className="size-8 text-muted-foreground" />
                  <div className="text-sm font-medium">
                    {search ? "No sessions match your search" : "No sessions yet"}
                  </div>
                  <p className="max-w-sm text-xs text-muted-foreground">
                    {search
                      ? "Try a different query."
                      : "Sellers haven't connected WhatsApp yet — they can start from their seller console."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <ul className="divide-y">
                  {filtered.map((s) => (
                    <SessionRowItem key={s.name} session={s} />
                  ))}
                </ul>
              </Card>
            )}
          </>
        ) : null}
      </main>
    </>
  );
}

function ServerStatusCard({ status }: { status: ServerStatus }) {
  const visual =
    status === "UP"
      ? {
          variant: "success" as const,
          icon: <CheckCircle2 className="size-4" />,
          label: "WAHA server is reachable",
          hint: "Sessions can be created, started, and messages dispatched.",
        }
      : status === "DOWN"
      ? {
          variant: "danger" as const,
          icon: <AlertTriangle className="size-4" />,
          label: "WAHA server unreachable",
          hint: "Status fields below show last-known DB state. Check the WAHA container at profitsaathi.whatsapp.url.",
        }
      : {
          variant: "default" as const,
          icon: <CircleDashed className="size-4" />,
          label: "Server status unknown",
          hint: "No probe result yet — refresh in a moment.",
        };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ServerCog className="size-4 text-[color:var(--accent)]" />
              Server
            </CardTitle>
            <CardDescription>{visual.hint}</CardDescription>
          </div>
          <Badge variant={visual.variant} className="gap-1.5">
            {visual.icon}
            {visual.label}
          </Badge>
        </div>
      </CardHeader>
    </Card>
  );
}

function StatusBars({
  buckets,
  total,
}: {
  buckets: Record<string, number>;
  total: number;
}) {
  const entries = Object.entries(buckets);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {entries
        .sort((a, b) => b[1] - a[1])
        .map(([status, count]) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <li key={status} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-foreground">{status}</span>
                <span className="text-muted-foreground">
                  {count.toLocaleString()} · {pct.toFixed(pct < 10 ? 1 : 0)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[color:var(--accent)]"
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            </li>
          );
        })}
    </ul>
  );
}

function SessionRowItem({ session }: { session: SessionRow }) {
  const effectiveStatus = (session.wahaStatus ?? session.status ?? "UNKNOWN").toUpperCase();
  const variant = STATUS_VARIANT[effectiveStatus] ?? "default";
  const isOrphan = !session.sellerId;

  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-muted/30">
      <div
        className="grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold ring-1 ring-inset"
        style={{
          background: "var(--accent-soft)",
          color: "var(--accent)",
          boxShadow:
            "inset 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent)",
        }}
      >
        <MessageSquare className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {isOrphan ? (
            <span className="truncate font-mono text-sm font-medium text-foreground">
              {session.name}
            </span>
          ) : (
            <a
              href={`${BASE_PATH}/sellers/${session.sellerId}`}
              className="truncate font-medium text-foreground hover:underline"
            >
              {session.sellerName ?? session.name}
            </a>
          )}
          <Badge variant={variant}>{effectiveStatus}</Badge>
          {session.connected && (
            <Badge variant="info" className="gap-1">
              <CheckCircle2 className="size-3" />
              Linked
            </Badge>
          )}
          {isOrphan && (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="size-3" />
              No DB row
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {session.sellerEmail && (
            <span>{session.sellerEmail}</span>
          )}
          {session.storeName && (
            <span className="flex items-center gap-1">
              <Store className="size-3" />
              {session.storeName}
            </span>
          )}
          {session.phoneNumber && (
            <span className="flex items-center gap-1">
              <Phone className="size-3" />
              {session.phoneNumber}
            </span>
          )}
          {session.pushName && <span>aka {session.pushName}</span>}
          <span className="font-mono text-[11px]">{session.name}</span>
          {session.updatedAt && (
            <span>updated {formatRelative(session.updatedAt)}</span>
          )}
        </div>
      </div>
    </li>
  );
}

function OverviewSkeleton() {
  return (
    <>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-7 w-32" />
        </div>
      </div>
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 shadow-sm">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-4 h-7 w-12" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </section>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-3 w-64" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-card p-2 shadow-sm">
        <ul className="divide-y">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function formatRelative(iso: string): string {
  try {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}
