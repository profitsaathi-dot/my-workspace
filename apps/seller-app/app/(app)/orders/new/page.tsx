"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ImageIcon,
  Loader2,
  MapPin,
  Minus,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  User,
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
  Textarea,
  Topbar,
  formatINR,
} from "@workspace/ui";
import type { ProductSimple } from "@/src/types/product";
import { useT } from "@/src/i18n/useT";

interface ListItem extends ProductSimple {
  costPrice?: number;
  shippingCost?: number;
  packagingCost?: number;
}

export default function NewOrderPage() {
  const t = useT();
  const router = useRouter();
  const [products, setProducts] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<ListItem | null>(null);
  const [qty, setQty] = useState(1);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/products/simple", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as ListItem[];
        if (!cancelled) setProducts(Array.isArray(data) ? data : []);
      } catch {
        // backend down — leave list empty; user will see message
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      products.filter((p) =>
        p.name.toLowerCase().includes(q.toLowerCase())
      ),
    [products, q]
  );

  const unitPrice = selected?.sellingPrice ?? 0;
  const total = qty * unitPrice;
  const phoneValid = /^[6-9]\d{9}$/.test(phone);
  const canPlace =
    !!selected &&
    name.trim().length >= 2 &&
    phoneValid &&
    address.trim().length >= 5;

  const placeOrder = async () => {
    if (!selected || !canPlace || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        customerName: name.trim(),
        phoneNumber: phone.trim(),
        address: address.trim(),
        productId: selected.id,
        quantity: qty,
        unitPrice,
        totalAmount: total,
        comments: comments.trim() || "-",
        purchaseType: "APP_OWNER_ORDER",
      };
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Backend ${res.status}`);
      }
      setToast(t("orders.new.placed"));
      setTimeout(() => router.push("/orders"), 600);
    } catch (e) {
      setToast(e instanceof Error ? e.message : t("orders.new.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Topbar
        title={t("orders.new.title")}
        subtitle={t("orders.new.subtitle")}
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
        {toast && (
          <div className="fixed top-4 right-4 z-50 rounded-lg bg-[color:var(--accent-soft)] px-4 py-3 text-sm font-medium text-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/30">
            {toast}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: pick product */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("orders.new.step1")}</CardTitle>
              <CardDescription>
                {selected
                  ? t("orders.new.selectedHint")
                  : products.length === 0 && !loading
                  ? t("orders.new.noProductsHint")
                  : t("orders.new.matchCount", { n: filtered.length })}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("common.searchProducts")}
                  className="pl-9"
                />
              </div>

              {loading && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square animate-pulse rounded-lg bg-muted"
                    />
                  ))}
                </div>
              )}

              {!loading && filtered.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {filtered.map((p) => {
                    const isSel = selected?.id === p.id;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          setSelected(p);
                          setQty(1);
                        }}
                        className={`group flex flex-col overflow-hidden rounded-lg border text-left transition ${
                          isSel
                            ? "border-[color:var(--accent)]/60 bg-[color:var(--accent-soft)]"
                            : "border bg-muted/40 hover:border"
                        }`}
                      >
                        <div className="relative aspect-square bg-muted">
                          <ProductThumb id={p.id} />
                          {isSel && (
                            <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-[color:var(--accent)] text-[color:var(--accent-foreground)]">
                              <Check className="size-3" />
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 p-2">
                          <span className="line-clamp-2 text-xs font-medium">
                            {p.name}
                          </span>
                          <span className="text-xs font-semibold text-[color:var(--accent)]">
                            {formatINR(p.sellingPrice ?? 0)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {!loading && products.length === 0 && (
                <div className="grid place-items-center gap-2 rounded-lg border bg-muted/40 px-4 py-8 text-center">
                  <ShoppingCart className="size-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t("orders.new.addFirst")}
                  </p>
                  <a href="/products/new">
                    <Button size="sm">
                      <Plus className="size-4" />
                      {t("products.add")}
                    </Button>
                  </a>
                </div>
              )}

              {selected && (
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                  <div className="text-sm">{t("orders.new.quantity")}</div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQty((n) => Math.max(1, n - 1))}
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="w-8 text-center font-semibold tabular-nums">
                      {qty}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQty((n) => n + 1)}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: customer + summary */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("orders.new.step2")}</CardTitle>
                <CardDescription>{t("orders.new.step2Sub")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Field label={t("orders.new.fieldName")} icon={<User className="size-3.5" />}>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("orders.new.namePh")}
                  />
                </Field>
                <Field
                  label={t("orders.new.fieldPhone")}
                  icon={<Phone className="size-3.5" />}
                  error={phone.length > 0 && !phoneValid ? t("orders.new.invalidPhone") : undefined}
                >
                  <Input
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                  />
                </Field>
                <Field label={t("orders.new.fieldAddress")} icon={<MapPin className="size-3.5" />}>
                  <Textarea
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t("orders.new.addressPh")}
                  />
                </Field>
                <Field label={t("orders.new.fieldComments")}>
                  <Textarea
                    rows={2}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder={t("orders.new.commentsPh")}
                  />
                </Field>
              </CardContent>
            </Card>

            <Card className={selected ? "border-[color:var(--accent)]/30 bg-[color:var(--accent-soft)]/50" : ""}>
              <CardHeader>
                <CardTitle>{t("orders.new.step3")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {selected ? (
                  <>
                    <Row label={t("orders.new.product")} value={selected.name} />
                    <Row label={t("orders.new.unitPrice")} value={formatINR(unitPrice)} />
                    <Row label={t("orders.new.quantity")} value={`× ${qty}`} />
                    <div className="my-1 h-px bg-muted" />
                    <Row
                      label={t("orders.new.total")}
                      value={formatINR(total)}
                      bold
                      highlight
                    />
                  </>
                ) : (
                  <p className="text-muted-foreground">{t("orders.new.pickProduct")}</p>
                )}
              </CardContent>
            </Card>

            <Button
              size="lg"
              onClick={placeOrder}
              disabled={!canPlace || submitting}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("orders.new.placing")}
                </>
              ) : (
                <>
                  <ShoppingCart className="size-4" />
                  {t("orders.new.placeOrder")}
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}

function ProductThumb({ id }: { id: number }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div className="grid size-full place-items-center text-muted-foreground">
        <ImageIcon className="size-6" />
      </div>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/products/image?id=${id}&index=0`}
      alt=""
      className="size-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
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
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`tabular-nums ${
          highlight ? "text-[color:var(--accent)]" : "text-foreground"
        } ${bold ? "text-base font-semibold" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
