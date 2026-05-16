"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  StatCard,
  Topbar,
} from "@workspace/ui";
import { BASE_PATH } from "@/lib/env";

interface UserStats {
  total: number;
  sellers: number;
  customers: number;
  admins: number;
}

export default function UsersPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/admin/stats/users`, {
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
      setStats((await res.json()) as UserStats);
    } catch (e) {
      setError((e as Error).message || "Failed to load user stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Topbar
        title="Users"
        subtitle="Headcount across sellers, customers, and admins"
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

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : stats ? (
            <>
              <StatCard
                title="Total users"
                value={stats.total.toLocaleString()}
                icon={<Users className="size-4 text-[color:var(--accent)]" />}
                hint="All roles combined"
              />
              <StatCard
                title="Sellers"
                value={stats.sellers.toLocaleString()}
                icon={<Store className="size-4 text-[color:var(--accent)]" />}
                hint={pct(stats.sellers, stats.total)}
              />
              <StatCard
                title="Customers"
                value={stats.customers.toLocaleString()}
                icon={
                  <ShoppingBag className="size-4 text-[color:var(--accent)]" />
                }
                hint={pct(stats.customers, stats.total)}
              />
              <StatCard
                title="Admins"
                value={stats.admins.toLocaleString()}
                icon={
                  <ShieldCheck className="size-4 text-[color:var(--accent)]" />
                }
                hint={pct(stats.admins, stats.total)}
              />
            </>
          ) : null}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Breakdown</CardTitle>
            <CardDescription>
              Drill into each role for management and history.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <BreakdownLink
              href={`${BASE_PATH}/sellers`}
              icon={<Store className="size-4 text-[color:var(--accent)]" />}
              title="Sellers"
              hint="Manage profiles, status, and onboarding."
            />
            <BreakdownLink
              href={`${BASE_PATH}/customers`}
              icon={
                <ShoppingBag className="size-4 text-[color:var(--accent)]" />
              }
              title="Customers"
              hint="Browse customers, edit profile + notification settings."
            />
            <BreakdownLink
              href={`${BASE_PATH}/admins`}
              icon={
                <ShieldCheck className="size-4 text-[color:var(--accent)]" />
              }
              title="Admins"
              hint="Manage other admin accounts. Self-edit guarded."
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function BreakdownLink({
  href,
  icon,
  title,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <a
      href={href}
      className="rounded-lg border bg-muted/40 p-4 text-sm transition hover:border-[color:var(--accent)]/40 hover:bg-muted"
    >
      <div className="flex items-center gap-2 font-medium">
        {icon}
        {title}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </a>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="size-4 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-7 w-16" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}

function pct(part: number, total: number): string {
  if (total <= 0) return "—";
  const p = (part / total) * 100;
  return `${p.toFixed(p < 10 ? 1 : 0)}% of total`;
}
