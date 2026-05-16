"use client";

import { useEffect, useMemo, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Hash,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Package,
  Phone,
  Printer,
  Receipt,
  RotateCcw,
  Save,
  Truck,
  User,
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
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Skeleton,
  Textarea,
  Topbar,
  formatINR,
  toast,
} from "@workspace/ui";
import { useT } from "@/src/i18n/useT";
import {
  SHIPPING_VENDORS,
  shippingVendorLabel,
} from "@/src/config/shipping-vendors";
import type { Order, OrderUpdate } from "@/src/types/order";
import type { PaymentRecord } from "@/src/types/payment";
import { RefundModal } from "./RefundModal";
import {
  buildAddressText,
  openEmailShare,
  openWhatsAppShare,
} from "../share-address";

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "DELIVERY_FAILED",
  "CANCELLED",
] as const;
const PAYMENT_STATUS_BASE = ["INITIATED", "PAID", "FAILED"] as const;
const PAYMENT_STATUS_REFUND = "REFUND";

// Forward-only state machine for an in-flight order. We only constrain
// what's reachable FROM `SHIPPED` — once a parcel is in transit, the
// seller can either confirm it landed (DELIVERED), report a failed
// delivery (DELIVERY_FAILED, then refund), or stay shipped. Going back to
// PENDING/CONFIRMED or sideways to CANCELLED no longer makes sense.
const SHIPPED_NEXT_STATES = new Set<string>([
  "SHIPPED",
  "DELIVERED",
  "DELIVERY_FAILED",
]);

function statusVariant(
  s: string | undefined
): "success" | "warning" | "danger" | "info" | "default" {
  switch ((s ?? "").toUpperCase()) {
    case "DELIVERED":
    case "PAID":
      return "success";
    case "PENDING":
    case "CREATED":
    case "INITIATED":
    case "REFUND":
      return "warning";
    case "CANCELLED":
    case "FAILED":
    case "DELIVERY_FAILED":
      return "danger";
    case "CONFIRMED":
    case "SHIPPED":
      return "info";
    default:
      return "default";
  }
}

