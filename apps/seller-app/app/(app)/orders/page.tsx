"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  Mail,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Printer,
  Receipt,
  Search,
  Truck,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Select,
  Topbar,
  formatINR,
  toast,
} from "@workspace/ui";
import type { Order, OrderListResponse } from "@/src/types/order";
import { useT } from "@/src/i18n/useT";
import { printOrderLabels } from "./print-labels";
import {
  buildBulkAddressText,
  openEmailShare,
  openWhatsAppShare,
} from "./share-address";

const PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  "",
  "CREATED",
  "PENDING",
  "CONFIRMED",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

function statusVariant(s: string | undefined): "success" | "warning" | "danger" | "info" | "default" {
  switch ((s ?? "").toUpperCase()) {
    case "DELIVERED":
    case "PAID":
      return "success";
    case "PENDING":
    case "CREATED":
    case "INITIATED":
      return "warning";
    case "CANCELLED":
    case "FAILED":
      return "danger";
    case "CONFIRMED":
    case "SHIPPED":
      return "info";
    default:
      return "default";
  }
}

export default function OrdersPage() {
  const t = useT();
  const [data, setData] = useState<OrderListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  // Selection for bulk-print. We store full order snapshots (not just ids)
  // so the print sheet stays available even after the user navigates the
  // list to a different page of results.
  const [selected, setSelected] = useState<Map<number, Order>>(new Map());

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const qs = new URLSearchParams();
        qs.set("page", String(page));
        qs.set("size", String(PAGE_SIZE));
        if (status) qs.set("status", status);
        if (search) qs.set("search", search);
        const res = await fetch(`/api/orders?${qs.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Backend ${res.status}`);
        }
        const json = (await res.json()) as OrderListResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load orders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, status, search]);

  const orders = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  const totalRevenue = useMemo(
    () =>
      orders.reduce(
        (sum, o) => sum + Number(o.unitPrice ?? 0) * Number(o.quantity ?? 0),
        0
      ),
    [orders]
  );
  const totalProfit = useMemo(
    () => orders.reduce((sum, o) => sum + Number(o.profit ?? 0), 0),
    [orders]
  );

  const toggleSelected = (order: Order) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(order.id)) next.delete(order.id);
      else next.set(order.id, order);
      return next;
    });
  };
  const clearSelected = () => setSelected(new Map());
  const selectAllOnPage = () => {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const o of orders) {
        const name = (o.customerName ?? "").trim();
        const addr = (o.address ?? "").trim();
        if (name.length >= 2 && addr.length >= 5) next.set(o.id, o);
      }
      return next;
    });
  };
  const handlePrintLabels = () => {
    const list = Array.from(selected.values());
    const res = printOrderLabels(list);
    if (!res.ok) toast.error(res.reason ?? "Could not open print window");
  };
  const handleShareWhatsApp = () => {
    const list = Array.from(selected.values());
    if (list.length === 0) return;
    openWhatsAppShare(buildBulkAddressText(list));
  };
  const handleShareEmail = () => {
    const list = Array.from(selected.values());
    if (list.length === 0) return;
    const subject =
      list.length === 1
        ? "Shipping address"
        : `Shipping addresses (${list.length})`;
    openEmailShare(buildBulkAddressText(list), subject);
  };

  return (
    <>
      <Topbar
        title={t("orders.title")}
        subtitle={
          totalItems > 0
            ? totalItems === 1
              ? t("orders.subtitleCountOne")
              : t("orders.subtitleCount", { n: totalItems })
            : t("orders.subtitle")
        }
        actions={
          <a href="/orders/new">
            <Button>
              <Plus className="size-4" />
              {t("orders.new")}
            </Button>
          </a>
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-3 sm:p-4 sm:gap-5 lg:p-6">
        {/* Filter bar — no Card wrapper, fewer borders on the page */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("orders.searchPh")}
              value={searchInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSearchInput(e.target.value);
                setPage(0);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setStatus(e.target.value);
              setPage(0);
            }}
            className="sm:w-56"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? s : t("common.allStatuses")}
              </option>
            ))}
          </Select>
        </div>

        {loading && (
          <div className="grid place-items-center py-16">
            <Loader2 className="size-6 animate-spin text-[color:var(--accent)]" />
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

        {!loading && !error && orders.length === 0 && (
          <Card>
            <CardContent className="grid place-items-center gap-3 py-16 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                <Receipt className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("orders.empty")}</h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {status || search
                    ? t("orders.emptyFilter")
                    : t("orders.emptyDesc")}
                </p>
              </div>
              <a href="/orders/new">
                <Button>
                  <Plus className="size-4" />
                  {t("orders.create")}
                </Button>
              </a>
            </CardContent>
          </Card>
        )}

        {!loading && !error && orders.length > 0 && (
          <>
            {/* Stats — single Card with two equal panes, divider clips properly */}
            <Card className="overflow-hidden">
              <CardContent className="grid grid-cols-2 divide-x divide-[color:var(--border)] p-0">
                <div className="px-4 py-4 sm:px-5">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t("orders.revenue")}
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums sm:text-xl">
                    {formatINR(totalRevenue)}
                  </div>
                </div>
                <div className="px-4 py-4 sm:px-5">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t("orders.profit")}
                  </div>
                  <div
                    className={`mt-1 text-lg font-semibold tabular-nums sm:text-xl ${
                      totalProfit >= 0
                        ? "text-[color:var(--accent)]"
                        : "text-red-400"
                    }`}
                  >
                    {formatINR(totalProfit)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bulk-action bar — sticky so it stays in reach while the
                seller picks more orders. Compact on mobile: two stacked
                rows (info + actions); single row on sm+. Action buttons
                collapse to icons on the smallest screens to keep the
                whole bar in one tap-row. */}
            {selected.size > 0 && (
              <div className="sticky top-2 z-10 flex flex-col gap-2 rounded-xl border border-[color:var(--accent)]/40 bg-[color:var(--accent-soft)] px-3 py-2 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-2.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-semibold text-foreground">
                    {selected.size} selected
                  </span>
                  <button
                    type="button"
                    onClick={clearSelected}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={selectAllOnPage}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Select all
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={handlePrintLabels}
                    title={`Combine ${selected.size} on A4 and print`}
                    aria-label="Combine and print"
                  >
                    <Printer className="size-3.5" />
                    <span className="hidden sm:inline">Print</span>
                    <span>({selected.size})</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareWhatsApp}
                    title="Share addresses on WhatsApp"
                    aria-label="Share on WhatsApp"
                  >
                    <MessageCircle className="size-3.5" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareEmail}
                    title="Share addresses via email"
                    aria-label="Share via email"
                  >
                    <Mail className="size-3.5" />
                    <span className="hidden sm:inline">Email</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Each order is its own card — gap between, hover lifts */}
            <ul className="flex flex-col gap-3">
              {orders.map((o) => (
                <OrderRow
                  key={o.id}
                  order={o}
                  selected={selected.has(o.id)}
                  onToggle={() => toggleSelected(o)}
                />
              ))}
            </ul>

            {/* Pagination — always rendered so the layout stays stable */}
            <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground sm:text-sm">
                {t("orders.pageOfTotal", { p: page + 1, n: Math.max(totalPages, 1), t: totalItems })}
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                  {t("common.prev")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("common.next")}
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}

