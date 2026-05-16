"use client";

/**
 * Refund modal — gates the order CANCELLED transition.
 *
 * Step 1: server is asked to initiate a refund. If the payment was ONLINE
 * (Razorpay), the server runs the refund and we just confirm the result.
 * If it was UPI/Bank, the server hands back `requiresProof: true` and we
 * surface a file picker so the seller can upload the screenshot of the
 * out-of-band refund they performed in their banking app.
 *
 * Either way, on success the parent receives an `onDone()` callback that
 * carries the new payment status so the order page can save the cancel
 * patch immediately.
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  formatINR,
  toast,
} from "@workspace/ui";
import type { PaymentRecord, RefundInitiateResponse } from "@/src/types/payment";

type RefundDoneReason = "razorpay" | "proof" | "no-payment" | "already-refunded";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  payment: PaymentRecord | null;
  /** Fallback amount when no payment row is loaded (uses order revenue). */
  fallbackAmount: number;
  /**
   * Final orderStatus the refund should leave on the order. CANCELLED for
   * a seller-initiated cancel; DELIVERY_FAILED when the carrier returned
   * the parcel. Drives copy + the value sent to the refund endpoint.
   */
  finalOrderStatus?: "CANCELLED" | "DELIVERY_FAILED";
  /** Called once a refund (or skip) is confirmed. */
  onDone: (reason: RefundDoneReason, result: RefundInitiateResponse) => void;
}

function paymentTypeLabel(t: string | null | undefined): string {
  switch ((t ?? "").toUpperCase()) {
    case "ONLINE":
      return "Online (Razorpay)";
    case "UPI_QR":
      return "UPI QR";
    case "BANK_ACCOUNT":
      return "Bank transfer";
    default:
      return t || "—";
  }
}

export function RefundModal({
  open,
  onOpenChange,
  orderId,
  payment,
  fallbackAmount,
  finalOrderStatus = "CANCELLED",
  onDone,
}: Props) {
  const maxAmount = useMemo(() => {
    const fromPayment = payment?.amount != null ? Number(payment.amount) : NaN;
    return Number.isFinite(fromPayment) && fromPayment > 0
      ? fromPayment
      : fallbackAmount;
  }, [payment?.amount, fallbackAmount]);

  // Defaults to full amount; seller can edit down for a partial refund.
  const [amount, setAmount] = useState<string>(maxAmount > 0 ? String(maxAmount) : "");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "initiating" | "awaiting-proof" | "uploading" | "done"
  >("idle");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [serverMsg, setServerMsg] = useState<string | null>(null);

  // Reset whenever the modal is reopened so a previous attempt doesn't leak.
  useEffect(() => {
    if (open) {
      setAmount(maxAmount > 0 ? String(maxAmount) : "");
      setReason("");
      setFile(null);
      setPhase("idle");
      setProofUrl(null);
      setServerMsg(null);
    }
  }, [open, maxAmount]);

  const amountNum = Number(amount);
  const amountValid =
    Number.isFinite(amountNum) && amountNum > 0 && amountNum <= maxAmount;

  const isOnline = (payment?.paymentType ?? "").toUpperCase() === "ONLINE";

  const initiate = async () => {
    if (!amountValid) {
      toast.error(`Amount must be between 1 and ${formatINR(maxAmount)}`);
      return;
    }
    setPhase("initiating");
    setServerMsg(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          reason: reason || undefined,
          finalOrderStatus,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as RefundInitiateResponse & {
        message?: string;
      };
      if (!res.ok) {
        if (res.status === 409 && json.alreadyRefunded) {
          toast.success("Already refunded");
          setPhase("done");
          onDone("already-refunded", json);
          onOpenChange(false);
          return;
        }
        throw new Error(json.message ?? `Refund failed (${res.status})`);
      }

      if (json.noPayment) {
        toast.success(json.message ?? "Cancelling without refund");
        setPhase("done");
        onDone("no-payment", json);
        onOpenChange(false);
        return;
      }
      if (json.requiresProof) {
        setPhase("awaiting-proof");
        setServerMsg(json.message ?? null);
        return;
      }
      // Razorpay refund finished — id + amount in response.
      toast.success(
        json.refundId
          ? `Refund processed · ${json.refundId}`
          : "Refund processed"
      );
      setPhase("done");
      onDone("razorpay", json);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refund failed");
      setPhase("idle");
    }
  };

  const uploadProof = async () => {
    if (!file) {
      toast.error("Pick a refund-proof screenshot first");
      return;
    }
    setPhase("uploading");
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("amount", String(amountNum));
      if (reason) fd.set("reason", reason);
      fd.set("finalOrderStatus", finalOrderStatus);
      const res = await fetch(`/api/orders/${orderId}/refund/proof`, {
        method: "POST",
        body: fd,
      });
      const json = (await res.json().catch(() => ({}))) as RefundInitiateResponse & {
        message?: string;
        refundProofUrl?: string;
      };
      if (!res.ok) {
        throw new Error(json.message ?? `Upload failed (${res.status})`);
      }
      setProofUrl(json.refundProofUrl ?? null);
      toast.success("Refund proof uploaded");
      setPhase("done");
      onDone("proof", json);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
      setPhase("awaiting-proof");
    }
  };

  const busy =
    phase === "initiating" || phase === "uploading";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!busy) onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {finalOrderStatus === "DELIVERY_FAILED"
              ? "Refund — delivery failed"
              : "Refund customer"}
          </DialogTitle>
          <DialogDescription>
            {phase === "awaiting-proof"
              ? "Upload the screenshot of the refund you sent the customer."
              : isOnline
              ? "We'll refund this Razorpay payment automatically."
              : "Refund the customer in your banking app, then upload a screenshot."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Payment type</span>
              <span className="font-medium">
                {paymentTypeLabel(payment?.paymentType)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Amount paid</span>
              <span className="font-medium tabular-nums">
                {formatINR(maxAmount)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="refund-amount">Refund amount (₹)</Label>
            <Input
              id="refund-amount"
              type="number"
              inputMode="decimal"
              min={1}
              max={maxAmount}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={phase === "awaiting-proof" || busy}
            />
            <span className="text-[11px] text-muted-foreground">
              Up to {formatINR(maxAmount)} — partial refunds allowed.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="refund-reason">Reason (optional)</Label>
            <Input
              id="refund-reason"
              placeholder="e.g. Out of stock"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
            />
          </div>

          {phase === "awaiting-proof" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="refund-proof">Refund proof screenshot</Label>
              <Input
                id="refund-proof"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={busy}
              />
              {serverMsg && (
                <span className="text-[11px] text-muted-foreground">
                  {serverMsg}
                </span>
              )}
            </div>
          )}

          {proofUrl && (
            <div className="text-xs text-muted-foreground">
              Uploaded: <span className="font-mono">{proofUrl}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          {phase === "awaiting-proof" || phase === "uploading" ? (
            <Button onClick={uploadProof} disabled={busy || !file}>
              {phase === "uploading" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  Upload &amp; finalize
                </>
              )}
            </Button>
          ) : (
            <Button onClick={initiate} disabled={busy || !amountValid}>
              {phase === "initiating" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Processing…
                </>
              ) : isOnline ? (
                "Refund via Razorpay"
              ) : (
                "Continue"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
