"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Calculator,
  CircleDollarSign,
  Lightbulb,
  Loader2,
  Receipt,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatCard,
  Topbar,
  formatINR,
} from "@workspace/ui";
import { useUserStore } from "@/src/stores/user.store";
import { useT } from "@/src/i18n/useT";
import { env } from "@/src/config/env";
import type { Order, OrderListResponse } from "@/src/types/order";
import type { GrowthCard, GrowthCardPriority } from "@/src/types/growthCard";
import type { WhatsAppSessionStatus } from "@/src/types/whatsapp";

const DAY_MS = 24 * 60 * 60 * 1000;

const PRIORITY_TO_TIP: Record<GrowthCardPriority, "high" | "medium" | "low"> = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
};

interface KpiTotals {
  revenue: number;
  profit: number;
  count: number;
  margin: number;
}

function totalsFor(orders: Order[], fromMs: number, toMs: number): KpiTotals {
  let revenue = 0;
  let profit = 0;
  let count = 0;
  for (const o of orders) {
    const t = o.createdAt ? Date.parse(o.createdAt) : NaN;
    if (!Number.isFinite(t) || t < fromMs || t >= toMs) continue;
    revenue += Number(o.unitPrice ?? 0) * Number(o.quantity ?? 0);
    profit += Number(o.profit ?? 0);
    count += 1;
  }
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  return { revenue, profit, count, margin };
}

function pctDelta(curr: number, prev: number): { delta: string; direction: "up" | "down" } | undefined {
  if (prev <= 0) return curr > 0 ? { delta: "new", direction: "up" } : undefined;
  const change = ((curr - prev) / prev) * 100;
  if (!Number.isFinite(change)) return undefined;
  const sign = change >= 0 ? "+" : "";
  return {
    delta: `${sign}${change.toFixed(1)}%`,
    direction: change >= 0 ? "up" : "down",
  };
}

function ppDelta(curr: number, prev: number): { delta: string; direction: "up" | "down" } | undefined {
  if (!Number.isFinite(curr) || !Number.isFinite(prev)) return undefined;
  const change = curr - prev;
  const sign = change >= 0 ? "+" : "";
  return {
    delta: `${sign}${change.toFixed(1)}pp`,
    direction: change >= 0 ? "up" : "down",
  };
}

function dailySeries(orders: Order[]): { d: string; v: number; iso: string }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: { d: string; v: number; iso: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today.getTime() - i * DAY_MS);
    days.push({
      d: day.toLocaleDateString(undefined, { weekday: "short" }),
      iso: day.toISOString().slice(0, 10),
      v: 0,
    });
  }
  for (const o of orders) {
    const t = o.createdAt ? Date.parse(o.createdAt) : NaN;
    if (!Number.isFinite(t)) continue;
    const iso = new Date(t).toISOString().slice(0, 10);
    const slot = days.find((x) => x.iso === iso);
    if (!slot) continue;
    slot.v += Number(o.unitPrice ?? 0) * Number(o.quantity ?? 0);
  }
  return days;
}