function OrderRow({
  order,
  selected,
  onToggle,
}: {
  order: Order;
  selected: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const created = order.createdAt ? new Date(order.createdAt) : null;
  const dateStr = created
    ? created.toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const revenue = Number(order.unitPrice ?? 0) * Number(order.quantity ?? 0);
  const shipping = order.orderStatus || order.status;
  const payment = order.paymentStatus;
  const printable =
    (order.customerName ?? "").trim().length >= 2 &&
    (order.address ?? "").trim().length >= 5;

  return (
    <li className="relative">
      {/* Checkbox lives outside the link so toggling it doesn't navigate.
          Positioned over the card's top-left corner; the card's left
          padding leaves room. Disabled rows lack a printable address. */}
      <label
        className="absolute left-3 top-3 z-10 inline-flex size-7 cursor-pointer items-center justify-center"
        title={printable ? "Select to combine on a print sheet" : "No address — can't print"}
      >
        <input
          type="checkbox"
          checked={selected}
          disabled={!printable}
          onChange={onToggle}
          className="size-4 cursor-pointer accent-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Select order ${order.orderNo ?? order.id}`}
        />
      </label>
      <a
        href={`/orders/${order.id}`}
        className={`group block rounded-xl border bg-card p-4 pl-12 shadow-sm transition hover:-translate-y-0.5 hover:border-[color:var(--accent)]/40 hover:shadow-md sm:p-5 sm:pl-14 ${
          selected ? "border-[color:var(--accent)]/60 ring-1 ring-[color:var(--accent)]/30" : ""
        }`}
      >
        {/* Header: order # (small) — only on its own line so badges have room */}
        {order.orderNo && (
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            {order.orderNo}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          {/* Left — customer + statuses + meta */}
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-base font-semibold">
                {order.customerName}
              </span>
              {shipping && (
                <Badge variant={statusVariant(shipping)}>
                  <Truck className="size-3" />
                  {shipping}
                </Badge>
              )}
              {payment && (
                <Badge variant={statusVariant(payment)}>
                  <CreditCard className="size-3" />
                  {payment}
                </Badge>
              )}
              {order.offerApplied && (
                <Badge variant="info">{t("orders.offerApplied")}</Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {order.product?.Name && (
                <span className="inline-flex items-center gap-1">
                  <Package className="size-3" />
                  {order.product.Name} × {order.quantity}
                </span>
              )}
              {order.phoneNumber && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3" />
                  {order.phoneNumber}
                </span>
              )}
              {dateStr && <span>{dateStr}</span>}
            </div>
          </div>

          {/* Right — totals. Inline on mobile (under meta), right-aligned on desktop. */}
          <div className="flex shrink-0 items-baseline justify-between gap-3 border-t pt-3 sm:flex-col sm:items-end sm:justify-start sm:gap-0 sm:border-t-0 sm:pt-0">
            <div className="text-lg font-semibold tabular-nums">
              {formatINR(revenue)}
            </div>
            <div
              className={`text-xs tabular-nums ${
                Number(order.profit ?? 0) >= 0
                  ? "text-[color:var(--accent)]"
                  : "text-red-400"
              }`}
            >
              {t("orders.profitLabel")} {formatINR(Number(order.profit ?? 0))}
            </div>
          </div>
        </div>
      </a>
    </li>
  );
}
