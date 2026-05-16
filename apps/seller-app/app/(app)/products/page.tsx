"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ImageIcon,
  Loader2,
  Package,
  PauseCircle,
  Pencil,
  Plus,
  Power,
  Search,
  Share2,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Topbar,
  cn,
  formatINR,
} from "@workspace/ui";
import { useUserStore } from "@/src/stores/user.store";
import { useT } from "@/src/i18n/useT";
import { encryptAES } from "@/src/lib/crypto/aes";
import { env } from "@/src/config/env";
import type { Product, ProductSimple, ProductStatus } from "@/src/types/product";

type StatusFilter = "ALL" | ProductStatus;

export default function ProductsPage() {
  const t = useT();
  const [products, setProducts] = useState<ProductSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const user = useUserStore((s) => s.user);

  // The customer-facing user app routes the seller's storefront under the
  // `storeName` segment (set during onboarding). publicToken is the seller's
  // internal identifier — the user app doesn't know that one.
  const shopSlug = (user?.storeName ?? "").trim();

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      // /api/products/all proxies Spring's /products/user/all, which (unlike
      // the cached /user/simple endpoint) returns INACTIVE rows too.
      const res = await fetch("/api/products/all", { cache: "no-store" });
      if (!res.ok) throw new Error(`Backend ${res.status}`);
      const data = (await res.json()) as ProductSimple[];
     
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const counts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let unknown = 0;
    for (const p of products) {
      if (p.status === "ACTIVE") active++;
      else if (p.status === "INACTIVE") inactive++;
      else unknown++;
    }
    return { active, inactive, unknown, total: products.length };
  }, [products]);

  const filtered = useMemo(() => {
    return products
      .filter((p) =>
        statusFilter === "ALL" ? true : (p.status ?? "ACTIVE") === statusFilter
      )
      .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  }, [products, q, statusFilter]);

  const share = (token?: string) => {
    if (!token || !shopSlug) return;
    // Build the public product URL the user app serves at
    // /user/{storeName}/product/{publicToken}. Anchor on
    // NEXT_PUBLIC_URL so links remain correct even when the seller
    // copies them from a non-canonical host (e.g. an IP for LAN testing).
    const base = (env.NEXT_PUBLIC_URL_USER ?? window.location.origin).replace(/\/$/, "");
    const url = `${base}/user/${encodeURIComponent(shopSlug)}/product/${token}`;
    setShareUrl(url);
  };

  // Quick toggle: re-activate (or de-activate) a product without leaving this page.
  // Fetches the full product, flips status, PUTs back. Same encrypted protocol as edit.
  const toggleStatus = async (p: ProductSimple) => {
    if (activatingId !== null) return;
    setActivatingId(p.id);
    try {
      const fetchRes = await fetch(`/api/products/fetch?id=${p.id}`, {
        cache: "no-store",
      });
      if (!fetchRes.ok) throw new Error(`Fetch ${fetchRes.status}`);
      const full = (await fetchRes.json()) as Product;

      const nextStatus: ProductStatus =
        (p.status ?? "ACTIVE") === "ACTIVE" ? "INACTIVE" : "ACTIVE";

      const payload = {
        id: full.id,
        name: full.name,
        description: full.description ?? "",
        status: nextStatus,
        costPrice: Number(full.costPrice) || 0,
        shippingCost: Number(full.shippingCost) || 0,
        packagingCost: Number(full.packagingCost) || 0,
        competitorPrice: Number(full.competitorPrice) || 0,
        sellingPrice: Number(full.sellingPrice) || 0,
      };
      const encrypted = await encryptAES(JSON.stringify(payload));

      const fd = new FormData();
      fd.append("request", encrypted);
      //fd.append("mainImageIndex", "0");

      const res = await fetch("/api/products/create", { method: "PUT", body: fd });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Backend ${res.status}`);
      }

      // Optimistic update so the UI reflects the change immediately
      setProducts((prev) =>
        prev.map((row) => (row.id === p.id ? { ...row, status: nextStatus } : row))
      );
      setToast({
        kind: "ok",
        msg: nextStatus === "ACTIVE" ? t("products.activated") : t("products.paused"),
      });
    } catch (e) {
      setToast({
        kind: "err",
        msg: e instanceof Error ? e.message : t("products.couldNotChange"),
      });
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <>
      <Topbar
        title={t("products.title")}
        subtitle={t("products.subtitle")}
        actions={
          <a href="/products/new">
            <Button>
              <Plus className="size-4" />
              {t("products.add")}
            </Button>
          </a>
        }
      />

      {toast && (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium ring-1 ring-inset",
            toast.kind === "ok"
              ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)] ring-[color:var(--accent)]/30"
              : "bg-red-500/15 text-red-300 ring-red-500/30"
          )}
        >
          {toast.msg}
        </div>
      )}

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-3 sm:p-4 lg:p-6">
        {/* Filter row — search full-width on mobile, inline on tablet+ */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <div className="relative w-full sm:max-w-md sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("common.searchProducts")}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto sm:gap-3">
            <FilterTabs
              value={statusFilter}
              onChange={setStatusFilter}
              counts={counts}
            />
            <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
              {t("products.matchesOf", { filtered: filtered.length, total: products.length })}
            </Badge>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <div className="aspect-square animate-pulse rounded-t-xl bg-muted/60" />
                <CardContent className="space-y-2 p-3 sm:p-4">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && error && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="py-8 text-center text-sm text-red-300">
              <p>{t("errors.couldNotLoad")}: {error}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("errors.backendDown")}
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && products.length === 0 && (
          <Card>
            <CardContent className="grid place-items-center gap-3 py-16 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                <Package className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("products.empty")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("products.emptyDesc")}
                </p>
              </div>
              <a href="/products/new">
                <Button>
                  <Plus className="size-4" />
                  {t("products.addFirst")}
                </Button>
              </a>
            </CardContent>
          </Card>
        )}

        {!loading && products.length > 0 && filtered.length === 0 && (
          <Card>
            <CardContent className="grid place-items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {t("products.noMatchFilter")}
              </p>
              {statusFilter !== "ALL" && (
                <Button variant="outline" size="sm" onClick={() => setStatusFilter("ALL")}>
                  {t("products.showAll")}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                p={p}
                onShare={() => share(p.publicToken)}
                onToggle={() => toggleStatus(p)}
                toggling={activatingId === p.id}
              />
            ))}
          </div>
        )}
      </main>

      {shareUrl && <ShareDialog url={shareUrl} onClose={() => setShareUrl(null)} />}
    </>
  );
}

function FilterTabs({
  value,
  onChange,
  counts,
}: {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
  counts: { active: number; inactive: number; total: number };
}) {
  const t = useT();
  const tabs: { v: StatusFilter; label: string; count: number }[] = [
    { v: "ALL", label: t("products.filterAll"), count: counts.total },
    { v: "ACTIVE", label: t("products.filterActive"), count: counts.active },
    { v: "INACTIVE", label: t("products.filterInactive"), count: counts.inactive },
  ];
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
      {tabs.map((t) => {
        const selected = value === t.v;
        return (
          <button
            key={t.v}
            type="button"
            onClick={() => onChange(t.v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition",
              selected
                ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded px-1 text-[10px] font-semibold",
                selected ? "bg-card/20" : "bg-muted"
              )}
            >
              {t.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ProductCard({
  p,
  onShare,
  onToggle,
  toggling,
}: {
  p: ProductSimple;
  onShare: () => void;
  onToggle: () => void;
  toggling: boolean;
}) {
  const t = useT();
  const [imgFailed, setImgFailed] = useState(false);
  const isInactive = p.status === "INACTIVE";

  return (
    <Card
      className={cn(
        "overflow-hidden transition",
        isInactive && "opacity-70 ring-1 ring-amber-500/20"
      )}
    >
      <div className="relative aspect-square bg-muted">
        {!imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/products/image?id=${p.id}&index=${p.mainImageindex ?? 0}`}
            alt={p.name}
            className={cn(
              "size-full object-cover",
              isInactive && "grayscale"
            )}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <ImageIcon className="size-8" />
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 sm:left-2 sm:top-2">
          {p.status === "INACTIVE" ? (
            <Badge variant="warning">
              <PauseCircle className="size-3" />
              {t("products.statusInactive")}
            </Badge>
          ) : (
            <Badge variant="success">
              <CheckCircle2 className="size-3" />
              {t("products.statusActive")}
            </Badge>
          )}
        </span>
      </div>
      <CardContent className="flex flex-col gap-2 p-3 sm:p-4">
        <h3 className="line-clamp-2 min-h-[2.25rem] text-xs font-medium sm:min-h-[2.5rem] sm:text-sm">
          {p.name}
        </h3>
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-sm font-semibold text-[color:var(--accent)] tabular-nums sm:text-base">
            {formatINR(p.sellingPrice ?? 0)}
          </span>
        </div>
        <div className="mt-0.5 grid grid-cols-2 gap-1.5 sm:gap-2">
          <a href={`/products/${p.id}/edit`}>
            <Button variant="outline" size="sm" className="w-full px-2 text-xs sm:text-sm">
              <Pencil className="size-3.5" />
              <span className="hidden sm:inline">{t("common.edit")}</span>
            </Button>
          </a>
          <Button
            variant="secondary"
            size="sm"
            onClick={onShare}
            disabled={!p.publicToken || isInactive}
            title={isInactive ? t("products.activateFirst") : undefined}
            className="px-2 text-xs sm:text-sm"
          >
            <Share2 className="size-3.5" />
            <span className="hidden sm:inline">{t("common.share")}</span>
          </Button>
        </div>
        <Button
          variant={isInactive ? "default" : "ghost"}
          size="sm"
          onClick={onToggle}
          disabled={toggling}
          className="w-full px-2 text-xs sm:text-sm"
        >
          {toggling ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span className="truncate">
                {isInactive ? t("common.activating") : t("common.pausing")}
              </span>
            </>
          ) : isInactive ? (
            <>
              <Power className="size-3.5" />
              {t("common.activate")}
            </>
          ) : (
            <>
              <PauseCircle className="size-3.5" />
              {t("common.pause")}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function ShareDialog({ url, onClose }: { url: string; onClose: () => void }) {
  const t = useT();
  const copy = async () => {
    await navigator.clipboard.writeText(url);
  };
  const shareWA = () => {
    const text = encodeURIComponent(`${t("products.shareCheck")}: ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[92%] max-w-md rounded-2xl border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">{t("products.shareTitle")}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>
        <div className="mb-4 flex items-center gap-2 rounded-lg border bg-muted p-2">
          <input
            value={url}
            readOnly
            className="flex-1 bg-transparent px-2 text-sm text-foreground outline-none"
          />
          <Button size="sm" onClick={copy}>
            {t("common.copy")}
          </Button>
        </div>
        <div className="grid gap-2">
          <Button onClick={shareWA} className="bg-green-500 hover:bg-green-400">
            <Loader2 className="size-4" />
            {t("products.shareWA")}
          </Button>
          <a
            href={url}
            target="_blank"
            className="text-center text-sm text-[color:var(--accent)] hover:text-[color:var(--accent)]"
          >
            {t("products.openProduct")}
          </a>
        </div>
      </div>
    </div>
  );
}
