"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Heart,
  Loader2,
  Package,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatCard,
  Topbar,
  calculateProfitHealth,
  formatINR,
} from "@workspace/ui";
import { useT } from "@/src/i18n/useT";
import type { Order, OrderListResponse } from "@/src/types/order";
import type { GrowthCard } from "@/src/types/growthCard";
import type { SalesSummaryDashboard } from "@/src/types/salesSummary";

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface PeriodTotals {
  revenue: number;
  cogs: number;
  profit: number;
  orderCount: number;
  margin: number;
}

function emptyTotals(): PeriodTotals {
  return { revenue: 0, cogs: 0, profit: 0, orderCount: 0, margin: 0 };
}

function totalsForMonth(
  orders: Order[],
  year: number,
  month: number
): PeriodTotals {
  const t = emptyTotals();
  for (const o of orders) {
    const ts = o.createdAt ? Date.parse(o.createdAt) : NaN;
    if (!Number.isFinite(ts)) continue;
    const d = new Date(ts);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const rev = Number(o.unitPrice ?? 0) * Number(o.quantity ?? 0);
    const prof = Number(o.profit ?? 0);
    t.revenue += rev;
    t.profit += prof;
    t.cogs += rev - prof;
    t.orderCount += 1;
  }
  t.margin = t.revenue > 0 ? (t.profit / t.revenue) * 100 : 0;
  return t;
}

function pctDelta(curr: number, prev: number) {
  if (prev <= 0)
    return curr > 0
      ? { label: "new", direction: "up" as const }
      : null;
  const pct = ((curr - prev) / prev) * 100;
  if (!Number.isFinite(pct)) return null;
  return {
    label: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
    direction: pct >= 0 ? ("up" as const) : ("down" as const),
  };
}

function ppDelta(curr: number, prev: number) {
  const diff = curr - prev;
  if (!Number.isFinite(diff)) return null;
  return {
    label: `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}pp`,
    direction: diff >= 0 ? ("up" as const) : ("down" as const),
  };
}

function monthOffset(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function buildTrend(orders: Order[], year: number, month: number, n: number) {
  const points = [];
  for (let i = n - 1; i >= 0; i--) {
    const { year: y, month: m } = monthOffset(year, month, -i);
    const totals = totalsForMonth(orders, y, m);
    points.push({
      label: MONTHS_SHORT[m] + (m === 0 || i === n - 1 ? ` ${String(y).slice(-2)}` : ""),
      year: y,
      month: m,
      ...totals,
    });
  }
  return points;
}

function topProducts(orders: Order[], year: number, month: number, n = 5) {
  const byProduct = new Map<
    string,
    { name: string; revenue: number; profit: number; units: number }
  >();
  for (const o of orders) {
    const ts = o.createdAt ? Date.parse(o.createdAt) : NaN;
    if (!Number.isFinite(ts)) continue;
    const d = new Date(ts);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const key = o.product?.Id ?? o.product?.Name ?? `#${o.id}`;
    const existing = byProduct.get(key) ?? {
      name: o.product?.Name ?? "—",
      revenue: 0,
      profit: 0,
      units: 0,
    };
    existing.revenue += Number(o.unitPrice ?? 0) * Number(o.quantity ?? 0);
    existing.profit += Number(o.profit ?? 0);
    existing.units += Number(o.quantity ?? 0);
    byProduct.set(key, existing);
  }
  return [...byProduct.values()]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, n);
}

