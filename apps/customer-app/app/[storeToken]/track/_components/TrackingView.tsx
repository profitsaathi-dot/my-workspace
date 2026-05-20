"use client";

import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Package,
  RotateCcw,
  Star,
  Truck,
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
  formatINR,
  toast,
} from "@workspace/ui";
import type { PublicTracking } from "@/types/tracking";
import { copyToClipboard } from "@/app/lib/clipboard";

export function OrderSummary({ data }: { data: PublicTracking }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="size-4 text-[color:var(--accent)]" />
          {data.product?.name ?? "Your order"}
        </CardTitle>
        <CardDescription>
          Order {data.orderNo ?? "—"}
          {data.createdAt && (
            <span> · Placed {new Date(data.createdAt).toLocaleDateString()}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {data.orderStatus && (
          <Badge variant={statusVariant(data.orderStatus)}>
            <Truck className="size-3" />
            {formatStatus(data.orderStatus)}
          </Badge>
        )}
        {data.paymentStatus && (
          <Badge variant={statusVariant(data.paymentStatus)}>
            {formatStatus(data.paymentStatus)}
          </Badge>
        )}
        {data.customerName && (
          <span className="text-xs text-muted-foreground">
            For {data.customerName}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

export function TrackingCard({ data, onReviewClick }: { data: PublicTracking; onReviewClick?: () => void }) {
  const hasShipping =
    !!data.shippingVendor && !!data.trackingId && data.trackingId.trim() !== "";

  // Closed orders (seller-cancelled or refunded) won't ever produce a
  // shipment. Suppress the tracking card entirely when there's nothing
  // shipped — the refund / status badges above already tell the story,
  // and "Not shipped yet" would mislead the customer into expecting a
  // delivery.
  const orderClosed =
    (data.orderStatus ?? "").toUpperCase() === "CANCELLED" ||
    (data.paymentStatus ?? "").toUpperCase() === "REFUND";

  const isDelivered = (data.orderStatus ?? "").toUpperCase() === "DELIVERED";
  
  console.log("[TrackingCard] Render:", { 
    orderStatus: data.orderStatus, 
    isDelivered, 
    hasShipping,
    orderClosed,
    onReviewClickExists: !!onReviewClick 
  });

  const copyTrackingId = async () => {
    if (!data.trackingId) return;
    const result = await copyToClipboard(data.trackingId);
    if (result.success) {
      toast.success("Tracking ID copied");
    } else {
      toast.error(result.error || "Could not copy");
    }
  };

  const openTracking = () => {
    if (!data.trackingUrl) return;
    window.open(data.trackingUrl, "_blank", "noopener,noreferrer");
  };

  if (!hasShipping) {
    if (orderClosed) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4 text-amber-400" />
            Not shipped yet
          </CardTitle>
          <CardDescription>
            Your seller hasn't dispatched this order yet. Once it ships,
            tracking details will appear here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-[color:var(--accent)]/30 bg-[color:var(--accent-soft)]/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-[color:var(--accent)]" />
          Track your shipment
        </CardTitle>
        <CardDescription>
          Two steps: copy the tracking ID, then open the carrier's tracking
          page.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ol className="ml-4 list-decimal space-y-3 text-sm">
          <li>
            <div className="mb-1.5 text-foreground">
              Copy the tracking ID below
              <span className="ml-2 inline-flex rounded-md bg-muted px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                {data.shippingVendor}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
              <code className="flex-1 break-all font-mono text-sm">
                {data.trackingId}
              </code>
              <Button variant="outline" size="sm" onClick={copyTrackingId}>
                <Copy className="size-3.5" />
                Copy
              </Button>
            </div>
          </li>
          <li>
            <div className="mb-1.5 text-foreground">
              Click below to open the carrier's tracking page in a new tab,
              and paste the tracking ID if it isn't already filled in.
            </div>
            {data.trackingUrl ? (
              <Button
                onClick={openTracking}
                size="lg"
                className="w-full justify-center sm:w-auto"
              >
                <ExternalLink className="size-4" />
                Open tracking page
                <ArrowUpRight className="size-3.5 opacity-70" />
              </Button>
            ) : (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
                We don't have a tracking URL for{" "}
                <strong>{data.shippingVendor}</strong> on file. Search your
                carrier's website with the tracking ID above.
              </p>
            )}
          </li>
        </ol>

        {isDelivered ? (
          <div className="space-y-3 border-t pt-3">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              If you still haven't received the product, please contact your
              local delivery partner with the tracking ID above.
            </p>
            <Button
              onClick={() => {
                if (onReviewClick) {
                  onReviewClick();
                } else {
                  console.error("[TrackingCard] onReviewClick is undefined!");
                }
              }}
              variant="outline"
              size="lg"
              className="w-full justify-center border-[color:var(--accent)] text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]"
            >
              <Star className="size-4" />
              Write a Review
            </Button>
          </div>
        ) : (
          <p className="border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
            The carrier's tracking page is operated by them — not by us. If
            the page doesn't load or shows no data yet, the parcel may not
            have entered the carrier's system. Try again in a few hours.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Customer-safe refund summary. Renders null when no refund has been
 * processed yet so callers can drop it in unconditionally.
 */
export function RefundCard({
  data,
  proofUrl,
}: {
  data: PublicTracking;
  proofUrl?: string;
}) {
  const refund = data.refund;
  if (!refund || (!refund.refundedAt && !refund.refundId)) return null;

  const isOnline = (refund.paymentType ?? "").toUpperCase() === "ONLINE";
  const showProof = !!proofUrl && refund.hasProof === true;
  const refundedDate = refund.refundedAt
    ? new Date(refund.refundedAt).toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="size-4 text-amber-400" />
          Refund processed
        </CardTitle>
        <CardDescription>
          {isOnline
            ? "Refunded to your original payment method via Razorpay."
            : "Your seller has refunded you directly via UPI / bank transfer."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {refund.refundAmount != null && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Refund amount</span>
            <span className="font-medium tabular-nums">
              {formatINR(Number(refund.refundAmount))}
            </span>
          </div>
        )}
        {refundedDate && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Refunded on</span>
            <span>{refundedDate}</span>
          </div>
        )}
        {refund.refundId && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Reference</span>
            <code className="break-all font-mono text-xs">{refund.refundId}</code>
          </div>
        )}
        {refund.refundReason && (
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Reason</span>
            <span className="text-right">{refund.refundReason}</span>
          </div>
        )}
        {showProof && (
          <a
            href={proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block overflow-hidden rounded-lg border bg-card"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proofUrl}
              alt="Refund proof from seller"
              className="max-h-[420px] w-full object-contain"
            />
          </a>
        )}
        <p className="border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
          {isOnline
            ? "Razorpay refunds typically credit back within 5–7 working days. If you don't see the amount after that, share the reference above with your bank or card issuer."
            : "If you haven't received the amount in your account yet, please reach out to your seller with the reference above."}
        </p>
      </CardContent>
    </Card>
  );
}

export function TrackingSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-3 h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-3 sm:p-6">
      {children}
    </div>
  );
}

function statusVariant(
  s: string
): "success" | "warning" | "danger" | "info" | "default" {
  switch (s.toUpperCase()) {
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

function formatStatus(s: string): string {
  return s
    .toLowerCase()
    .split("_")
    .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