function deriveHealthScore(totals: KpiTotals, prev: KpiTotals): number {
  // No analytics module yet — synthesize a 0–100 score from real KPIs so it
  // moves with the business instead of being a static fake.
  let score = 50;
  score += Math.max(-20, Math.min(20, (totals.margin - 15) * 1.2));
  if (prev.revenue > 0) {
    const growth = ((totals.revenue - prev.revenue) / prev.revenue) * 100;
    score += Math.max(-15, Math.min(20, growth / 3));
  } else if (totals.revenue > 0) {
    score += 10;
  }
  if (totals.count >= 10) score += 10;
  else if (totals.count >= 3) score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export default function Home() {
  const t = useT();
  const user = useUserStore((s) => s.user);
  const displayName = user?.name?.split(" ")[0] ?? "seller";

  const [orders, setOrders] = useState<Order[]>([]);
  const [tips, setTips] = useState<GrowthCard[]>([]);
  const [wa, setWa] = useState<WhatsAppSessionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState<7 | 30 | 90>(7);

  const storeSlug = (user?.publicToken ?? "").trim();
  const storeUrl = storeSlug
    ? `${(env.NEXT_PUBLIC_URL_USER ?? "").replace(/\/$/, "")}/user/${encodeURIComponent(storeSlug)}/store`
    : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Pull a wide page of recent orders for the dashboard; we filter client
      // side so KPIs, chart, and recent-orders strip all share one fetch.
      const ordersP = fetch("/api/orders?page=0&size=200", { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<OrderListResponse>) : null))
        .catch(() => null);
      const tipsP = fetch("/api/ai/growth-adviser/cards?status=ACTIVE", { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<GrowthCard[]>) : null))
        .catch(() => null);
      const waP = fetch("/api/whatsapp/status", { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<WhatsAppSessionStatus>) : null))
        .catch(() => null);

      const [ordersRes, tipsRes, waRes] = await Promise.all([ordersP, tipsP, waP]);
      if (cancelled) return;
      setOrders(ordersRes?.content ?? []);
      setTips(tipsRes ?? []);
      setWa(waRes);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { kpis, chart, recent } = useMemo(() => {
    const now = Date.now();
    const day0 = new Date();
    day0.setHours(0, 0, 0, 0);
    const todayStart = day0.getTime();
    const win30Start = todayStart - 30 * DAY_MS;
    const prev30Start = todayStart - 60 * DAY_MS;

    const curr = totalsFor(orders, win30Start, now);
    const prev = totalsFor(orders, prev30Start, win30Start);
    const health = deriveHealthScore(curr, prev);

    const cards = [
      {
        title: t("dashboard.kpiSales"),
        value: formatINR(curr.revenue),
        icon: <CircleDollarSign className="size-4" />,
        trend: pctDelta(curr.revenue, prev.revenue),
      },
      {
        title: t("dashboard.kpiOrders"),
        value: String(curr.count),
        icon: <ShoppingBag className="size-4" />,
        trend: pctDelta(curr.count, prev.count),
      },
      {
        title: t("dashboard.kpiMargin"),
        value: `${curr.margin.toFixed(1)}%`,
        icon: <TrendingUp className="size-4" />,
        trend: ppDelta(curr.margin, prev.margin),
        highlight: "text-[color:var(--accent)]",
      },
      {
        title: t("dashboard.kpiHealth"),
        value: `${health}/100`,
        icon: <Sparkles className="size-4" />,
        trend: undefined,
        highlight: "text-[color:var(--accent)]",
      },
    ];

    return {
      kpis: cards,
      chart: dailySeries(orders),
      recent: [...orders]
        .sort((a, b) => Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? ""))
        .slice(0, 3),
    };
  }, [orders, t]);

  const waConnected = wa?.connected === true || wa?.status === "WORKING";

  return (
    <>
      <Topbar
        title={t("dashboard.welcome", { name: displayName })}
        subtitle={t("dashboard.subtitle")}
        actions={
          <>
            <Badge variant="success">
              <span className="size-1.5 rounded-full bg-[color:var(--accent)]" />
              {t("common.shopOpen")}
            </Badge>
            {storeUrl ? (
              <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline">
                  {t("common.viewStore")}
                </Button>
              </a>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled
                title="Set a store name in Settings to enable your public store link"
              >
                {t("common.viewStore")}
              </Button>
            )}
          </>
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-3 sm:p-4 sm:gap-6 lg:p-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <StatCard key={k.title} {...k} />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>{t("dashboard.salesThisWeek")}</CardTitle>
                <CardDescription>{t("dashboard.salesDesc")}</CardDescription>
              </div>
              <div className="flex gap-1 text-xs">
                {([7, 30, 90] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setChartRange(p)}
                    className={`rounded-md px-2.5 py-1 transition ${
                      chartRange === p
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
              <SalesChart loading={loading} data={chart} range={chartRange} orders={orders} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>{t("dashboard.aiAdvisor")}</CardTitle>
                <CardDescription>
                  {tips.length > 0
                    ? t("dashboard.aiAdvisorDesc")
                    : t("dashboard.subtitle")}
                </CardDescription>
              </div>
              <Lightbulb className="size-4 text-[color:var(--accent)]" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {loading ? (
                <SkeletonLines n={3} />
              ) : tips.length > 0 ? (
                tips.slice(0, 3).map((c) => (
                  <Tip
                    key={c.id}
                    priority={PRIORITY_TO_TIP[c.priority] ?? "low"}
                    title={c.title}
                    hint={c.description}
                  />
                ))
              ) : (
                <>
                  <Tip
                    priority="high"
                    title={t("dashboard.tip1Title")}
                    hint={t("dashboard.tip1Hint")}
                  />
                  <Tip
                    priority="high"
                    title={t("dashboard.tip2Title")}
                    hint={t("dashboard.tip2Hint")}
                  />
                  <Tip
                    priority="medium"
                    title={t("dashboard.tip3Title")}
                    hint={t("dashboard.tip3Hint")}
                  />
                </>
              )}
              <a
                href="/suggestions"
                className="mt-1 inline-flex items-center gap-1 text-xs text-[color:var(--accent)] hover:text-[color:var(--accent)]"
              >
                {t("dashboard.seeAll")} <ArrowRight className="size-3" />
              </a>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <QuickAction
            href="/pricing"
            icon={<Calculator className="size-5" />}
            title={t("dashboard.qaPricingTitle")}
            text={t("dashboard.qaPricingDesc")}
          />
          <QuickAction
            href="/profit"
            icon={<TrendingUp className="size-5" />}
            title={t("dashboard.qaProfitTitle")}
            text={t("dashboard.qaProfitDesc")}
          />
          <QuickAction
            href="/suggestions"
            icon={<Lightbulb className="size-5" />}
            title={t("dashboard.qaGrowthTitle")}
            text={t("dashboard.qaGrowthDesc")}
          />
        </section>

        <section className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>{t("orders.title")}</CardTitle>
                <CardDescription>{t("dashboard.subtitle")}</CardDescription>
              </div>
              <Badge variant={waConnected ? "success" : "default"}>
                {waConnected
                  ? t("dashboard.connected")
                  : t("common.loading")}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-[color:var(--border)] p-0">
              {loading ? (
                <div className="grid place-items-center py-10">
                  <Loader2 className="size-5 animate-spin text-[color:var(--accent)]" />
                </div>
              ) : recent.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <div className="grid size-10 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                    <Receipt className="size-4" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("orders.empty")}
                  </p>
                </div>
              ) : (
                recent.map((o) => (
                  <a
                    key={o.id}
                    href={`/orders/${o.id}`}
                    className="flex flex-col gap-1 p-4 text-left transition hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-sm font-medium">
                        <Receipt className="size-3.5 text-[color:var(--accent)]" />
                        {o.customerName || o.orderNo || `#${o.id}`}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatINR(Number(o.unitPrice ?? 0) * Number(o.quantity ?? 0))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="line-clamp-1">
                        {o.product?.Name ?? "—"} × {o.quantity}
                      </span>
                      <span>{relativeAge(o.createdAt)}</span>
                    </div>
                  </a>
                ))
              )}
              <a
                href="/orders"
                className="flex items-center justify-center gap-1 p-3 text-xs text-[color:var(--accent)] hover:bg-muted/40"
              >
                {t("common.viewAll")} <ArrowRight className="size-3" />
              </a>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}

