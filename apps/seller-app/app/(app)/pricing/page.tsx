"use client";

import { useCallback, useState } from "react";

import {
  AlertTriangle,
  Calculator,
  Sparkles,
  Tag,
  TrendingUp,
  MapPinned,
} from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Topbar,
  formatINR,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui";

import { useT } from "@/src/i18n/useT";

interface PriceAdviserResponse {
  totalCost: number;

  breakEven: number;

  aggressivePrice: number;

  safePrice: number;

  premiumPrice: number;

  margin: {
    breakEven: number;
    aggressive: number;
    safe: number;
    premium: number;
  };

  suggested: number;

  strategy: string;

  warning: string;

  orderId?: string;

  message?: string;
  location?: string;
}

export default function PricingPage() {
  const t = useT();

  const [costPrice, setCostPrice] = useState("");
  const [shipping, setShipping] = useState("");
  const [packaging, setPackaging] = useState("");
  const [competitor, setCompetitor] = useState("");

  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [sellingMethod, setSellingMethod] = useState("social");
  const [locationStatus, setLocationStatus] =useState<"idle" | "loading" | "granted" | "denied">("idle");
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const getLocation = (): Promise<{ lat: number | null; lng: number | null }> => {
    return new Promise((resolve) => {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      setLocationDialogOpen(true);
      resolve({ lat: null, lng: null });
      return;
    }

    setLocationStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationStatus("granted");
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        setLocationStatus("denied");
        setLocationDialogOpen(true);
        resolve({ lat: null, lng: null });
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );
    });
  };

  const [result, setResult] =
    useState<PriceAdviserResponse | null>(null);

  const [syncing, setSyncing] = useState(false);

  // FIXED API CALL
  const onSync = useCallback(async () => {
    if (syncing) return;

    try {
      setSyncing(true);

        let lat: number | null = null;
        let lng: number | null = null;

        // only request if not already granted
       if (locationStatus !== "granted") {
         const loc = await getLocation();
          lat = loc.lat;
         lng = loc.lng;
        }

      const payload = {
        costPrice,
        shippingCost: shipping,
        packagingCost: packaging,
        competitorPrice: competitor,
        productName,
        sellingmethoid: sellingMethod,
        description,
        lat ,
        lng,
      };

      const res = await fetch(
        "/api/ai/price-adviser/sync",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({}));

        throw new Error(
          (body as { message?: string }).message ??
            `HTTP ${res.status}`
        );
      }

      const body =
        (await res.json()) as PriceAdviserResponse;

      setResult(body);

    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  }, [
    syncing,
    costPrice,
    shipping,
    packaging,
    competitor,
    productName,
    description,
    sellingMethod,
    locationStatus,
  ]);

  const reset = () => {
    setCostPrice("");
    setShipping("");
    setPackaging("");
    setCompetitor("");
    setProductName("");
    setDescription("");
    setResult(null);
  };

  return (
    <>
      <Topbar
  title={t("pricing.title")}
  subtitle={t("pricing.subtitle")}
  actions={
    <>
      <Badge variant="success">
        <Sparkles className="size-3" />
        {t("pricing.aiStrategy")}
      </Badge>

      <Badge variant="outline">
        <MapPinned className="size-3" />
        {result?.location ?? "Unknown"}
      </Badge>
    </>
  }
/>

      <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-4 p-3 sm:p-4 sm:gap-6 lg:grid-cols-5 lg:p-6">



<AlertDialog
  open={locationDialogOpen}
  onOpenChange={(open) => {
    if (!open && !requestingLocation) {
      setLocationDialogOpen(false);
    }
  }}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        Allow location access?
      </AlertDialogTitle>

      <AlertDialogDescription>
        We use your location to improve pricing accuracy based on local market conditions and shipping costs.
      </AlertDialogDescription>
    </AlertDialogHeader>

    <AlertDialogFooter>
      <AlertDialogCancel disabled={requestingLocation}>
        Cancel
      </AlertDialogCancel>

      <AlertDialogAction
        onClick={async (e) => {
          e.preventDefault();

          try {
            setRequestingLocation(true);

            const loc = await getLocation();

            if (loc.lat && loc.lng) {
              setLocationStatus("granted");
              setLocationDialogOpen(false);
            }
          } finally {
            setRequestingLocation(false);
          }
        }}
      >
        {requestingLocation ? "Requesting..." : "Allow"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

{locationStatus === "loading" && (
  <div className="mb-4 text-sm text-muted-foreground">
    Getting your location...
  </div>
)}


        {/* LEFT FORM */}

        <Card className="lg:col-span-2">

          <CardHeader>
            <CardTitle>
              {t("pricing.yourCosts")}
            </CardTitle>

            <CardDescription>
              {t("pricing.yourCostsDesc")}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">

            <Field
              id="productName"
              label="Product Name"
              value={productName}
              onChange={setProductName}
            />

            <Field
              id="description"
              label="Description"
              value={description}
              onChange={setDescription}
            />

           

            <Field
              id="cost"
              label={t("pricing.cost")}
              hint={t("pricing.costHint")}
              value={costPrice}
              onChange={setCostPrice}
              required
            />

            <Field
              id="shipping"
              label={t("pricing.shipping")}
              hint={t("pricing.shippingHint")}
              value={shipping}
              onChange={setShipping}
            />

            <Field
              id="packaging"
              label={t("pricing.packaging")}
              hint={t("pricing.packagingHint")}
              value={packaging}
              onChange={setPackaging}
            />

            <Field
              id="competitor"
              label={t("pricing.competitor")}
              hint={t("pricing.competitorHint")}
              value={competitor}
              onChange={setCompetitor}
            />

            <div className="flex items-center justify-between border-t border pt-4">
              <span className="text-xs text-muted-foreground">
                {t("pricing.totalCost")}
              </span>

              <span className="text-lg font-semibold tabular-nums">
                {result
                  ? formatINR(result.totalCost)
                  : "—"}
              </span>
            </div>

            <div className="flex gap-2">

              <Button
                onClick={onSync}
                disabled={syncing}
                className="flex-1"
              >
                {syncing
                  ? "Calculating..."
                  : "Calculate Pricing"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
              >
                {t("pricing.reset")}
              </Button>

            </div>

          </CardContent>
        </Card>

        {/* RIGHT SIDE */}

        <div className="flex flex-col gap-6 lg:col-span-3">

          {!result ? (

            <Card>

              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">

                <div className="grid size-12 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                  <Calculator className="size-5" />
                </div>

                <h2 className="text-lg font-semibold">
                  {t("pricing.beginTitle")}
                </h2>

                <p className="max-w-sm text-sm text-muted-foreground">
                  {t("pricing.beginDesc")}
                </p>

              </CardContent>

            </Card>

          ) : (
            <>
              {/* PRICE TILES */}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                <PriceTile
                  label={t("pricing.tileBreakEven")}
                  price={result.breakEven}
                  margin={result.margin.breakEven}
                  tone="muted"
                />

                <PriceTile
                  label={t("pricing.tileAggressive")}
                  price={result.aggressivePrice}
                  margin={result.margin.aggressive}
                  tone="info"
                />

                <PriceTile
                  label={t("pricing.tileSafe")}
                  price={result.safePrice}
                  margin={result.margin.safe}
                  tone="success"
                  recommended={
                    Math.abs(
                      result.suggested -
                        result.safePrice
                    ) < 1
                  }
                />

                <PriceTile
                  label={t("pricing.tilePremium")}
                  price={result.premiumPrice}
                  margin={result.margin.premium}
                  tone="amber"
                />

              </div>

              {/* SUGGESTED CARD */}

              <Card>

                <CardHeader className="flex-row items-start justify-between">

                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="size-4 text-[color:var(--accent)]" />
                      {t("pricing.suggested")}
                    </CardTitle>

                    <CardDescription>
                      {t("pricing.suggestedDesc")}
                    </CardDescription>
                  </div>

                  <span className="text-3xl font-semibold tabular-nums text-[color:var(--accent)]">
                    {formatINR(
                      Math.round(result.suggested)
                    )}
                  </span>

                </CardHeader>

                <CardContent className="flex flex-col gap-4">

                  <div className="rounded-lg border border-[color:var(--accent)]/20 bg-[color:var(--accent-soft)]/50 p-4">

                    <div className="mb-1 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[color:var(--accent)]">

                      <Sparkles className="size-3.5" />

                      {t("pricing.aiStrategy")}

                    </div>

                    <p className="text-sm text-foreground">
                      {result.strategy}
                    </p>

                  </div>

                  {result.warning && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200">

                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />

                      <p>{result.warning}</p>

                    </div>
                  )}

                  {/* STATS */}

                  <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/40 p-4 sm:grid-cols-4">

                    <Stat
                      label={t("pricing.totalCost")}
                      value={formatINR(
                        result.totalCost
                      )}
                    />

                    <Stat
                      label={t("pricing.profitPerUnit")}
                      value={formatINR(
                        Math.round(
                          result.suggested -
                            result.totalCost
                        )
                      )}
                      tone="emerald"
                    />

                    <Stat
                      label={t("pricing.margin")}
                      value={`${(
                        ((result.suggested -
                          result.totalCost) /
                          result.suggested) *
                        100
                      ).toFixed(1)}%`}
                      tone="emerald"
                    />

                    <Stat
                      label={t("pricing.vsCompetitor")}
                      value={
                        parseFloat(competitor) > 0
                          ? `${(
                              ((result.suggested -
                                parseFloat(
                                  competitor
                                )) /
                                parseFloat(
                                  competitor
                                )) *
                              100
                            ).toFixed(1)}%`
                          : "—"
                      }
                    />

                  </div>

                  <div className="flex flex-wrap gap-2">

                    <Button>
                      <TrendingUp className="size-4" />
                      {t(
                        "pricing.saveToProduct"
                      )}
                    </Button>

                    <Button variant="outline">
                      {t(
                        "pricing.compareLast"
                      )}
                    </Button>

                  </div>

                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  required,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">

      <div className="flex items-baseline justify-between">

        <Label htmlFor={id}>
          {label}

          {required && (
            <span className="ml-1 text-[color:var(--accent)]">
              *
            </span>
          )}
        </Label>

        {hint && (
          <span className="text-xs text-muted-foreground">
            {hint}
          </span>
        )}
      </div>

      <div className="relative">

        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          ₹
        </span>

        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          className="pl-7"
        />

      </div>
    </div>
  );
}

function PriceTile({
  label,
  price,
  margin,
  tone,
  recommended,
}: {
  label: string;
  price: number;
  margin: number;
  tone: "muted" | "success" | "info" | "amber";
  recommended?: boolean;
}) {

  const t = useT();

  const ring =
    tone === "success"
      ? "border-[color:var(--accent)]/40 bg-[color:var(--accent-soft)]/50"
      : tone === "info"
      ? "border-sky-500/30 bg-sky-500/5"
      : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/5"
      : "border bg-muted/30";

  const text =
    tone === "success"
      ? "text-[color:var(--accent)]"
      : tone === "info"
      ? "text-sky-400"
      : tone === "amber"
      ? "text-amber-400"
      : "text-foreground";

  return (
    <div
      className={`relative rounded-xl border p-4 ${ring}`}
    >

      {recommended && (
        <span className="absolute -top-2 right-3 rounded-full bg-[color:var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--accent-foreground)]">
          {t("common.recommended")}
        </span>
      )}

      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div
        className={`mt-1 text-xl font-semibold tabular-nums ${text}`}
      >
        {formatINR(Math.round(price))}
      </div>

      <div className="mt-0.5 text-xs text-muted-foreground">
        {margin.toFixed(1)}
        {t("pricing.marginSuffix")}
      </div>

    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald";
}) {
  return (
    <div>

      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div
        className={`mt-1 text-base font-semibold tabular-nums ${
          tone === "emerald"
            ? "text-[color:var(--accent)]"
            : "text-foreground"
        }`}
      >
        {value}
      </div>

    </div>
  );
}