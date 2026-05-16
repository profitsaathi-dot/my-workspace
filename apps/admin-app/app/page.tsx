"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleDollarSign,
  Loader2,
  RefreshCcw,
  ShoppingBag,
  Sparkles,
  Store,
  Users as UsersIcon,
  Wallet,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  StatCard,
  Topbar,
  formatINR,
} from "@workspace/ui";
import Link from "next/link";
import { BASE_PATH } from "@/lib/env";

interface Totals {
  activeSellers: number;
  totalSellers: number;
  newSellersInWindow: number;
  ordersInWindow: number;
  gmvInWindow: number;
  averageOrderValue: number;
}

interface DailyGmv {
  date: string;
  value: number;
}

interface TopSeller {
  sellerId: number;
  name: string;
  email?: string | null;
  storeName?: string | null;
  status?: string | null;
  orders: number;
  gmv: number;
}

interface Dashboard {
  windowDays: number;
  totals: Totals;
  gmvByDay: DailyGmv[];
  topSellers: TopSeller[];
}

const WINDOWS = [7, 30, 90] as const;

const STATUS_VARIANT: Record<
  string,
  "success" | "default" | "warning" | "danger"
> = {
  ACTIVE: "success",
  INACTIVE: "default",
  SUSPENDED: "warning",
  BLOCKED: "danger",
};

export default function DashboardPage() {
  const [windowDays, setWindowDays] = useState<(typeof WINDOWS)[number]>(30);
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(
        `${BASE_PATH}/api/admin/stats/dashboard`,
        window.location.origin,
      );
      url.searchParams.set("days", String(windowDays));
      const res = await fetch(url.toString(), { cache: "no-store" });
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
      setData((await res.json()) as Dashboard);
    } catch (e) {
      setError((e as Error).message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [windowDays]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Topbar
        title="Platform overview"
        subtitle={`Last ${windowDays} days · live data`}
        actions={
          <>
            <Link href={`${BASE_PATH}/system-status`}>
              <Button size="sm" variant="outline">
                <Sparkles className="size-3.5" />
                System status
              </Button>
            </Link>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="size-3.5" />
              )}
              Refresh
            </Button>
          </>
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-3 sm:p-4 sm:gap-6 lg:p-6">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loading && !data ? (
          <DashboardSkeleton />
        ) : data ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title={`GMV (${data.windowDays}d)`}
                value={formatINR(data.totals.gmvInWindow)}
                icon={
                  <CircleDollarSign className="size-4 text-[color:var(--accent)]" />
                }
                hint={`${data.totals.ordersInWindow.toLocaleString()} orders`}
                highlight="text-[color:var(--accent)]"
              />
              <StatCard
                title="Avg order value"
                value={formatINR(data.totals.averageOrderValue)}
                icon={<Wallet className="size-4 text-[color:var(--accent)]" />}
                hint={
                  data.totals.ordersInWindow > 0
                    ? "Across all orders in window"
                    : "—"
                }
              />
              <StatCard
                title="Active sellers"
                value={data.totals.activeSellers.toLocaleString()}
                icon={<Store className="size-4 text-[color:var(--accent)]" />}
                hint={`${data.totals.totalSellers.toLocaleString()} total`}
              />
              <StatCard
                title="New sellers"
                value={data.totals.newSellersInWindow.toLocaleString()}
                icon={<UsersIcon className="size-4 text-[color:var(--accent)]" />}
                hint={`Joined in last ${data.windowDays} days`}
              />
            </section>

            <Card>
              <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle>GMV trend</CardTitle>
                  <CardDescription>
                    Daily gross merchandise value · ₹ on hover
                  </CardDescription>
                </div>
                <div className="flex gap-1 text-xs">
                  {WINDOWS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setWindowDays(p)}
                      className={`rounded-md px-2.5 py-1 transition ${
                        windowDays === p
                          ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/30"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {p}d
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <GmvChart points={data.gmvByDay} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle>Top sellers by GMV</CardTitle>
                  <CardDescription>
                    Top {data.topSellers.length} of {data.totals.totalSellers} ·
                    last {data.windowDays} days
                  </CardDescription>
                </div>
                <Link href={`${BASE_PATH}/sellers`}>
                  <Button size="sm" variant="outline">
                    View all
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {data.topSellers.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <ShoppingBag className="size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No orders in this window yet.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">Seller</th>
                          <th className="px-4 py-3 font-medium">Store</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 text-right font-medium tabular-nums">
                            Orders
                          </th>
                          <th className="px-4 py-3 text-right font-medium tabular-nums">
                            GMV
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--border)]">
                        {data.topSellers.map((s) => (
                          <tr
                            key={s.sellerId}
                            className="transition hover:bg-muted/40"
                          >
                            <td className="px-4 py-3">
                              <Link
                                href={`${BASE_PATH}/sellers/${s.sellerId}`}
                                className="font-medium hover:underline"
                              >
                                {s.name}
                              </Link>
                              {s.email && (
                                <div className="text-xs text-muted-foreground">
                                  {s.email}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {s.storeName ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                              {s.status ? (
                                <Badge
                                  variant={STATUS_VARIANT[s.status] ?? "default"}
                                >
                                  {s.status[0] +
                                    s.status.slice(1).toLowerCase()}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {s.orders.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-medium tabular-nums">
                              {formatINR(s.gmv)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </>
  );
}

function GmvChart({ points }: { points: DailyGmv[] }) {
  const numbers = points.map((p) => p.value);
  const max = Math.max(0, ...numbers);
  const total = numbers.reduce((sum, n) => sum + n, 0);

  if (points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No GMV data for this window.</p>
    );
  }

  return (
    <div>
      <div className="flex h-44 items-end gap-1">
        {points.map((p) => {
          const heightPct = max > 0 ? (p.value / max) * 100 : 0;
          return (
            <div
              key={p.date}
              className="group relative flex-1"
              title={`${p.date}: ${formatINR(p.value)}`}
            >
              <div
                className="w-full rounded-t-sm transition group-hover:opacity-80"
                style={{
                  height: `${Math.max(heightPct, p.value > 0 ? 4 : 1)}%`,
                  background:
                    p.value > 0
                      ? "linear-gradient(to top, color-mix(in srgb, var(--accent) 75%, transparent), var(--accent))"
                      : "color-mix(in srgb, var(--muted-foreground) 20%, transparent)",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {points[0]?.date} → {points[points.length - 1]?.date}
        </span>
        <span>
          Window total: <span className="font-medium text-foreground">{formatINR(total)}</span>
        </span>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 shadow-sm">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-4 h-7 w-28" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </section>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-7 w-32" />
        </div>
        <Skeleton className="mt-4 h-44 w-full" />
      </div>
      <div className="rounded-xl border bg-card p-2 shadow-sm">
        <ul className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
