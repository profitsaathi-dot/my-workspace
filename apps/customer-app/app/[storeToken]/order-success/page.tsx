"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Copy, Check, CheckCircle2, MessageCircle, Truck } from "lucide-react";
import { Button, Card, toast } from "@workspace/ui";
import { useTranslations } from "next-intl";
import { copyToClipboard } from "@/app/lib/clipboard";

interface StoreInfo {
  name: string | null;
  whatsapp: string | null;
  email: string | null;
}

/** Strip non-digits and prefix India country code if missing. */
const normalisePhone = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

export default function OrderSuccessPage() {
  const params = useSearchParams();
  const { storeToken } = useParams<{ storeToken: string }>();
  const orderId = params.get("orderId");
  const t = useTranslations("customer.orderSuccess");

  const [copied, setCopied] = useState(false);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);

  // Track the last-used variant index so consecutive clicks never repeat the
  // same phrasing — keeps the message looking organic to the seller.
  const lastVariantIdx = useRef<number | null>(null);

  useEffect(() => {
    if (!storeToken) return;
    fetch(`/user/api/store/info?token=${encodeURIComponent(storeToken)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStoreInfo(data))
      .catch(() => undefined);
  }, [storeToken]);

  const copyOrderId = async () => {
    if (!orderId) return;
    const result = await copyToClipboard(orderId);
    if (!result.success) {
      toast.error(result.error || t("copyFailed") || "Could not copy");
      return;
    }
    setCopied(true);
    toast.success(t("copied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const phone = normalisePhone(storeInfo?.whatsapp);

  /** Pick a random message variant that's different from the previous click. */
  const pickVariant = (): string => {
    const list = (t.raw("waMessages") as string[] | undefined) ?? [];
    if (list.length === 0) return "Hi";
    if (list.length === 1) return list[0];

    let idx = Math.floor(Math.random() * list.length);
    while (idx === lastVariantIdx.current) {
      idx = Math.floor(Math.random() * list.length);
    }
    lastVariantIdx.current = idx;
    return list[idx];
  };

  const handleTrack = () => {
    if (!phone) return;
    const message = pickVariant();
    const text = `${message}${orderId ? ` ${orderId}` : ""}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-background p-6 pattern-grid">
      <Card className="p-8 w-full max-w-md text-center space-y-6">
        <div className="grid size-16 mx-auto place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/20">
          <CheckCircle2 className="size-8" />
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("orderPlaced")}</h1>
          <p className="text-sm text-muted-foreground mt-2">{t("orderConfirmed")}</p>
        </div>

        {/* Order ID box */}
        <div className="bg-muted/50 border border-themed rounded-lg p-4 flex items-center justify-between">
          <span className="font-mono text-sm text-foreground truncate">{orderId}</span>
          <button
            onClick={copyOrderId}
            className="ml-3 p-2 rounded-md hover:bg-card transition shrink-0"
            aria-label="Copy order ID"
          >
            {copied ? (
              <Check className="size-4 text-[color:var(--accent)]" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </div>

        {/* Tracking link — hands the customer straight to the public
            tracking page with the orderNo pre-filled so the lookup runs
            on its own. Uses next/link so the /user basePath is preserved. */}
        {orderId && storeToken && (
          <p className="text-sm">
            <Link
              href={`/${encodeURIComponent(storeToken)}/track?orderNo=${encodeURIComponent(orderId)}`}
              className="inline-flex items-center gap-1.5 text-[color:var(--accent)] underline underline-offset-2 hover:no-underline"
            >
              <Truck className="size-4" />
              Track this order
            </Link>
          </p>
        )}

        {/* WhatsApp tracking — only renders when the store has a number on file */}
        {phone && (
          <div className="space-y-3 pt-1">
            <Button
              size="lg"
              className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white"
              onClick={handleTrack}
            >
              <MessageCircle />
              {t("trackOnWhatsapp")}
            </Button>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("trackHelp")}
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">{t("saveOrderId")}</p>
      </Card>
    </div>
  );
}