function relativeAge(iso: string | undefined): string {
  if (!iso) return "";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
}

function Tip({
  priority,
  title,
  hint,
}: {
  priority: "high" | "medium" | "low";
  title: string;
  hint: string;
}) {
  const color =
    priority === "high"
      ? "border-l-red-500/70"
      : priority === "medium"
        ? "border-l-amber-500/70"
        : "border-l-[color:var(--border)]";
  return (
    <div className={`rounded-md border-l-2 ${color} bg-muted/40 px-3 py-2`}>
      <div className="text-sm font-medium">{title}</div>
      <p className="line-clamp-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function SkeletonLines({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-md bg-muted/40 px-3 py-2">
          <div className="h-3 w-32 rounded bg-muted" />
          <div className="mt-2 h-2 w-48 rounded bg-muted" />
        </div>
      ))}
    </>
  );
}

function QuickAction({
  href,
  icon,
  title,
  text,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <a
      href={href}
      className="group flex items-start gap-3 rounded-xl border bg-card p-5 transition hover:border-[color:var(--accent)]/40"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-[color:var(--accent)]" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </a>
  );
}

function SalesChart({
  loading,
  data,
  range,
  orders,
}: {
  loading: boolean;
  data: { d: string; v: number; iso: string }[];
  range: 7 | 30 | 90;
  orders: Order[];
}) {
  const series = useMemo(() => {
    if (range === 7) return data;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { d: string; v: number; iso: string }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const day = new Date(today.getTime() - i * DAY_MS);
      days.push({
        d: day.toLocaleDateString(undefined, { day: "2-digit" }),
        iso: day.toISOString().slice(0, 10),
        v: 0,
      });
    }
    for (const o of orders) {
      const t = o.createdAt ? Date.parse(o.createdAt) : NaN;
      if (!Number.isFinite(t)) continue;
      const iso = new Date(t).toISOString().slice(0, 10);
      const slot = days.find((x) => x.iso === iso);
      if (!slot) continue;
      slot.v += Number(o.unitPrice ?? 0) * Number(o.quantity ?? 0);
    }
    // 30/90 day windows get too crowded with one bar per day — bucket into ~7 stripes.
    const bucketSize = Math.ceil(days.length / 7);
    const buckets: { d: string; v: number; iso: string }[] = [];
    for (let i = 0; i < days.length; i += bucketSize) {
      const slice = days.slice(i, i + bucketSize);
      const first = slice[0]!;
      const last = slice[slice.length - 1]!;
      buckets.push({
        d: `${first.d}–${last.d}`,
        iso: first.iso,
        v: slice.reduce((s, x) => s + x.v, 0),
      });
    }
    return buckets;
  }, [range, data, orders]);

  if (loading) {
    return (
      <div className="grid h-48 place-items-center">
        <Loader2 className="size-5 animate-spin text-[color:var(--accent)]" />
      </div>
    );
  }

  const max = Math.max(1, ...series.map((d) => d.v));
  const peakIndex = series.reduce((best, x, i, arr) => (x.v > arr[best]!.v ? i : best), 0);
  const total = series.reduce((s, x) => s + x.v, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-muted-foreground">
        Total <span className="font-semibold text-foreground tabular-nums">{formatINR(total)}</span>
      </div>
      <div className="flex h-48 items-end gap-3">
        {series.map((d, i) => (
          <div key={`${d.iso}-${i}`} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end">
              <div
                className={`w-full rounded-t-md transition ${
                  i === peakIndex
                    ? "bg-[color:var(--accent)]"
                    : "bg-[color:var(--accent)]/30 hover:bg-[color:var(--accent-soft)]"
                }`}
                style={{ height: `${(d.v / max) * 100}%`, minHeight: d.v > 0 ? "2px" : 0 }}
                title={formatINR(d.v)}
              />
            </div>
            <div className="text-[11px] text-muted-foreground">{d.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
