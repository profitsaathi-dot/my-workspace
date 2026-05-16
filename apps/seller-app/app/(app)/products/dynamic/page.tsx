"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Clock,
  Copy,
  ImageIcon,
  Loader2,
  Plus,
  Share2,
  Tag,
  Zap,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  Skeleton,
  Topbar,
  cn,
  formatINR,
  toast,
} from "@workspace/ui";
import type { DynamicPriceListing, DynamicPriceStatus } from "@/src/types/dynamicPrice";

type StatusFilter = "ALL" | DynamicPriceStatus;

export default function DynamicPriceListPage() {
  const [listings, setListings] = useState<DynamicPriceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  // Local pending state for the cancel confirmation modal — null = closed.
  const [pendingCancel, setPendingCancel] = useState<DynamicPriceListing | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dynamic-prices", { cache: "no-store" });
      if (!res.ok) throw new Error(`Backend ${res.status}`);
      const data = (await res.json()) as DynamicPriceListing[];
      setListings(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    let active = 0;
    let used = 0;
    let expired = 0;
    let cancelled = 0;
    for (const l of listings) {
      if (l.status === "ACTIVE") active++;
      else if (l.status === "USED") used++;
      else if (l.status === "EXPIRED") expired++;
      else if (l.status === "CANCELLED") cancelled++;
    }
    return { active, used, expired, cancelled, total: listings.length };
  }, [listings]);

  const filtered = useMemo(
    () => (filter === "ALL" ? listings : listings.filter((l) => l.status === filter)),
    [listings, filter]
  );

  const buildPublicUrl = (token: string) =>
    typeof window === "undefined" ? `/dp/${token}` : `${window.location.origin}/dp/${token}`;

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(buildPublicUrl(token));
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const shareWA = (token: string, productName?: string) => {
    const url = buildPublicUrl(token);
    const text = encodeURIComponent(
      `Here's your custom price${productName ? ` for ${productName}` : ""}: ${url}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const confirmCancel = async () => {
    const target = pendingCancel;
    if (!target?.id || cancellingId !== null) return;
    setCancellingId(target.id);
    try {
      const res = await fetch(`/api/dynamic-prices/${target.id}/cancel`, { method: "POST" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Backend ${res.status}`);
      }
      // Optimistic local update so the card flips to CANCELLED immediately.
      setListings((prev) =>
        prev.map((l) => (l.id === target.id ? { ...l, status: "CANCELLED" } : l))
      );
      toast.success("Link marked inactive");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel");
    } finally {
      setCancellingId(null);
      setPendingCancel(null);
    }
  };

  return (
    <>
      <Topbar
        title="Dynamic Pricing"
        subtitle="One-time links with a custom price for items like gifts, custom orders, or quotes."
        actions={
          <a href="/products/dynamic/new">
            <Button>
              <Plus className="size-4" />
              New link
            </Button>
          </a>
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-3 sm:p-4 lg:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <FilterTabs value={filter} onChange={setFilter} counts={counts} />
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-2 p-4">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && error && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="py-8 text-center text-sm text-red-300">
              <p>Couldn't load: {error}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Make sure your Spring backend is running.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && listings.length === 0 && (
          <Card>
            <CardContent className="grid place-items-center gap-3 py-16 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                <Zap className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">No dynamic links yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a link with a custom price and share it with one customer.
                </p>
              </div>
              <a href="/products/dynamic/new">
                <Button>
                  <Plus className="size-4" />
                  Create your first link
                </Button>
              </a>
            </CardContent>
          </Card>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((l) => (
              <ListingCard
                key={l.publicToken}
                listing={l}
                onCopy={() => copy(l.publicToken)}
                onShareWA={() => shareWA(l.publicToken, l.product?.name)}
                onCancel={() => setPendingCancel(l)}
                cancelling={cancellingId === l.id}
              />
            ))}
          </div>
        )}
      </main>

      <AlertDialog
        open={pendingCancel !== null}
        onOpenChange={(open) => {
          if (!open && cancellingId === null) setPendingCancel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this link as inactive?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCancel?.product?.name
                ? `The link for "${pendingCancel.product.name}" will stop working immediately. This can't be undone — you'll need to create a new link if you want to share it again.`
                : "This link will stop working immediately. This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancellingId !== null}>
              Keep active
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Stop Radix from closing the dialog before our async work runs.
                e.preventDefault();
                confirmCancel();
              }}
              disabled={cancellingId !== null}
              className="bg-red-500/90 text-white hover:bg-red-500"
            >
              {cancellingId !== null ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" />
                  Cancelling…
                </span>
              ) : (
                "Mark inactive"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  counts: { active: number; used: number; expired: number; total: number };
}) {
  const tabs: { v: StatusFilter; label: string; count: number }[] = [
    { v: "ALL", label: "All", count: counts.total },
    { v: "ACTIVE", label: "Active", count: counts.active },
    { v: "USED", label: "Used", count: counts.used },
    { v: "EXPIRED", label: "Expired", count: counts.expired },
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

function ListingCard({
  listing,
  onCopy,
  onShareWA,
  onCancel,
  cancelling,
}: {
  listing: DynamicPriceListing;
  onCopy: () => void;
  onShareWA: () => void;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const expiryLabel = formatExpiry(listing);
  const isClosed = listing.status !== "ACTIVE";

  return (
    <Card className={cn(isClosed && "opacity-70")}>
      <CardContent className="flex gap-3 p-3 sm:p-4">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          {listing.product?.id && !imgFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/products/image?id=${listing.product.id}&index=0`}
              alt={listing.product.name}
              className={cn("size-full object-cover", isClosed && "grayscale")}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              <ImageIcon className="size-5" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">
                {listing.product?.name ?? "—"}
              </h3>
              {listing.customerName && (
                <p className="truncate text-xs text-muted-foreground">
                  for {listing.customerName}
                </p>
              )}
            </div>
            <StatusBadge status={listing.status} />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-[color:var(--accent)] tabular-nums">
              {formatINR(Number(listing.price) || 0)}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Tag className="size-3" />
              custom
            </span>
          </div>

          {listing.note && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{listing.note}</p>
          )}

          <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3" />
            {expiryLabel}
          </p>

          {!isClosed && (
            <div className="mt-1 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={onCopy} className="px-2 text-xs">
                  <Copy className="size-3.5" />
                  Copy link
                </Button>
                <Button
                  size="sm"
                  onClick={onShareWA}
                  className="bg-green-500 px-2 text-xs hover:bg-green-400"
                >
                  <Share2 className="size-3.5" />
                  WhatsApp
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={cancelling}
                className="px-2 text-xs text-red-300 hover:bg-red-500/10 hover:text-red-300"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Cancelling…
                  </>
                ) : (
                  <>
                    <Ban className="size-3.5" />
                    Mark inactive
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: DynamicPriceStatus }) {
  if (status === "ACTIVE") return <Badge variant="success">Active</Badge>;
  if (status === "USED") return <Badge variant="outline">Used</Badge>;
  if (status === "EXPIRED") return <Badge variant="warning">Expired</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function formatExpiry(listing: DynamicPriceListing): string {
  if (listing.status === "USED" && listing.usedAt) {
    return `Ordered on ${new Date(listing.usedAt).toLocaleDateString()}`;
  }
  if (!listing.expiresAt) return "—";
  const expires = new Date(listing.expiresAt).getTime();
  const now = Date.now();
  if (listing.status === "EXPIRED" || expires < now) {
    return `Expired on ${new Date(listing.expiresAt).toLocaleString()}`;
  }
  const diffMs = expires - now;
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `Expires in ${days}d ${hours % 24}h`;
  }
  if (hours >= 1) return `Expires in ${hours}h ${minutes}m`;
  return `Expires in ${Math.max(minutes, 1)}m`;
}
