"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  Search,
  Truck,
} from "lucide-react";
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
import type { PublicTracking } from "@/src/types/tracking";
import {
  OrderSummary,
  PageShell,
  RefundCard,
  TrackingCard,
  TrackingSkeleton,
} from "./_components/TrackingView";

/**
 * Form-driven tracking page. Customer types (or pastes) their order ID and
 * we look it up via the by-orderNo endpoint. Supports `?orderNo=...` (or
 * `?orderId=...`) so a seller can share a link that auto-runs the search.
 *
 * Why uncontrolled input:
 *   We hit a real-world bug on Android Chrome where a controlled input
 *   (`value` + `onChange`) racing with predictive-text / swipe / paste
 *   events left React state stuck on the empty initial value — the button
 *   stayed disabled even after the user clearly typed an ID. Switching to
 *   an uncontrolled input (`defaultValue` + ref) reads the DOM directly,
 *   sidestepping the race entirely.
 *
 * useSearchParams() is read inside a Suspense boundary because Next.js 16
 * requires it (the hook suspends during initial static render).
 */
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
  const searchParams = useSearchParams();
  // Accept any of the common query-param names so links from different
  // sources (admin tools, marketing, the seller's own systems) just work.
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

  const search = useCallback(async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      setError("Enter your order ID");
      setData(null);
      setTouched(true);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/track-by-no/${encodeURIComponent(trimmed)}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Order not found");
      }
      setData((await res.json()) as PublicTracking);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Could not load");
    } finally {
      setLoading(false);
      setTouched(true);
    }
  }, []);

  // Auto-run when the URL carries an order id. Push the value into the
  // DOM via the ref (uncontrolled inputs require manual sync) and arm the
  // submit-enable flag so the user can re-trigger from the same form.
  const autoSearchedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!queryOrderNo) return;
    if (autoSearchedRef.current === queryOrderNo) return;
    autoSearchedRef.current = queryOrderNo;
    if (inputRef.current) inputRef.current.value = queryOrderNo;
    setHasValue(true);
    search(queryOrderNo);
  }, [queryOrderNo, search]);

  // Single source of truth for "is there text in the input": the DOM.
  // We listen to BOTH `change` and `input` to cover every mobile-keyboard
  // path — predictive text and IME composition tend to fire `input` only,
  // while paste / blur fire `change` only. Either keeps the button in
  // sync with reality.
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
            Track your order
          </CardTitle>
          <CardDescription>
            Enter the order ID your seller shared (looks like{" "}
            <code className="rounded bg-muted px-1 font-mono text-[11px]">
              ORD-XXXXXXXX
            </code>
            ).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="orderNo" className="sr-only">
                Order ID
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
                placeholder="ORD-A1B2C3D4"
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                // Visual uppercase via CSS only — don't transform the
                // underlying value (that introduces the very race we
                // just fixed).
                className="font-mono uppercase tracking-wide"
                aria-invalid={touched && !!error ? true : undefined}
              />
            </div>
            <Button type="submit" disabled={!canSearch}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Searching…
                </>
              ) : (
                <>
                  <Search className="size-4" />
                  Track order
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
            <h2 className="text-base font-semibold">Couldn't find that order</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Double-check the order ID with your seller.
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
                ? `/api/track-by-no/${encodeURIComponent(data.orderNo)}/refund-proof`
                : undefined
            }
          />
          <TrackingCard data={data} />
        </>
      )}
    </>
  );
}
