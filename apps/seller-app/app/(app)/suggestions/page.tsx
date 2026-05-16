"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  Banknote,
  Boxes,
  CheckCircle2,
  Crown,
  Loader2,
  MessageSquare,
  Package,
  RefreshCw,
  Settings as SettingsIcon,
  Sparkles,
  Tag,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Topbar,
  buttonVariants,
} from "@workspace/ui";
import { useUserStore } from "@/src/stores/user.store";
import { useT } from "@/src/i18n/useT";
import type {
  GrowthCard,
  GrowthCardClientStatus,
  GrowthCardPriority,
  GrowthCardType,
  GrowthSyncStatus,
} from "@/src/types/growthCard";

type TypeMeta = { icon: React.ReactNode; tone: string };

const TYPE_META: Record<GrowthCardType, TypeMeta> = {
  PRICING: { icon: <Tag className="size-4" />, tone: "text-[color:var(--accent)] bg-[color:var(--accent-soft)] ring-[color:var(--accent)]/30" },
  INVENTORY: { icon: <Package className="size-4" />, tone: "text-sky-400 bg-sky-500/10 ring-sky-500/30" },
  MARKETING: { icon: <MessageSquare className="size-4" />, tone: "text-violet-400 bg-violet-500/10 ring-violet-500/30" },
  CRM: { icon: <Users className="size-4" />, tone: "text-amber-400 bg-amber-500/10 ring-amber-500/30" },
  FESTIVAL: { icon: <BadgePercent className="size-4" />, tone: "text-rose-400 bg-rose-500/10 ring-rose-500/30" },
  FINANCE: { icon: <Banknote className="size-4" />, tone: "text-emerald-400 bg-emerald-500/10 ring-emerald-500/30" },
  OPERATIONS: { icon: <Boxes className="size-4" />, tone: "text-slate-400 bg-slate-500/10 ring-slate-500/30" },
};

const PRIORITY_VARIANT: Record<GrowthCardPriority, "danger" | "warning" | "default"> = {
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "default",
};

function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s === 0) return "0m";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function formatRelativeTime(iso: string | null, t: ReturnType<typeof useT>): string {
  if (!iso) return t("suggestions.never");
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return t("suggestions.never");
  const diff = Math.floor((Date.now() - then) / 1000);
  if (diff < 60) return t("suggestions.justNow");
  if (diff < 3600) return t("suggestions.minutesAgo", { n: Math.floor(diff / 60) });
  if (diff < 86400) return t("suggestions.hoursAgo", { n: Math.floor(diff / 3600) });
  return t("suggestions.daysAgo", { n: Math.floor(diff / 86400) });
}

