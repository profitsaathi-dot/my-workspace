"use client";

import { use, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@workspace/ui";
import type { PublicTracking } from "@/src/types/tracking";
import {
  OrderSummary,
  PageShell,
  RefundCard,
  TrackingCard,
  TrackingSkeleton,
} from "../_components/TrackingView";

/**
 * Deep-link tracking page. Customer follows the seller's
 * /track/<publicToken> link straight to their order. The token alone is
 * the secret — anonymous, no inputs.
 */
export default function TrackByTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<PublicTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/track/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(body.message ?? "Order not found");
        }
        setData((await res.json()) as PublicTracking);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  return (
    <PageShell>
      {loading && <TrackingSkeleton />}

      {!loading && error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="grid place-items-center gap-2 py-12 text-center">
            <AlertTriangle className="size-6 text-red-300" />
            <h2 className="text-base font-semibold">Couldn't find this order</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Check the link with your seller — it may have a typo.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && data && (
        <>
          <OrderSummary data={data} />
          <RefundCard
            data={data}
            proofUrl={`/api/track/${encodeURIComponent(token)}/refund-proof`}
          />
          <TrackingCard data={data} />
        </>
      )}
    </PageShell>
  );
}
