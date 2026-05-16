"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Share2,
  Zap,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  Textarea,
  Topbar,
  formatINR,
  toast,
} from "@workspace/ui";
import type { ProductSimple } from "@/src/types/product";
import type { DynamicPriceListing } from "@/src/types/dynamicPrice";

interface FormState {
  productId: string;
  price: string;
  customerName: string;
  note: string;
  expiryHours: string;
}

const empty: FormState = {
  productId: "",
  price: "",
  customerName: "",
  note: "",
  expiryHours: "24",
};

export default function NewDynamicPricePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(empty);
  const [products, setProducts] = useState<ProductSimple[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<DynamicPriceListing | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/products/all", { cache: "no-store" });
        if (!res.ok) throw new Error(`Backend ${res.status}`);
        const data = (await res.json()) as ProductSimple[];
        setProducts(Array.isArray(data) ? data : []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load products");
      } finally {
        setLoadingProducts(false);
      }
    };
    load();
  }, []);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === form.productId),
    [products, form.productId]
  );

  const priceNumber = Number(form.price) || 0;
  const expiryHoursNumber = Math.max(1, Math.min(720, Number(form.expiryHours) || 24));

  const valid = !!form.productId && priceNumber > 0;

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/dynamic-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: Number(form.productId),
          price: priceNumber,
          customerName: form.customerName.trim() || undefined,
          note: form.note.trim() || undefined,
          expiryHours: expiryHoursNumber,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Backend ${res.status}`);
      }
      const data = (await res.json()) as DynamicPriceListing;
      setCreated(data);
      toast.success("Link created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create link");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Topbar
        title="New dynamic-price link"
        subtitle="Pick a product, set a one-time price, share with one customer."
        actions={
          <a href="/products/dynamic">
            <Button variant="outline">
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </a>
        }
      />

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-3 sm:p-4 sm:gap-6 lg:p-6">
        {!created && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="size-4 text-[color:var(--accent)]" />
                Listing details
              </CardTitle>
              <CardDescription>
                Name and description come from the product master. The price is set per link.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field label="Product" required>
                <Select
                  value={form.productId}
                  onChange={(e) => setField("productId", e.target.value)}
                  disabled={loadingProducts}
                >
                  <option value="">
                    {loadingProducts ? "Loading…" : "Select a product"}
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                      {p.sellingPrice ? ` — ${formatINR(p.sellingPrice)}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Price for this link"
                hint="What the customer will pay"
                required
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="0"
                    value={form.price}
                    onChange={(e) => setField("price", e.target.value)}
                    className="pl-7"
                  />
                </div>
              </Field>

              <Field label="Customer name" hint="Optional — shown to the buyer">
                <Input
                  value={form.customerName}
                  onChange={(e) => setField("customerName", e.target.value)}
                  placeholder="e.g. Riya"
                />
              </Field>

              <Field label="Note" hint="Optional — shown on the public link">
                <Textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => setField("note", e.target.value)}
                  placeholder="e.g. Includes gift wrap, custom engraving"
                />
              </Field>

              <Field label="Expires in" hint="Default 24 hours · max 720">
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    max="720"
                    value={form.expiryHours}
                    onChange={(e) => setField("expiryHours", e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    hours
                  </span>
                </div>
              </Field>

              {selectedProduct && (
                <div className="rounded-lg border bg-muted/40 p-3 text-xs">
                  <div className="text-muted-foreground">Listed price</div>
                  <div className="mt-0.5 tabular-nums">
                    {formatINR(selectedProduct.sellingPrice ?? 0)}
                  </div>
                </div>
              )}

              <Button onClick={submit} disabled={!valid || submitting} size="lg">
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    Create link
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

      </main>

      <CreatedDialog
        listing={created}
        onAnother={() => {
          setCreated(null);
          setForm(empty);
        }}
        onDone={() => router.push("/products/dynamic")}
      />
    </>
  );
}

function CreatedDialog({
  listing,
  onAnother,
  onDone,
}: {
  listing: DynamicPriceListing | null;
  onAnother: () => void;
  onDone: () => void;
}) {
  const url =
    listing
      ? typeof window === "undefined"
        ? `/dp/${listing.publicToken}`
        : `${window.location.origin}/dp/${listing.publicToken}`
      : "";

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const shareWA = () => {
    if (!listing) return;
    const text = encodeURIComponent(
      `Here's your custom price${listing.product?.name ? ` for ${listing.product.name}` : ""}: ${url}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <Dialog open={listing !== null} onOpenChange={(open) => !open && onDone()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="size-4 text-[color:var(--accent)]" />
            Link ready
          </DialogTitle>
          <DialogDescription>
            Share this with your customer. The link works once and expires automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="text-xs text-muted-foreground">
              {listing?.product?.name ?? "—"} ·{" "}
              {formatINR(Number(listing?.price) || 0)}
            </div>
            <div className="mt-1 break-all font-mono text-xs">{url}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={copy}>
              <Copy className="size-4" />
              Copy
            </Button>
            <Button onClick={shareWA} className="bg-green-500 hover:bg-green-400">
              <Share2 className="size-4" />
              WhatsApp
            </Button>
          </div>

          <a
            href={url || "#"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1 text-center text-sm text-[color:var(--accent)]"
          >
            Open link <ExternalLink className="size-3.5" />
          </a>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onAnother}>
            Create another
          </Button>
          <Button onClick={onDone}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <Label>
          {label}
          {required && <span className="ml-1 text-[color:var(--accent)]">*</span>}
        </Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
