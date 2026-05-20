"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  Search,
  Truck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@workspace/ui";
import type { PublicTracking } from "@/types/tracking";
import {
  OrderSummary,
  PageShell,
  RefundCard,
  TrackingCard,
  TrackingSkeleton,
} from "./_components/TrackingView";
import { ReviewDialog } from "./_components/ReviewDialog";

export default function TrackByOrderNoPage() {
  return (
    <PageShell>
      <Suspense fallback={<TrackingSkeleton />}>
        <TrackForm />
      </Suspense>
    </PageShell>
  );
}

function TrackForm() {
  const t = useTranslations("customer.track");
  const searchParams = useSearchParams();
  const queryOrderNo = useMemo(() => {
    return (
      searchParams?.get("orderNo") ??
      searchParams?.get("orderId") ??
      searchParams?.get("id") ??
      ""
    ).trim();
  }, [searchParams]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [hasValue, setHasValue] = useState(queryOrderNo.length > 0);
  const [data, setData] = useState<PublicTracking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  const search = useCallback(async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      setError(t("enterOrderId"));
      setData(null);
      setTouched(true);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/user/api/track-by-no/${encodeURIComponent(trimmed)}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? t("orderNotFound"));
      }
      setData((await res.json()) as PublicTracking);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : t("couldNotLoad"));
    } finally {
      setLoading(false);
      setTouched(true);
    }
  }, [t]);

  const autoSearchedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!queryOrderNo) return;
    if (autoSearchedRef.current === queryOrderNo) return;
    autoSearchedRef.current = queryOrderNo;
    if (inputRef.current) inputRef.current.value = queryOrderNo;
    setHasValue(true);
    search(queryOrderNo);
  }, [queryOrderNo, search]);

  const refreshHasValue = useCallback(() => {
    const v = inputRef.current?.value ?? "";
    setHasValue(v.trim().length > 0);
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(inputRef.current?.value ?? "");
  };

  const canSearch = !loading && hasValue;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="size-4 text-[color:var(--accent)]" />
            {t("pageTitle")}
          </CardTitle>
          <CardDescription>
            {t("pageDesc")}{" "}
            <code className="rounded bg-muted px-1 font-mono text-[11px]">
              ORD-XXXXXXXX
            </code>
            {t("pageDescSuffix")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="orderNo" className="sr-only">
                {t("orderIdLabel")}
              </Label>
              <Input
                ref={inputRef}
                id="orderNo"
                name="orderNo"
                type="text"
                defaultValue={queryOrderNo}
                onChange={refreshHasValue}
                onInput={refreshHasValue}
                onPaste={refreshHasValue}
                onBlur={refreshHasValue}
                placeholder={t("orderIdPlaceholder")}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                className="font-mono uppercase tracking-wide"
                aria-invalid={touched && !!error ? true : undefined}
              />
            </div>
            <Button type="submit" disabled={!canSearch}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("searching")}
                </>
              ) : (
                <>
                  <Search className="size-4" />
                  {t("trackOrder")}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading && <TrackingSkeleton />}

      {!loading && error && touched && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="grid place-items-center gap-2 py-10 text-center">
            <AlertTriangle className="size-6 text-red-300" />
            <h2 className="text-base font-semibold">{t("couldntFindThatOrder")}</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("doubleCheckOrderId")}
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && data && (
        <>
          <OrderSummary data={data} />
          <RefundCard
            data={data}
            proofUrl={
              data.orderNo
                ? `/user/api/track-by-no/${encodeURIComponent(data.orderNo)}/refund-proof`
                : undefined
            }
          />
          <TrackingCard 
            data={data} 
            onReviewClick={() => setShowReviewDialog(true)}
          />
          
          {/* Review Dialog */}
          {data.orderNo && data.product?.name && (
            <ReviewDialog
              open={showReviewDialog}
              onOpenChange={setShowReviewDialog}
              orderNo={data.orderNo}
              productName={data.product.name}
            />
          )}
        </>
      )}
    </>
  );
}