/** "DELIVERY_FAILED" → "Delivery failed" for option labels. */
function formatStatus(s: string): string {
  return s
    .toLowerCase()
    .split("_")
    .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Buyer-facing label for the offline payment channel. The raw enum (UPI_QR /
 * BANK_ACCOUNT / ONLINE) reads like config — the seller cares about which
 * payment rail the buyer used, so render the friendly name.
 */
function paymentTypeLabel(t: string | null | undefined): string {
  switch ((t ?? "").toUpperCase()) {
    case "ONLINE":
      return "Online (Razorpay)";
    case "UPI_QR":
      return "UPI QR";
    case "BANK_ACCOUNT":
      return "Bank transfer";
    default:
      return t ? formatStatus(t) : "—";
  }
}

/**
 * Picks the single most relevant hint to show under the Order status
 * dropdown. The flags are exclusive in practice but ordering matters —
 * "delivered" beats "shipped" beats "needs payment" beats the field-level
 * cancel/deliver rules. Returning a single string keeps the hint slot
 * uncluttered.
 */
function orderStatusHint(
  deliveredLocked: boolean,
  refundedLocked: boolean,
  lockedToPostShip: boolean,
  shippedNeedsPaid: boolean,
  cancelDisabled: boolean,
  deliveredDisabled: boolean
): string | undefined {
  if (refundedLocked) return "Refunded — order is closed and can't change status";
  if (deliveredLocked) return "Delivered orders can't change status";
  if (lockedToPostShip)
    return "Shipped orders can only move to Delivered or Delivery failed";
  if (shippedNeedsPaid) return "Mark payment as Paid before shipping";
  if (cancelDisabled) return "Cancel disabled — order has shipping details";
  if (deliveredDisabled) return "Add shipping details to mark as Delivered";
  return undefined;
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  // editable fields
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [comments, setComments] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [shippingVendor, setShippingVendor] = useState("");
  const [trackingId, setTrackingId] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Backend ${res.status}`);
      }
      const data = (await res.json()) as Order;
      setOrder(data);
      setCustomerName(data.customerName ?? "");
      setPhoneNumber(data.phoneNumber ?? "");
      setAddress(data.address ?? "");
      setComments(data.comments ?? "");
      setOrderStatus(data.orderStatus ?? "PENDING");
      setPaymentStatus(data.paymentStatus ?? "INITIATED");
      setShippingVendor(data.shippingVendor ?? "");
      setTrackingId(data.trackingId ?? "");

      // Fire-and-forget — there may be no payment record yet (Razorpay-only
      // orders never upload a proof, and offline buyers may not have paid
      // yet). 404 is the expected miss path; we just leave `payment` null.
      try {
        const pRes = await fetch(`/api/orders/${id}/payment`, { cache: "no-store" });
        if (pRes.ok) {
          setPayment((await pRes.json()) as PaymentRecord);
        } else {
          setPayment(null);
        }
      } catch {
        setPayment(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Reverse the SHIPPED selection if payment status drops back below PAID.
  // Without this, a seller could mark PAID → SHIPPED → flip payment back to
  // INITIATED/FAILED while keeping SHIPPED — exactly what the rule is
  // supposed to prevent. We don't reset if SHIPPED is the saved value,
  // since legacy data shouldn't auto-mutate on render.
  useEffect(() => {
    if (
      paymentStatus !== "PAID" &&
      orderStatus === "SHIPPED" &&
      (order?.orderStatus ?? "") !== "SHIPPED"
    ) {
      setOrderStatus(order?.orderStatus ?? "PENDING");
      toast.error("Order status reset — payment must be Paid before shipping");
    }
  }, [paymentStatus, orderStatus, order?.orderStatus]);

  const dirty = useMemo(() => {
    if (!order) return false;
    return (
      customerName.trim() !== (order.customerName ?? "") ||
      phoneNumber.trim() !== (order.phoneNumber ?? "") ||
      address.trim() !== (order.address ?? "") ||
      (comments ?? "") !== (order.comments ?? "") ||
      orderStatus !== (order.orderStatus ?? "PENDING") ||
      paymentStatus !== (order.paymentStatus ?? "INITIATED") ||
      shippingVendor.trim() !== (order.shippingVendor ?? "") ||
      trackingId.trim() !== (order.trackingId ?? "")
    );
  }, [
    order,
    customerName,
    phoneNumber,
    address,
    comments,
    orderStatus,
    paymentStatus,
    shippingVendor,
    trackingId,
  ]);

  const phoneValid = phoneNumber === "" || /^[6-9]\d{9}$/.test(phoneNumber);
  const baseValid =
    customerName.trim().length >= 2 &&
    phoneValid &&
    address.trim().length >= 5;

  // Shipping vendor is the gate for two opposite rules:
  //  • once it's set, the seller can no longer CANCEL the order (use the
  //    DELIVERY_FAILED + REFUND flow instead) and the payment state is
  //    locked (carrier/PSP territory),
  //  • before it's set, the seller can't mark the order DELIVERED — there's
  //    no carrier on file to have delivered it.
  // For both, if the row already holds the disallowed value (legacy data),
  // we leave the option selectable so the dropdown renders the saved value
  // without a console warning.
  const hasShippingVendor = shippingVendor.trim().length > 0;
  const hasTrackingId = trackingId.trim().length > 0;
  const cancelDisabled = hasShippingVendor && orderStatus !== "CANCELLED";
  const deliveredDisabled = !hasShippingVendor && orderStatus !== "DELIVERED";
  const paymentReadOnly = hasShippingVendor;

  // Post-ship restriction: if the SAVED status is SHIPPED, only SHIPPED /
  // DELIVERED / DELIVERY_FAILED are reachable. Use the saved value (not the
  // editing value) so the user can't sidestep by toggling locally.
  const lockedToPostShip = (order?.orderStatus ?? "") === "SHIPPED";

  // Once an order is DELIVERED, the order-status is terminal — no more
  // edits. Refunds/returns belong on a separate flow, not this dropdown.
  // Customer name / address / payment-status remain editable, only the
  // order-status select is locked.
  const deliveredLocked = (order?.orderStatus ?? "") === "DELIVERED";

  // Pulled forward (also used by paymentStatusOptions / paymentStatusLocked
  // / cancellingPaidOrder below) so the refunded-lock check below can use
  // it without a TDZ error.
  const savedPaymentStatus = (order?.paymentStatus ?? "").toUpperCase();

  // Refunded orders are also terminal — moving them back to PENDING /
  // CONFIRMED / SHIPPED would falsify the audit trail and leave the
  // payment side dangling. Lock the order-status select once REFUND is
  // saved, regardless of whether the orderStatus is CANCELLED or
  // DELIVERY_FAILED.
  const refundedLocked = savedPaymentStatus === PAYMENT_STATUS_REFUND;

  // Hide the Shipping section until it's actually relevant — pending /
  // confirmed orders shouldn't ask for vendor or tracking. Shows up the
  // moment SHIPPED is selected, stays visible for any post-ship state, and
  // also reveals automatically if there's already saved shipping data
  // (e.g. legacy CANCELLED rows that happen to have a vendor recorded).
  const showShipping =
    orderStatus === "SHIPPED" ||
    orderStatus === "DELIVERED" ||
    orderStatus === "DELIVERY_FAILED" ||
    hasShippingVendor ||
    hasTrackingId;

  // Don't let the seller mark an unpaid order as SHIPPED — collect money
  // first. Existing SHIPPED rows still render their saved value cleanly
  // (in case the data predates this rule).
  const shippedRequiresPaid = paymentStatus !== "PAID";

  // SHIPPED is meaningful only with a carrier + AWB. We block save (rather
  // than the dropdown) so the seller has time to fill the fields after
  // selecting "Shipped".
  const shippedNeedsTracking =
    orderStatus === "SHIPPED" && (!hasShippingVendor || !hasTrackingId);

  // Final form-level validity. Save is blocked if the customer-side fields
  // are incomplete OR if SHIPPED is selected without the carrier + AWB.
  const valid = baseValid && !shippedNeedsTracking;

  // Diff for the confirm dialog. We collect human-friendly { label, from, to }
  // tuples so the seller sees exactly what's about to change before
  // committing — important for status edits that can't be reversed
  // (e.g. PENDING → DELIVERED).
  const changeSummary = useMemo<{ label: string; from: string; to: string }[]>(() => {
    if (!order) return [];
    const out: { label: string; from: string; to: string }[] = [];
    const dash = "—";
    const push = (label: string, from: string | undefined, to: string) => {
      if ((from ?? "") !== to) out.push({ label, from: from || dash, to: to || dash });
    };
    push("Customer name", order.customerName, customerName.trim());
    push("Phone", order.phoneNumber, phoneNumber.trim());
    push("Address", order.address, address.trim());
    push("Comments", order.comments ?? "", comments);
    if (orderStatus !== (order.orderStatus ?? "PENDING")) {
      out.push({
        label: "Order status",
        from: formatStatus(order.orderStatus ?? "PENDING"),
        to: formatStatus(orderStatus),
      });
    }
    if (paymentStatus !== (order.paymentStatus ?? "INITIATED")) {
      out.push({
        label: "Payment status",
        from: formatStatus(order.paymentStatus ?? "INITIATED"),
        to: formatStatus(paymentStatus),
      });
    }
    push("Shipping vendor", order.shippingVendor ?? "", shippingVendor.trim());
    push("Tracking ID", order.trackingId ?? "", trackingId.trim());
    return out;
  }, [
    order,
    customerName,
    phoneNumber,
    address,
    comments,
    orderStatus,
    paymentStatus,
    shippingVendor,
    trackingId,
  ]);

  // REFUND is no longer a manual choice — it's set automatically by the
  // refund endpoint after a real Razorpay refund or proof upload. Surface
  // it in the dropdown ONLY when the saved row already holds REFUND so the
  // current value renders cleanly; never as a selectable option for a
  // not-yet-refunded order. Otherwise the seller could pick REFUND, click
  // Save, and bypass the refund modal.
  const paymentStatusOptions = useMemo<readonly string[]>(() => {
    return savedPaymentStatus === PAYMENT_STATUS_REFUND
      ? [...PAYMENT_STATUS_BASE, PAYMENT_STATUS_REFUND]
      : [...PAYMENT_STATUS_BASE];
  }, [savedPaymentStatus]);

  // Lock the payment-status dropdown once the row is REFUND — it's a
  // terminal state and changing it manually would falsify the audit trail.
  const paymentStatusLocked = savedPaymentStatus === PAYMENT_STATUS_REFUND;

  // Refund is required before cancelling OR marking delivery-failed for
  // a PAID order — the backend rejects the PATCH with 409 / REFUND_REQUIRED
  // otherwise. Gate on the SAVED order state (not the editing dropdowns)
  // so a seller can't sidestep the modal by flipping payment to REFUND in
  // the same edit. Skip when the saved orderStatus already matches the
  // edit (no transition happening).
  const refundTriggerStatus: "CANCELLED" | "DELIVERY_FAILED" | null =
    orderStatus === "CANCELLED"
      ? "CANCELLED"
      : orderStatus === "DELIVERY_FAILED"
      ? "DELIVERY_FAILED"
      : null;
  const requiresRefundBeforeSave =
    savedPaymentStatus === "PAID" &&
    refundTriggerStatus !== null &&
    orderStatus !== (order?.orderStatus ?? "");
  // Kept as the legacy alias so existing call sites read clearly.
  const cancellingPaidOrder = requiresRefundBeforeSave;

  const buildPatch = (overridePaymentStatus?: string): OrderUpdate => {
    if (!order) return {};
    const effectivePaymentStatus = overridePaymentStatus ?? paymentStatus;
    const patch: OrderUpdate = {};
    if (customerName.trim() !== (order.customerName ?? ""))
      patch.customerName = customerName.trim();
    if (phoneNumber.trim() !== (order.phoneNumber ?? ""))
      patch.phoneNumber = phoneNumber.trim();
    if (address.trim() !== (order.address ?? ""))
      patch.address = address.trim();
    if ((comments ?? "") !== (order.comments ?? ""))
      patch.comments = comments;
    if (orderStatus !== (order.orderStatus ?? "PENDING"))
      patch.orderStatus = orderStatus;
    if (effectivePaymentStatus !== (order.paymentStatus ?? "INITIATED"))
      patch.paymentStatus = effectivePaymentStatus;
    if (shippingVendor.trim() !== (order.shippingVendor ?? ""))
      patch.shippingVendor = shippingVendor.trim();
    if (trackingId.trim() !== (order.trackingId ?? ""))
      patch.trackingId = trackingId.trim();
    return patch;
  };

  const sendPatch = async (patch: OrderUpdate) => {
    if (Object.keys(patch).length === 0) return;
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Backend ${res.status}`);
    }
    const updated = (await res.json()) as Order;
    setOrder(updated);
    if (patch.paymentStatus) setPaymentStatus(patch.paymentStatus);
    toast.success(t("orders.detail.updated"));
  };

  const save = async () => {
    if (!order || !dirty || !valid) return;

    // Detour through the refund modal before letting the cancel land.
    if (cancellingPaidOrder) {
      setConfirmOpen(false);
      setRefundOpen(true);
      return;
    }

    setSaving(true);
    try {
      await sendPatch(buildPatch());
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("orders.detail.updateFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  // Refund modal callback. The refund endpoint already flipped Spring-side
  // paymentStatus to REFUND and orderStatus to CANCELLED, so we just sync
  // local state and (if the seller also edited customer fields) push the
  // remaining patch.
  const handleRefundDone = async () => {
    setSaving(true);
    try {
      // Refund always flips paymentStatus to REFUND server-side; mirror that
      // locally so the patch we send doesn't try to set it again.
      const patch = buildPatch("REFUND");
      // Drop fields the refund endpoint already set so we don't fight it.
      delete patch.orderStatus;
      delete patch.paymentStatus;
      if (Object.keys(patch).length > 0) {
        await sendPatch(patch);
      } else {
        // Reload the order so the freshly refunded state shows up.
        await load();
      }
      // Mirror what RefundService set server-side.
      setOrderStatus(refundTriggerStatus ?? "CANCELLED");
      setPaymentStatus("REFUND");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("orders.detail.updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  // Build the share text from whatever's currently in the form (saved or
  // edited) — falls back to the saved order if a field was cleared.
  const currentForShare = () => ({
    orderNo: order?.orderNo,
    customerName: customerName.trim() || order?.customerName,
    address: address.trim() || order?.address,
    phoneNumber: phoneNumber.trim() || order?.phoneNumber,
  });

  const handleShareWhatsApp = () => {
    const src = currentForShare();
    if (!src.customerName || !src.address) {
      toast.error("Name and address are required to share");
      return;
    }
    openWhatsAppShare(buildAddressText(src));
  };

  const handleShareEmail = () => {
    const src = currentForShare();
    if (!src.customerName || !src.address) {
      toast.error("Name and address are required to share");
      return;
    }
    openEmailShare(buildAddressText(src));
  };

  // Open a clean, isolated popup with just the recipient details and trigger
  // the browser print dialog. Using a fresh window keeps print CSS out of the
  // main page and gives sellers a one-click way to slap a label on a parcel.
  const handlePrintAddress = () => {
    const name = customerName.trim() || order?.customerName?.trim() || "";
    const phone = phoneNumber.trim() || order?.phoneNumber?.trim() || "";
    const addr = address.trim() || order?.address?.trim() || "";
    if (!name || !addr) {
      toast.error("Name and address are required to print");
      return;
    }
    const orderNo = order?.orderNo ?? "";
    const esc = (s: string) =>
      s.replace(/[&<>"']/g, (c) =>
        c === "&"
          ? "&amp;"
          : c === "<"
          ? "&lt;"
          : c === ">"
          ? "&gt;"
          : c === '"'
          ? "&quot;"
          : "&#39;"
      );
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Shipping address — ${esc(orderNo)}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        color: #000;
        background: #fff;
        margin: 0;
        padding: 16px;
      }
      .label {
        border: 2px solid #000;
        border-radius: 8px;
        padding: 16px 18px;
        width: 100%;
        max-width: 480px;
      }
      .order-no {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #444;
        margin-bottom: 12px;
      }
      .to {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #666;
        margin-bottom: 4px;
      }
      .name {
        font-size: 20px;
        font-weight: 700;
        margin: 0 0 8px;
      }
      .addr {
        font-size: 15px;
        line-height: 1.45;
        white-space: pre-wrap;
        margin: 0 0 12px;
      }
      .phone {
        font-size: 14px;
        font-weight: 500;
      }
      .actions {
        margin-top: 14px;
        width: 100%;
        max-width: 480px;
        display: flex;
        gap: 8px;
      }
      .actions button {
        flex: 1;
        padding: 12px 14px;
        font-size: 15px;
        min-height: 44px;
        cursor: pointer;
        border: 1px solid #888;
        background: #fff;
        border-radius: 6px;
      }
      @media (min-width: 480px) {
        body { padding: 24px; }
        .label { padding: 20px 24px; }
        .name { font-size: 22px; }
        .addr { font-size: 16px; }
        .phone { font-size: 15px; }
        .actions button { flex: 0 0 auto; padding: 8px 16px; font-size: 14px; min-height: 0; }
      }
      @media print {
        .actions { display: none; }
        body { padding: 0; }
        .label { border: 1px solid #000; }
      }
    </style>
  </head>
  <body>
    <div class="label">
      ${orderNo ? `<div class="order-no">Order ${esc(orderNo)}</div>` : ""}
      <div class="to">To</div>
      <p class="name">${esc(name)}</p>
      <p class="addr">${esc(addr)}</p>
      ${phone ? `<div class="phone">Phone: ${esc(phone)}</div>` : ""}
    </div>
    <div class="actions">
      <button onclick="window.print()">Print</button>
      <button onclick="window.close()">Close</button>
    </div>
    <script>
      window.addEventListener("load", function () {
        setTimeout(function () { window.print(); }, 100);
      });
    </script>
  </body>
</html>`;
    // No fixed window size — mobile opens as a tab, desktop picks a
    // sensible default. The viewport + responsive CSS take it from there.
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Allow pop-ups to print the address");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const created = order?.createdAt ? new Date(order.createdAt) : null;
  const dateStr = created
    ? created.toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const revenue = order
    ? Number(order.unitPrice ?? 0) * Number(order.quantity ?? 0)
    : 0;

  return (
    <>
      <Topbar
        title={order?.orderNo ?? t("orders.detail.title")}
        subtitle={t("orders.detail.subtitle")}
        actions={
          <a href="/orders">
            <Button variant="outline">
              <ArrowLeft className="size-4" />
              {t("common.back")}
            </Button>
          </a>
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-3 sm:p-4 sm:gap-6 lg:p-6">
        {loading && (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
            {/* Stats strip skeleton — mirrors the 4-pane stat row */}
            <Card>
              <CardContent className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Header summary skeleton */}
            <Card>
              <CardContent className="flex flex-col gap-3 p-5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>

            {/* Edit form skeleton */}
            <Card>
              <CardContent className="flex flex-col gap-5 p-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {!loading && error && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="py-8 text-center text-sm text-red-300">
              <p>
                {t("errors.couldNotLoad")}: {error}
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && order && (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
            {/* Stats strip — single Card, divided panes */}
            <Card>
              <CardContent className="grid grid-cols-2 divide-y divide-x divide-[color:var(--border)] p-0 sm:grid-cols-4 sm:divide-y-0">
                <StatCell
                  label={t("orders.detail.revenue")}
                  value={formatINR(revenue)}
                  highlight
                />
                <StatCell
                  label={t("orders.profitLabel")}
                  value={formatINR(Number(order.profit ?? 0))}
                  highlight={Number(order.profit ?? 0) >= 0}
                />
                <StatCell
                  label={t("orders.detail.totalCost")}
                  value={formatINR(Number(order.totalCost ?? 0))}
                />
                <StatCell
                  label={t("orders.new.quantity")}
                  value={`${order.quantity} × ${formatINR(Number(order.unitPrice ?? 0))}`}
                />
              </CardContent>
            </Card>

            {/* Order info — product, date, shipping, status badges */}
            <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="size-4 text-[color:var(--accent)]" />
                    {t("orders.detail.product")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2.5 text-sm">
                  <Row
                    label={t("orders.new.product")}
                    value={order.product?.Name ?? "—"}
                  />
                  <Row
                    label={t("orders.detail.placedOn")}
                    value={dateStr}
                    icon={<Calendar className="size-3.5" />}
                  />
                  {order.shippingVendor && (
                    <Row
                      label={t("orders.detail.shippingVendor")}
                      value={shippingVendorLabel(order.shippingVendor)}
                      icon={<Truck className="size-3.5" />}
                    />
                  )}
                  {order.trackingId && (
                    <Row
                      label={t("orders.detail.trackingId")}
                      value={order.trackingId}
                      icon={<Hash className="size-3.5" />}
                      mono
                    />
                  )}
                  <Row
                    label="Payment type"
                    value={paymentTypeLabel(payment?.paymentType)}
                    icon={<CreditCard className="size-3.5" />}
                  />

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant={statusVariant(order.orderStatus)}>
                      <Truck className="size-3" />
                      {formatStatus(order.orderStatus ?? "")}
                    </Badge>
                    <Badge variant={statusVariant(order.paymentStatus)}>
                      {formatStatus(order.paymentStatus ?? "")}
                    </Badge>
                    {order.offerApplied && (
                      <Badge variant="info">{t("orders.offerApplied")}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

            {/* Payment proof — present only for offline flows (UPI QR /
                bank transfer). ONLINE (Razorpay) is signature-verified and
                never produces a proofImageUrl, so the URL itself is the
                reliable signal. The buyer client occasionally sends an
                unexpected paymentType value (or none at all), so we don't
                gate on the enum. */}
            {payment?.proofImageUrl && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="size-4 text-[color:var(--accent)]" />
                      Payment proof
                    </CardTitle>
                    <CardDescription>
                      {payment.paymentType === "BANK_ACCOUNT"
                        ? "Bank transfer screenshot uploaded by the buyer"
                        : payment.paymentType === "UPI_QR"
                        ? "UPI QR payment screenshot uploaded by the buyer"
                        : "Screenshot uploaded by the buyer"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {payment.proofImageUrl ? (
                      <a
                        href={`/api/orders/${id}/payment/proof`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-lg border bg-muted/30"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/orders/${id}/payment/proof`}
                          alt="Payment proof"
                          className="max-h-[420px] w-full object-contain"
                        />
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Buyer has not uploaded a proof yet.
                      </p>
                    )}
                    {payment.amount != null && (
                      <Row
                        label="Reported amount"
                        value={formatINR(Number(payment.amount))}
                      />
                    )}
                    {payment.status && (
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={statusVariant(payment.status)}>
                          {formatStatus(payment.status)}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

            {/* Refund details — present once a refund has been processed.
                For ONLINE (Razorpay) we show the refund id; for offline
                refunds we additionally render the seller-uploaded proof
                screenshot. Either signal is enough to surface the card. */}
            {(payment?.refundId || payment?.refundedAt || payment?.refundProofUrl) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RotateCcw className="size-4 text-[color:var(--accent)]" />
                    Refund details
                  </CardTitle>
                  <CardDescription>
                    {payment?.refundId
                      ? "Razorpay refund processed automatically"
                      : "Offline refund — seller uploaded a proof screenshot"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm">
                  {payment?.refundId && (
                    <Row
                      label="Refund ID"
                      value={payment.refundId}
                      icon={<Hash className="size-3.5" />}
                      mono
                    />
                  )}
                  {payment?.refundAmount != null && (
                    <Row
                      label="Refund amount"
                      value={formatINR(Number(payment.refundAmount))}
                    />
                  )}
                  {payment?.refundedAt && (
                    <Row
                      label="Refunded at"
                      value={new Date(payment.refundedAt).toLocaleString(undefined, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      icon={<Calendar className="size-3.5" />}
                    />
                  )}
                  {payment?.refundReason && (
                    <Row label="Reason" value={payment.refundReason} />
                  )}
                  {payment?.refundProofUrl && (
                    <a
                      href={`/api/orders/${id}/payment/refund-proof`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-lg border bg-muted/30"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/orders/${id}/payment/refund-proof`}
                        alt="Refund proof"
                        className="max-h-[420px] w-full object-contain"
                      />
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Edit Card — full width with internal sections */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("orders.detail.editTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  {/* Section: Status */}
                  <Section title={t("orders.detail.statusSection")}>
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label={t("orders.detail.statusOrder")}
                        hint={orderStatusHint(
                          deliveredLocked,
                          refundedLocked,
                          lockedToPostShip,
                          shippedRequiresPaid && orderStatus !== "SHIPPED",
                          cancelDisabled,
                          deliveredDisabled
                        )}
                      >
                        <Select
                          value={orderStatus}
                          onChange={(e) => setOrderStatus(e.target.value)}
                          disabled={deliveredLocked || refundedLocked}
                        >
                          {ORDER_STATUSES.map((s) => {
                            const disabledByPostShip =
                              lockedToPostShip &&
                              !SHIPPED_NEXT_STATES.has(s) &&
                              s !== order?.orderStatus;
                            const disabledByPayment =
                              s === "SHIPPED" &&
                              shippedRequiresPaid &&
                              s !== order?.orderStatus;
                            const disabled =
                              disabledByPostShip ||
                              disabledByPayment ||
                              (s === "CANCELLED" && cancelDisabled) ||
                              (s === "DELIVERED" && deliveredDisabled);
                            return (
                              <option key={s} value={s} disabled={disabled}>
                                {formatStatus(s)}
                              </option>
                            );
                          })}
                        </Select>
                      </Field>
                      <Field
                        label={t("orders.detail.statusPayment")}
                        hint={
                          paymentStatusLocked
                            ? "Refunded — payment status is now read-only"
                            : paymentReadOnly
                            ? "Locked — order has shipping details"
                            : cancellingPaidOrder
                            ? "REFUND is set automatically when you save the cancel"
                            : undefined
                        }
                      >
                        <Select
                          value={paymentStatus}
                          onChange={(e) => setPaymentStatus(e.target.value)}
                          disabled={paymentReadOnly || paymentStatusLocked}
                        >
                          {paymentStatusOptions.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                  </Section>

                  {/* Section: Shipping — only relevant once the order is
                      being shipped or has been shipped. Hiding it for
                      PENDING/CONFIRMED/CANCELLED keeps the form focused. */}
                  {showShipping && (
                    <Section title={t("orders.detail.shippingTitle")}>
                      <Field
                        label={t("orders.detail.shippingVendor")}
                        hint={
                          orderStatus === "SHIPPED"
                            ? "Required to mark as Shipped"
                            : undefined
                        }
                        error={
                          orderStatus === "SHIPPED" && !hasShippingVendor
                            ? "Select a shipping vendor"
                            : undefined
                        }
                      >
                        <Select
                          value={shippingVendor}
                          onChange={(e) => setShippingVendor(e.target.value)}
                        >
                          <option value="">
                            {t("orders.detail.vendorPlaceholder")}
                          </option>
                          {SHIPPING_VENDORS.map((v) => (
                            <option key={v.code} value={v.code}>
                              {v.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field
                        label={t("orders.detail.trackingId")}
                        hint={
                          orderStatus === "SHIPPED"
                            ? "Required to mark as Shipped"
                            : undefined
                        }
                        error={
                          orderStatus === "SHIPPED" && !hasTrackingId
                            ? "Enter the carrier's tracking ID / AWB"
                            : undefined
                        }
                      >
                        <Input
                          value={trackingId}
                          onChange={(e) => setTrackingId(e.target.value)}
                          placeholder={t("orders.detail.trackingIdPh")}
                          className="font-mono"
                        />
                      </Field>
                    </Section>
                  )}

                  {/* Section: Customer */}
                  <Section
                    title={t("orders.detail.customerSection")}
                    action={
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handlePrintAddress}
                          disabled={
                            customerName.trim().length < 2 ||
                            address.trim().length < 5
                          }
                          title="Print address"
                          aria-label="Print address"
                        >
                          <Printer className="size-3.5" />
                          <span className="hidden sm:inline">Print</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleShareWhatsApp}
                          disabled={
                            customerName.trim().length < 2 ||
                            address.trim().length < 5
                          }
                          title="Share on WhatsApp"
                          aria-label="Share on WhatsApp"
                        >
                          <MessageCircle className="size-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleShareEmail}
                          disabled={
                            customerName.trim().length < 2 ||
                            address.trim().length < 5
                          }
                          title="Share via email"
                          aria-label="Share via email"
                        >
                          <Mail className="size-3.5" />
                          <span className="hidden sm:inline">Email</span>
                        </Button>
                      </div>
                    }
                  >
                    <Field
                      label={t("orders.new.fieldName")}
                      icon={<User className="size-3.5" />}
                    >
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </Field>
                    <Field
                      label={t("orders.new.fieldPhone")}
                      icon={<Phone className="size-3.5" />}
                      error={
                        phoneNumber.length > 0 && !phoneValid
                          ? t("orders.new.invalidPhone")
                          : undefined
                      }
                    >
                      <Input
                        inputMode="numeric"
                        value={phoneNumber}
                        onChange={(e) =>
                          setPhoneNumber(
                            e.target.value.replace(/\D/g, "").slice(0, 10)
                          )
                        }
                      />
                    </Field>
                    <Field
                      label={t("orders.new.fieldAddress")}
                      icon={<MapPin className="size-3.5" />}
                    >
                      <Textarea
                        rows={3}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </Field>
                    <Field
                      label={t("orders.new.fieldComments")}
                      icon={<MessageSquare className="size-3.5" />}
                    >
                      <Textarea
                        rows={2}
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                      />
                    </Field>
                  </Section>
                </CardContent>
              </Card>

              <Button
                size="lg"
                onClick={() => {
                  // Cancelling a paid order skips the diff dialog and goes
                  // straight to the refund modal — stacking AlertDialog +
                  // Dialog from the same batch leaves Radix's focus trap
                  // stuck, leaving the refund modal invisible.
                  if (cancellingPaidOrder) {
                    setRefundOpen(true);
                  } else {
                    setConfirmOpen(true);
                  }
                }}
                disabled={!dirty || !valid || saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t("settings.saving")}
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    {t("orders.detail.saveChanges")}
                  </>
                )}
              </Button>
          </div>
        )}
      </main>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !saving) setConfirmOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save these changes?</AlertDialogTitle>
            <AlertDialogDescription>
              {changeSummary.length === 0
                ? "Nothing to save."
                : cancellingPaidOrder
                ? "Cancelling a paid order will open the refund step next."
                : "Review what's about to change. Status edits cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {changeSummary.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-sm">
              <ul className="space-y-1.5">
                {changeSummary.map((c) => (
                  <li key={c.label} className="flex flex-col gap-0.5">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {c.label}
                    </span>
                    <span className="text-foreground">
                      <span className="text-muted-foreground line-through">{c.from}</span>
                      <span className="mx-2 text-muted-foreground">→</span>
                      <span className="font-medium">{c.to}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Stop Radix from auto-closing before our async work runs.
                e.preventDefault();
                save().finally(() => setConfirmOpen(false));
              }}
              disabled={saving || changeSummary.length === 0}
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" />
                  {t("settings.saving")}
                </span>
              ) : (
                t("orders.detail.saveChanges")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RefundModal
        open={refundOpen}
        onOpenChange={(o) => {
          if (!saving) setRefundOpen(o);
        }}
        orderId={id}
        payment={payment}
        fallbackAmount={revenue}
        finalOrderStatus={refundTriggerStatus ?? "CANCELLED"}
        onDone={() => {
          setRefundOpen(false);
          void handleRefundDone();
        }}
      />
    </>
  );
}

function Field({
  label,
  icon,
  hint,
  error,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="flex items-center gap-1.5">
        {icon}
        {label}
      </Label>
      {children}
      {hint && !error && (
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

function Row({
  label,
  value,
  icon,
  mono,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className={mono ? "font-mono text-xs" : "text-foreground"}>
        {value}
      </span>
    </div>
  );
}

function StatCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-0.5 text-base font-semibold tabular-nums ${
          highlight ? "text-[color:var(--accent)]" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
