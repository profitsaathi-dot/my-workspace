"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  toast,
} from "@workspace/ui";
import {
  Banknote,
  Check,
  Copy,
  Image as ImageIcon,
  Landmark,
  Loader2,
  QrCode,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { copyToClipboard } from "@/app/lib/clipboard";

export type OfflinePaymentMode = "UPI_QR" | "BANK_ACCOUNT";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: OfflinePaymentMode;
  amount: number;
  orderId: string;
  storeToken: string;
  bankAccountNumber?: string | null;
  bankAccountIfsc?: string | null;
  storeName?: string | null;
  onCompleted: () => void;
}

const formatAcc = (acc: string) =>
  acc.replace(/(.{4})/g, "$1 ").trim();

export default function OfflinePayment({
  open,
  onOpenChange,
  mode,
  amount,
  orderId,
  storeToken,
  bankAccountNumber,
  bankAccountIfsc,
  storeName,
  onCompleted,
}: Props) {
  const t = useTranslations("customer.offlinePayment");

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Pull the seller's uploaded UPI QR image whenever this dialog opens for a
  // UPI flow. Sourced from /api/v1/store/payment-qr (the seller's own image),
  // not the dynamic generator — buyers must scan the seller's actual QR.
  useEffect(() => {
    if (!open || mode !== "UPI_QR" || !storeToken) return;
    let revoke: string | null = null;
    let cancelled = false;
    fetch(`/user/api/store/payment-qr?token=${encodeURIComponent(storeToken)}`)
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (cancelled || !blob) return;
        const url = URL.createObjectURL(blob);
        revoke = url;
        setQrUrl(url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [open, mode, storeToken]);

  // Reset transient state when the dialog closes.
  useEffect(() => {
    if (!open) {
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setUploading(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (!ok) {
      toast.error(t("copyFailed"));
      return;
    }
    setCopiedKey(key);
    toast.success(t("copied"));
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const onPickFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error(t("invalidImage"));
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast.error(t("tooLarge"));
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file) {
      toast.error(t("selectScreenshot"));
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("orderId", orderId);
      fd.append("paymentType", mode);
      fd.append("amount", String(amount));
      const res = await fetch("/user/api/payment/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("upload failed");
      toast.success(t("uploaded"));
      onCompleted();
    } catch (e) {
      console.error(e);
      toast.error(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const isBank = mode === "BANK_ACCOUNT";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isBank ? (
              <Landmark className="size-5 text-[color:var(--accent)]" />
            ) : (
              <QrCode className="size-5 text-[color:var(--accent)]" />
            )}
            {isBank ? t("bankTitle") : t("qrTitle")}
          </DialogTitle>
          <DialogDescription>
            {isBank ? t("bankDesc") : t("qrDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount */}
          <div className="flex items-center justify-between rounded-lg border border-themed bg-[color:var(--accent-soft)] p-3">
            <span className="text-[10px] uppercase tracking-widest text-[color:var(--accent)] font-semibold">
              {t("amount")}
            </span>
            <span className="font-semibold text-lg text-[color:var(--accent)]">
              ₹{amount.toFixed(2)}
            </span>
          </div>

          {/* Body — QR or Bank */}
          {isBank ? (
            <div className="space-y-2">
              {storeName && (
                <div className="rounded-lg border border-themed p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
                    {t("payee")}
                  </p>
                  <p className="text-sm font-medium">{storeName}</p>
                </div>
              )}

              <div className="rounded-lg border border-themed p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
                    {t("accountNumber")}
                  </p>
                  <p className="font-mono text-sm tabular-nums truncate">
                    {bankAccountNumber ? formatAcc(bankAccountNumber) : "—"}
                  </p>
                </div>
                {bankAccountNumber && (
                  <button
                    onClick={() => copy("acc", bankAccountNumber)}
                    className="p-2 rounded-md hover:bg-muted transition shrink-0"
                    aria-label="Copy account number"
                  >
                    {copiedKey === "acc" ? (
                      <Check className="size-4 text-[color:var(--accent)]" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </button>
                )}
              </div>

              <div className="rounded-lg border border-themed p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
                    {t("ifsc")}
                  </p>
                  <p className="font-mono text-sm tracking-wide truncate">
                    {bankAccountIfsc || "—"}
                  </p>
                </div>
                {bankAccountIfsc && (
                  <button
                    onClick={() => copy("ifsc", bankAccountIfsc)}
                    className="p-2 rounded-md hover:bg-muted transition shrink-0"
                    aria-label="Copy IFSC"
                  >
                    {copiedKey === "ifsc" ? (
                      <Check className="size-4 text-[color:var(--accent)]" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </button>
                )}
              </div>

              <p className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                <Banknote className="size-3.5 mt-0.5 shrink-0" />
                <span>{t("bankNote")}</span>
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="size-56 rounded-lg border border-themed bg-white flex items-center justify-center overflow-hidden">
                {qrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrUrl} alt="UPI QR" className="w-full h-full object-contain" />
                ) : (
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center px-2">
                {t("qrNote")}
              </p>
            </div>
          )}

          {/* Order id */}
          <div className="rounded-lg border border-themed p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
                {t("orderId")}
              </p>
              <p className="font-mono text-sm truncate">{orderId}</p>
            </div>
            <button
              onClick={() => copy("oid", orderId)}
              className="p-2 rounded-md hover:bg-muted transition shrink-0"
              aria-label="Copy order id"
            >
              {copiedKey === "oid" ? (
                <Check className="size-4 text-[color:var(--accent)]" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>

          {/* Proof upload */}
          <div className="space-y-2">
            <p className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="size-4 text-[color:var(--accent)]" />
              {t("proofTitle")}
            </p>
            <p className="text-xs text-muted-foreground">{t("proofDesc")}</p>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />

            {preview ? (
              <div className="rounded-lg border border-themed p-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="payment proof"
                  className="size-16 rounded-md object-cover bg-muted"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {file?.name ?? "screenshot"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file?.size ?? 0) > 0
                      ? `${((file!.size) / 1024).toFixed(0)} KB`
                      : ""}
                  </p>
                </div>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="text-xs text-[color:var(--accent)] font-medium px-2 py-1 rounded-md hover:bg-[color:var(--accent-soft)] transition"
                >
                  {t("change")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => inputRef.current?.click()}
                className="w-full rounded-lg border border-dashed border-themed bg-muted/30 hover:bg-muted/60 transition py-6 flex flex-col items-center justify-center gap-1"
              >
                <Upload className="size-5 text-muted-foreground" />
                <span className="text-sm font-medium">{t("uploadCta")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("uploadHint")}
                </span>
              </button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            {t("cancel")}
          </Button>
          <Button onClick={submit} disabled={uploading || !file}>
            {uploading ? (
              <>
                <Loader2 className="animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