export default function ProfitPage() {
  const t = useT();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [orders, setOrders] = useState<Order[]>([]);
  const [tips, setTips] = useState<GrowthCard[]>([]);
  const [allTime, setAllTime] = useState<SalesSummaryDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ordersP = fetch("/api/orders?page=0&size=500", { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<OrderListResponse>) : null))
        .catch(() => null);
      const tipsP = fetch("/api/ai/growth-adviser/cards?status=ACTIVE", { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<GrowthCard[]>) : null))
        .catch(() => null);
      const allTimeP = fetch("/api/sales-summary/dashboard", { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<SalesSummaryDashboard>) : null))
        .catch(() => null);
      const [ordersRes, tipsRes, allTimeRes] = await Promise.all([
        ordersP,
        tipsP,
        allTimeP,
      ]);
      if (cancelled) return;
      setOrders(ordersRes?.content ?? []);
      setTips(tipsRes ?? []);
      setAllTime(allTimeRes);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = useMemo(
    () => totalsForMonth(orders, year, month),
    [orders, year, month]
  );
  const previous = useMemo(() => {
    const { year: py, month: pm } = monthOffset(year, month, -1);
    return totalsForMonth(orders, py, pm);
  }, [orders, year, month]);

  const trend = useMemo(() => buildTrend(orders, year, month, 6), [
    orders,
    year,
    month,
  ]);
  const top = useMemo(() => topProducts(orders, year, month, 5), [
    orders,
    year,
    month,
  ]);

  const health = useMemo(
    () =>
      calculateProfitHealth({
        totalSales: current.revenue,
        totalExpenses: current.cogs,
      }),
    [current]
  );

  const financialTips = useMemo(
    () =>
      tips.filter(
        (c) => c.type === "FINANCE" || c.type === "PRICING" || c.type === "INVENTORY"
      ),
    [tips]
  );

  const ratingTone =
    health.rating === "Excellent" || health.rating === "Healthy"
      ? "text-[color:var(--accent)]"
      : health.rating === "Needs work"
        ? "text-amber-400"
        : "text-red-400";

  const yearOptions = useMemo(() => {
    const ys = new Set<number>();
    for (const o of orders) {
      const ts = o.createdAt ? Date.parse(o.createdAt) : NaN;
      if (Number.isFinite(ts)) ys.add(new Date(ts).getFullYear());
    }
    ys.add(now.getFullYear());
    return [...ys].sort((a, b) => b - a);
  }, [orders, now]);

  return (
    <>
      <Topbar
        title={t("profit.title")}
        subtitle={t("profit.subtitle")}
        actions={
          <div className="flex gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-8 rounded-md border bg-muted/60 px-2 text-xs text-foreground"
            >
              {MONTHS_SHORT.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-8 rounded-md border bg-muted/60 px-2 text-xs text-foreground"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-3 sm:p-4 sm:gap-6 lg:p-6">
        {loading ? (
          <div className="grid place-items-center py-24">
            <Loader2 className="size-6 animate-spin text-[color:var(--accent)]" />
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
              <KpiCard
                title={t("profit.revenue")}
                value={formatINR(current.revenue)}
                icon={<CircleDollarSign className="size-4" />}
                delta={pctDelta(current.revenue, previous.revenue)}
                hint={`${MONTHS_SHORT[month]} ${year}`}
              />
              <KpiCard
                title={t("profit.cogs")}
                value={formatINR(current.cogs)}
                icon={<Activity className="size-4" />}
                delta={pctDelta(current.cogs, previous.cogs)}
                invertDelta
                hint={t("profit.cogsHint")}
              />
              <KpiCard
                title={t("profit.netProfit")}
                value={formatINR(current.profit)}
                icon={<TrendingUp className="size-4" />}
                delta={pctDelta(current.profit, previous.profit)}
                highlight={current.profit >= 0}
              />
              <KpiCard
                title={t("profit.margin")}
                value={`${current.margin.toFixed(1)}%`}
                icon={<ArrowDownRight className="size-4" />}
                delta={ppDelta(current.margin, previous.margin)}
                highlight={current.margin >= 15}
              />
              <KpiCard
                title={t("orders.title")}
                value={String(current.orderCount)}
                icon={<Receipt className="size-4" />}
                delta={pctDelta(current.orderCount, previous.orderCount)}
                hint={
                  current.orderCount > 0
                    ? `AOV ${formatINR(
                        Math.round(current.revenue / current.orderCount)
                      )}`
                    : undefined
                }
              />
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>{t("profit.healthScore")}</CardTitle>
                  <CardDescription>{t("profit.healthScoreDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-3">
                  <HealthGauge score={health.healthScore} />
                  <div className="text-center">
                    <div className={`text-3xl font-semibold tabular-nums ${ratingTone}`}>
                      {health.healthScore}
                      <span className="text-base text-muted-foreground">/100</span>
                    </div>
                    <div className={`mt-1 text-sm font-medium ${ratingTone}`}>
                      {health.rating}
                    </div>
                  </div>
                  <FlowBar
                    revenue={current.revenue}
                    cogs={current.cogs}
                    profit={current.profit}
                  />
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="flex-row items-start justify-between">
                  <div>
                    <CardTitle>{t("profit.trendTitle")}</CardTitle>
                    <CardDescription>{t("profit.trendDesc")}</CardDescription>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <LegendDot color="bg-[color:var(--accent)]/30" label={t("profit.revenue")} />
                    <LegendDot color="bg-[color:var(--accent)]" label={t("profit.netProfit")} />
                  </div>
                </CardHeader>
                <CardContent>
                  <TrendChart points={trend} />
                </CardContent>
              </Card>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>{t("profit.topProducts")}</CardTitle>
                  <CardDescription>{t("profit.topProductsDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {top.length === 0 ? (
                    <EmptyHint text={t("profit.noProductsThisMonth")} />
                  ) : (
                    <TopProducts items={top} totalProfit={current.profit} />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="size-4 text-[color:var(--accent)]" />
                      {t("profit.aiSuggestions")}
                    </CardTitle>
                    <CardDescription>
                      {financialTips.length > 0
                        ? t("profit.aiSuggestionsDesc")
                        : t("profit.aiSuggestionsFallback")}
                    </CardDescription>
                  </div>
                  <Badge variant="default">
                    {financialTips.length > 0
                      ? t("profit.aiLive")
                      : t("profit.aiHeuristic")}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {(financialTips.length > 0
                    ? financialTips.slice(0, 4).map((c) => c.description)
                    : health.suggestions
                  ).map((s, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm"
                    >
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[color:var(--accent-soft)] text-xs font-semibold text-[color:var(--accent)]">
                        {i + 1}
                      </span>
                      <p className="text-foreground">{s}</p>
                    </div>
                  ))}
                  {financialTips.length > 0 && (
                    <a
                      href="/suggestions"
                      className="text-xs text-[color:var(--accent)] hover:underline"
                    >
                      {t("dashboard.seeAll")}
                    </a>
                  )}
                </CardContent>
              </Card>
            </section>

            {allTime && (allTime.totalSales > 0 || allTime.totalProducts > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("profit.allTimeTitle")}</CardTitle>
                  <CardDescription>{t("profit.allTimeDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <StatCard
                    title={t("profit.revenue")}
                    value={formatINR(allTime.totalSales)}
                    icon={<CircleDollarSign className="size-4" />}
                  />
                  <StatCard
                    title={t("profit.cogs")}
                    value={formatINR(allTime.totalExpenses)}
                    icon={<Activity className="size-4" />}
                  />
                  <StatCard
                    title={t("profit.netProfit")}
                    value={formatINR(allTime.netProfit)}
                    icon={<TrendingUp className="size-4" />}
                    highlight={
                      allTime.netProfit >= 0
                        ? "text-[color:var(--accent)]"
                        : "text-red-400"
                    }
                  />
                  <StatCard
                    title={t("profit.products")}
                    value={String(allTime.totalProducts)}
                    icon={<Package className="size-4" />}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </>
  );
}

function KpiCard({
  title,
  value,
  icon,
  delta,
  hint,
  highlight,
  invertDelta,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  delta: { label: string; direction: "up" | "down" } | null;
  hint?: string;
  highlight?: boolean;
  invertDelta?: boolean;
}) {
  const dirIsGood = delta
    ? invertDelta
      ? delta.direction === "down"
      : delta.direction === "up"
    : false;
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition hover:border-[color:var(--accent)]/40">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="uppercase tracking-wide">{title}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p
        className={`mt-3 text-2xl font-semibold tabular-nums ${
          highlight ? "text-[color:var(--accent)]" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <div className="mt-1 flex items-center justify-between text-xs">
        {delta ? (
          <span
            className={`inline-flex items-center gap-0.5 font-medium ${
              dirIsGood ? "text-emerald-500" : "text-red-400"
            }`}
          >
            {delta.direction === "up" ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {delta.label}
          </span>
        ) : (
          <span />
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

function HealthGauge({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const radius = 56;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative size-36">
      <svg viewBox="0 0 140 140" className="size-full -rotate-90">
        <circle cx="70" cy="70" r={radius} stroke="#27272a" strokeWidth="10" fill="none" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <Heart className="size-5 text-[color:var(--accent)]" fill="currentColor" />
      </div>
    </div>
  );
}

function FlowBar({
  revenue,
  cogs,
  profit,
}: {
  revenue: number;
  cogs: number;
  profit: number;
}) {
  const t = useT();
  const denom = Math.max(1, revenue);
  const cogsPct = Math.min(100, (Math.max(0, cogs) / denom) * 100);
  const profitPct = Math.max(0, 100 - cogsPct);
  return (
    <div className="w-full">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="bg-red-500/70"
          style={{ width: `${cogsPct}%` }}
          title={`${t("profit.cogs")} · ${formatINR(cogs)}`}
        />
        <div
          className="bg-[color:var(--accent)]/80"
          style={{ width: `${profitPct}%` }}
          title={`${t("profit.netProfit")} · ${formatINR(profit)}`}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>
          {t("profit.cogs")} · {cogsPct.toFixed(0)}%
        </span>
        <span className="text-[color:var(--accent)]">
          {t("profit.netProfit")} · {profitPct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function TrendChart({
  points,
}: {
  points: { label: string; revenue: number; profit: number }[];
}) {
  const t = useT();
  const max = Math.max(1, ...points.map((p) => p.revenue));
  const total = points.reduce((s, p) => s + p.revenue, 0);
  const totalProfit = points.reduce((s, p) => s + p.profit, 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {t("profit.sixMoRevenue")}{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatINR(total)}
          </span>
        </span>
        <span>
          {t("profit.sixMoProfit")}{" "}
          <span
            className={`font-semibold tabular-nums ${
              totalProfit >= 0 ? "text-[color:var(--accent)]" : "text-red-400"
            }`}
          >
            {formatINR(totalProfit)}
          </span>
        </span>
      </div>
      <div className="flex h-48 items-end gap-3">
        {points.map((p, i) => {
          const revH = (p.revenue / max) * 100;
          const profH = (Math.max(0, p.profit) / max) * 100;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="relative flex w-full flex-1 items-end">
                <div
                  className="absolute inset-x-0 bottom-0 rounded-t-md bg-[color:var(--accent)]/30 transition"
                  style={{ height: `${revH}%`, minHeight: p.revenue > 0 ? "2px" : 0 }}
                  title={`${p.label} · ${t("profit.revenue")} ${formatINR(p.revenue)}`}
                />
                <div
                  className="absolute inset-x-2 bottom-0 rounded-t-md bg-[color:var(--accent)] transition"
                  style={{ height: `${profH}%`, minHeight: p.profit > 0 ? "2px" : 0 }}
                  title={`${p.label} · ${t("profit.netProfit")} ${formatINR(p.profit)}`}
                />
              </div>
              <div className="text-[11px] text-muted-foreground">{p.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopProducts({
  items,
  totalProfit,
}: {
  items: { name: string; revenue: number; profit: number; units: number }[];
  totalProfit: number;
}) {
  const t = useT();
  const denom = Math.max(1, totalProfit, ...items.map((i) => i.profit));
  return (
    <ul className="flex flex-col gap-3">
      {items.map((p, i) => {
        const share = totalProfit > 0 ? (p.profit / totalProfit) * 100 : 0;
        const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
        return (
          <li key={p.name + i} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[color:var(--accent-soft)] text-xs font-semibold text-[color:var(--accent)]">
                  {i + 1}
                </span>
                <span className="truncate text-sm font-medium">{p.name}</span>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold tabular-nums text-[color:var(--accent)]">
                  {formatINR(p.profit)}
                </div>
                <div className="text-[11px] text-muted-foreground tabular-nums">
                  {margin.toFixed(0)}% · {p.units} {t("profit.units")}
                </div>
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[color:var(--accent)] transition"
                style={{ width: `${Math.min(100, (p.profit / denom) * 100)}%` }}
              />
            </div>
            {totalProfit > 0 && (
              <div className="text-[11px] text-muted-foreground tabular-nums">
                {share.toFixed(0)}% {t("profit.ofProfit")}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className={`size-2.5 rounded-sm ${color}`} />
      {label}
    </span>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="grid place-items-center py-10 text-center">
      <div className="grid size-10 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
        <Receipt className="size-4" />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
