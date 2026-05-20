"use client";

import { use, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@workspace/ui";
import type { PublicTracking } from "@/types/tracking";
import {
  OrderSummary,
  PageShell,
  RefundCard,
  TrackingCard,
  TrackingSkeleton,
} from "../_components/TrackingView";
import { ReviewDialog } from "../_components/ReviewDialog";

export default function TrackByTokenPage({
  params,
}: {
  params: Promise<{ token: string; storeToken: string }>;
}) {
  const t = useTranslations("customer.track");
  const { token, storeToken } = use(params);
  const [data, setData] = useState<PublicTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/user/api/track/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(body.message ?? t("orderNotFound"));
        }
        setData((await res.json()) as PublicTracking);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("couldNotLoad"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, t]);

  return (
    <PageShell>
      {loading && <TrackingSkeleton />}

      {!loading && error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="grid place-items-center gap-2 py-12 text-center">
            <AlertTriangle className="size-6 text-red-300" />
            <h2 className="text-base font-semibold">{t("couldntFindOrder")}</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("checkLinkSeller")}
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && data && (
        <>
          <OrderSummary data={data} />
          <RefundCard
            data={data}
            proofUrl={`/user/api/track/${encodeURIComponent(token)}/refund-proof`}
          />
          <TrackingCard 
            data={data} 
            onReviewClick={() => {
              setShowReviewDialog(true);
            }}
          />
          
          {/* Review Dialog */}
          {data.orderNo && data.product?.name ? (
            <ReviewDialog
              open={showReviewDialog}
              onOpenChange={(open) => {
                setShowReviewDialog(open);
              }}
              orderNo={data.orderNo}
              productName={data.product.name}
            />
          ) : null}
        </>
      )}
    </PageShell>
  );
}
