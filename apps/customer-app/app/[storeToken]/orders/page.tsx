"use client";

import { useEffect, useState } from "react";
import {
  Package, Truck, CheckCircle, RefreshCcw, XCircle,
  ChevronDown, Calendar, Hash, ShoppingBag, CreditCard,
  MapPin, AlertCircle, ArrowRight, FileText
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useOrdersApi } from "./hooks/useOrdersApi";
import { useSearch } from "../context/search-context";
import { usePayment } from "./hooks/usePayment";

export default function OrdersPage() {
  const t = useTranslations("customer.orders");
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const { search } = useSearch();
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  const { orders, loading } = useOrdersApi(filter);
  const { startRazorpayPayment, isPaymentLoading } = usePayment();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // UI mapping
  const getStatusUI = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case "PENDING":
      case "CREATED":
        return {
          icon: <Package size={14} />,
          color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
          label: t("statusOrderCreated"),
        };
      case "SHIPPED":
        return {
          icon: <Truck size={14} />,
          color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
          label: t("statusShipped"),
        };
      case "DELIVERED":
        return {
          icon: <CheckCircle size={14} />,
          color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          label: t("statusDelivered"),
        };
      default:
        return { icon: <Package size={14} />, color: "bg-muted text-muted-foreground border-themed", label: s };
    }
  };

  const getPaymentStyles = (status: string) => {
    const s = status?.toUpperCase();
    if (s === "PAID") return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (s === "FAILED" || s === "CANCELLED") return "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30";
    if (s === "INITIATED") return "text-[color:var(--accent)] bg-[color:var(--accent-soft)] border-[color:var(--accent)]/30 animate-pulse";
    return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30";
  };

  const handleRetry = async (order: any) => {
    const paymentData = {
      product: { id: order.productId, name: order.productName } as any,
      qty: order.quantity || 1,
      total: order.costPrice,
      ordernumber: order.orderNo,
      finalPrice: order.unitPrice,
      formData: {
        name: order.customerName || "Customer",
        email: order.customerEmail || "",
        phone: order.phoneNumber || "",
        address: order.address || "",
        comments: order.comments || "-",
      },
      appliedOffer: order.offerApplied ? { offerId: order.offerId } as any : null,
    };

    await startRazorpayPayment(paymentData);
  };

  const filteredOrders = orders.filter((o) => {
    const q = debouncedSearch.toLowerCase();
    return (
      o.orderNo.toLowerCase().includes(q) ||
      o.productName.toLowerCase().includes(q) ||
      o.id.toString().includes(q)
    );
  });

  return (
    <div className="min-h-full bg-background pb-20">
      {/* HEADER */}
      <div className="p-4 max-w-6xl mx-auto">
        <div className="bg-card border border-themed rounded-xl p-6 flex items-center gap-4 mb-6">
          <div className="grid size-12 place-items-center rounded-lg bg-[color:var(--accent-soft)] text-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/20">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        {/* FILTER TABS */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
          {(
            [
              { key: "all", label: t("filterAll") },
              { key: "pending", label: t("filterPending") },
              { key: "shipped", label: t("filterShipped") },
              { key: "delivered", label: t("filterDelivered") },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border ${
                filter === f.key
                  ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)] border-[color:var(--accent)] shadow-sm"
                  : "bg-card text-muted-foreground border-themed hover:text-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ORDER LIST */}
        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-20 text-muted-foreground animate-pulse">{t("loading")}</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border-2 border-dashed border-themed">
              <ShoppingBag className="mx-auto text-muted-foreground mb-2" size={36} />
              <p className="text-muted-foreground">{t("empty")}</p>
            </div>
          ) : (
            filteredOrders.map((o) => {
              const statusUI = getStatusUI(o.orderStatus);
              const isOpen = expanded === o.orderNo;
              const pStatus = o.paymentStatus?.toUpperCase();
              const needsRetry = pStatus === "FAILED" || pStatus === "INITIATED";

              return (
                <div
                  key={o.orderNo}
                  className={`bg-card border rounded-xl transition-all shadow-sm hover:shadow-md ${
                    needsRetry ? 'border-[color:var(--accent)]/50 ring-1 ring-[color:var(--accent)]/20' : 'border-themed'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex flex-col md:flex-row gap-5">
                      {/* Image */}
                      <div className="relative h-24 w-24 mx-auto md:mx-0 shrink-0 bg-muted rounded-lg overflow-hidden border border-themed">
                        <Image
                          src={`/user/api/products/image/${o.productId}/0`}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold text-[color:var(--accent)] bg-[color:var(--accent-soft)] px-2 py-0.5 rounded uppercase tracking-wider">
                              {o.orderNo}
                            </span>
                            <div className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusUI.color}`}>
                              {statusUI.icon} {statusUI.label}
                            </div>
                          </div>
                          <p className="text-xl font-semibold">₹{(o.total ?? 0).toLocaleString()}</p>
                        </div>

                        <h3 className="font-semibold text-lg leading-tight truncate">{o.productName}</h3>

                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(o.date).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1.5"><Hash size={14} /> {t("qty")}: {o.quantity || 1}</span>
                          <span className={`px-2 py-0.5 rounded border uppercase text-[10px] font-medium tracking-wider ${getPaymentStyles(o.paymentStatus)}`}>
                            {o.paymentStatus}
                          </span>
                        </div>
                      </div>

                      {/* Expand Toggle */}
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => setExpanded(isOpen ? null : o.orderNo)}
                          className="p-2 hover:bg-muted rounded-full transition-transform"
                          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          aria-label={t("toggleDetails")}
                        >
                          <ChevronDown size={22} />
                        </button>
                      </div>
                    </div>

                    {/* Retry Payment Banner */}
                    {needsRetry && (
                      <div className={`mt-5 flex flex-col md:flex-row items-center justify-between p-4 rounded-lg border gap-4 ${
                        pStatus === "FAILED"
                          ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                          : "bg-[color:var(--accent-soft)] border-[color:var(--accent)]/30 text-[color:var(--accent)]"
                      }`}>
                        <div className="flex items-center gap-3">
                          <AlertCircle className={pStatus === "FAILED" ? "text-red-500" : "text-[color:var(--accent)]"} />
                          <div>
                            <p className="text-sm font-semibold">{pStatus === "FAILED" ? t("paymentFailed") : t("paymentIncomplete")}</p>
                            <p className="text-xs opacity-80">{t("paymentActionRequired")}</p>
                          </div>
                        </div>
                        <button
                          disabled={isPaymentLoading}
                          onClick={() => handleRetry(o)}
                          className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm transition active:translate-y-px ${
                            pStatus === "FAILED"
                              ? "bg-red-600 text-white hover:bg-red-700"
                              : "bg-[color:var(--accent)] text-[color:var(--accent-foreground)] hover:bg-[color:var(--accent-strong)]"
                          } disabled:opacity-50`}
                        >
                          {isPaymentLoading ? t("processing") : t("retryPayment")} <ArrowRight size={16} />
                        </button>
                      </div>
                    )}

                    {/* Expanded Info */}
                    {isOpen && (
                      <div className="mt-6 pt-6 border-t border-themed grid md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <MapPin size={12} /> {t("shippingAddress")}
                          </h4>
                          <div className="p-4 rounded-lg bg-muted/50 text-sm border border-themed">
                            <p className="font-semibold">{o.customerName}</p>
                            <p className="text-muted-foreground mt-1">{o.address}</p>
                            <p className="mt-2 text-xs text-muted-foreground">{t("phone")}: {o.phoneNumber}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <CreditCard size={12} /> {t("billingSummary")}
                          </h4>
                          <div className="p-4 rounded-lg bg-muted/50 space-y-2 border border-themed text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">{t("unitPrice")}</span><span>₹{(o.unitPrice ?? 0).toLocaleString()}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">{t("quantity")}</span><span>x{o.quantity ?? 1}</span></div>
                            <div className="flex justify-between font-semibold text-base pt-2 border-t border-themed mt-2">
                              <span>{t("totalAmount")}</span>
                              <span className="text-[color:var(--accent)]">₹{(o.total ?? 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
                          <button className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-foreground text-background rounded-lg font-medium hover:opacity-90 active:translate-y-px transition">
                            <RefreshCcw size={16} /> {t("reorder")}
                          </button>
                          {!needsRetry && o.orderStatus === "pending" && (
                            <button className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-card border border-themed text-red-500 rounded-lg font-medium hover:bg-red-500/10 transition">
                              <XCircle size={16} /> {t("cancelOrder")}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