export default function SuggestionsPage() {
  const t = useT();
  const user = useUserStore((s) => s.user);
  const isPremium = user?.subscription === "Premium";

  const [cards, setCards] = useState<GrowthCard[]>([]);
  const [status, setStatus] = useState<GrowthSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | GrowthCardType>("ALL");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, statusRes] = await Promise.all([
        fetch("/api/ai/growth-adviser/cards?status=ACTIVE"),
        fetch("/api/ai/growth-adviser/status"),
      ]);
      if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);
      if (!statusRes.ok) throw new Error(`HTTP ${statusRes.status}`);
      setCards(((await listRes.json()) as GrowthCard[]) ?? []);
      const s = (await statusRes.json()) as GrowthSyncStatus;
      setStatus(s);
      setCooldown(s.cooldownSecondsRemaining ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("suggestions.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Tick the cooldown countdown every second so the "Sync available in 4h"
  // badge stays accurate without polling the server.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const onSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/growth-adviser/sync", { method: "POST" });
      if (res.status === 429) {
        const body = (await res.json().catch(() => ({}))) as {
          retryAfterSeconds?: number;
          message?: string;
        };
        setCooldown(body.retryAfterSeconds ?? 0);
        setError(body.message ?? t("suggestions.cooldownActive"));
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
      }
      // Server returned a fresh batch; reload the list and status.
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("suggestions.errorGeneric"));
    } finally {
      setSyncing(false);
    }
  }, [refresh, syncing, t]);

  const onAct = useCallback(
    async (id: number, action: GrowthCardClientStatus) => {
      setPendingId(id);
      try {
        const res = await fetch(`/api/ai/growth-adviser/cards/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: action }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // ACTIVE-only list — any non-active status removes the card.
        setCards((prev) => prev.filter((c) => c.id !== id));
      } catch (e) {
        setError(e instanceof Error ? e.message : t("suggestions.errorGeneric"));
      } finally {
        setPendingId(null);
      }
    },
    [t]
  );

  const types: ("ALL" | GrowthCardType)[] = useMemo(() => {
    const present = new Set<GrowthCardType>(cards.map((c) => c.type));
    return ["ALL", ...(Array.from(present) as GrowthCardType[])];
  }, [cards]);

  const visible = useMemo(
    () => (filter === "ALL" ? cards : cards.filter((c) => c.type === filter)),
    [cards, filter]
  );

  const cooldownLabel =
    cooldown > 0
      ? t("suggestions.cooldownIn", { time: formatCountdown(cooldown) })
      : t("suggestions.syncReady");

  return (
    <>
      <Topbar
        title={t("suggestions.title")}
        subtitle={t("suggestions.subtitle")}
        actions={
          <>
            {isPremium ? (
              <Badge variant="success">
                <Crown className="size-3" />
                {t("suggestions.premiumAi")}
              </Badge>
            ) : (
              <Badge variant="default">
                <Sparkles className="size-3" />
                {t("suggestions.freeAi")}
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => void onSync()}
              disabled={syncing || cooldown > 0}
              title={cooldown > 0 ? cooldownLabel : undefined}
            >
              {syncing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              {syncing ? t("suggestions.syncing") : t("common.refresh")}
            </Button>
          </>
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-3 sm:p-4 sm:gap-6 lg:p-6">
        {/* Status strip — last sync, today's count, cooldown countdown. */}
        <Card className="border-[color:var(--accent)]/30 bg-[color:var(--accent-soft)]/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                <TrendingUp className="size-4" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-medium">
                  {t("suggestions.lastSync")}:{" "}
                  <span className="text-foreground">
                    {formatRelativeTime(status?.lastSyncAt ?? null, t)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("suggestions.syncsToday", {
                    n: status?.syncsToday ?? 0,
                    cap: isPremium ? 4 : 1,
                  })}{" "}
                  · {cooldownLabel}
                </div>
              </div>
            </div>
            {!isPremium && (
              <a
                href="/settings"
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                <Crown className="size-3.5" />
                {t("suggestions.upgradeCta")}
              </a>
            )}
          </CardContent>
        </Card>

        {/* Type filter chips. */}
        {cards.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {types.map((tt) => (
              <button
                key={tt}
                type="button"
                onClick={() => setFilter(tt)}
                className={
                  filter === tt
                    ? "rounded-full border border-[color:var(--accent)]/40 bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-medium text-[color:var(--accent)]"
                    : "rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                }
              >
                {tt === "ALL"
                  ? t("suggestions.filterAll")
                  : t(`suggestions.type.${tt}` as never)}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {t("suggestions.errorPrefix")} {error}
          </div>
        )}

        {/* Card grid / empty / loading. */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="mt-2 h-3 w-20 rounded bg-muted" />
                </CardHeader>
                <CardContent>
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="mt-2 h-3 w-3/4 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            t={t}
            onSync={onSync}
            disabled={syncing || cooldown > 0}
            cooldownLabel={cooldown > 0 ? cooldownLabel : null}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visible.map((c) => (
              <CardItem
                key={c.id}
                card={c}
                t={t}
                pending={pendingId === c.id}
                onMarkDone={() => onAct(c.id, "DONE")}
                onDismiss={() => onAct(c.id, "DISMISSED")}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function CardItem({
  card,
  t,
  pending,
  onMarkDone,
  onDismiss,
}: {
  card: GrowthCard;
  t: ReturnType<typeof useT>;
  pending: boolean;
  onMarkDone: () => void;
  onDismiss: () => void;
}) {
  const meta = TYPE_META[card.type] ?? TYPE_META.OPERATIONS;
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset ${meta.tone}`}
          >
            {meta.icon}
          </span>
          <div>
            <CardTitle className="text-base">{card.title}</CardTitle>
            <CardDescription>
              {t(`suggestions.type.${card.type}` as never)}
              {card.confidenceScore != null
                ? ` · ${t("suggestions.confidence", { n: card.confidenceScore })}`
                : ""}
            </CardDescription>
          </div>
        </div>
        <Badge variant={PRIORITY_VARIANT[card.priority]}>
          {t(`suggestions.priority.${card.priority}` as never)}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-sm whitespace-pre-wrap text-foreground">{card.description}</p>
        {card.impact && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
            <span className="text-muted-foreground">{t("suggestions.estImpact")}</span>
            <span className="font-semibold text-[color:var(--accent)] tabular-nums">
              {card.impact}
            </span>
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          {card.actionUrl && card.cta ? (
            <a
              href={card.actionUrl}
              className={buttonVariants({ size: "sm" })}
            >
              {card.cta}
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">
              {card.cta ?? t("suggestions.advisoryOnly")}
            </span>
          )}
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onMarkDone} disabled={pending}>
              <CheckCircle2 className="size-4" />
              {t("common.markDone")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              disabled={pending}
              aria-label={t("suggestions.dismiss")}
              title={t("suggestions.dismiss")}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  t,
  onSync,
  disabled,
  cooldownLabel,
}: {
  t: ReturnType<typeof useT>;
  onSync: () => void;
  disabled: boolean;
  cooldownLabel: string | null;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
          <Sparkles className="size-5" />
        </div>
        <div className="text-sm font-medium">{t("suggestions.emptyTitle")}</div>
        <div className="max-w-md text-xs text-muted-foreground">
          {t("suggestions.emptyDesc")}
        </div>
        <Button size="sm" onClick={onSync} disabled={disabled}>
          <RefreshCw className="size-3.5" />
          {t("suggestions.generateNow")}
        </Button>
        {cooldownLabel && (
          <div className="text-[11px] text-muted-foreground">{cooldownLabel}</div>
        )}
        <a
          href="/settings"
          className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <SettingsIcon className="size-3" />
          {t("suggestions.tip")}
        </a>
      </CardContent>
    </Card>
  );
}
