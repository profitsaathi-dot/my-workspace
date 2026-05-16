"use client";

import { use, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  ShoppingBag,
  Tag,
  MapPin,
  Phone,
  User,
  MessageSquare,
  ArrowRight,
  Copy,
  Check,
  Search,
} from "lucide-react";
import ProductImages from "./ProductImages";
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
  cn,
  formatINR,
} from "@workspace/ui";
import type { DynamicPriceListing } from "@/src/types/dynamicPrice";

interface BuyerForm {
  customerName: string;
  phoneNumber: string;
  address: string;
  pincode: string;
  city: string;
  state: string;
  quantity: string;
  comments: string;
}

const emptyForm: BuyerForm = {
  customerName: "",
  phoneNumber: "",
  address: "",
  pincode: "",
  city: "",
  state: "",
  quantity: "1",
  comments: "",
};

type PincodeStatus = "idle" | "loading" | "ok" | "notfound" | "error";

interface PincodeApiResponse {
  Status?: string;
  PostOffice?: Array<{ District?: string; State?: string }> | null;
}

export default function DynamicPricePublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [listing, setListing] = useState<DynamicPriceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<BuyerForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pincodeStatus, setPincodeStatus] = useState<PincodeStatus>("idle");
  const [copied, setCopied] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/dynamic-prices/public?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Listing not found or expired.");
        const data = await res.json();
        setListing(data);
        if (data.customerName) setForm((s) => ({ ...s, customerName: data.customerName }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load link");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  // 2. PIN Code Auto-fill
  useEffect(() => {
    const pin = form.pincode;
    if (pin.length !== 6) { setPincodeStatus("idle"); return; }
    const controller = new AbortController();
    setPincodeStatus("loading");
    (async () => {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: controller.signal });
        const json = (await res.json()) as PincodeApiResponse[];
        const entry = json[0];
        if (entry?.Status === "Success" && entry.PostOffice?.[0]) {
          const { District, State } = entry.PostOffice[0];
          setForm(s => ({ ...s, city: District || "", state: State || "" }));
          setPincodeStatus("ok");
        } else {
          setPincodeStatus("notfound");
        }
      } catch {
        setPincodeStatus("error");
      }
    })();
    return () => controller.abort();
  }, [form.pincode]);

  const setField = <K extends keyof BuyerForm>(k: K, v: BuyerForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const isActive = listing?.status === "ACTIVE";
  const price = Number(listing?.price ?? 0);
  const qty = Math.max(1, Number(form.quantity) || 1);
  const total = price * qty;

  const valid = isActive && 
                form.customerName.trim().length >= 2 && 
                form.phoneNumber.length >= 10 && 
                form.address.trim().length >= 5 && 
                form.pincode.length === 6;

  // 3. Submit Order
  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const fullAddress = `${form.address.trim()}, ${form.city}, ${form.state} - ${form.pincode}`;
      const res = await fetch("/api/dynamic-prices/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          customerName: form.customerName.trim(),
          phoneNumber: form.phoneNumber,
          address: fullAddress,
          quantity: qty,
          comments: form.comments.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to place order");
      setOrderId(data.orderId);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Connection error");
    } finally {
      setSubmitting(false);
    }
  };

  const copyOrderDetails = () => {
    const text = `📦 Order Details\nOrder ID: ${orderId}\nProduct: ${listing?.product?.name}\nQty: ${qty}\nTotal: ${formatINR(total)}\nCustomer: ${form.customerName}\nTrack here: ${window.location.origin}/track?id=${orderId}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <PageShell>
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 animate-spin text-[color:var(--accent)]" />
        <p className="text-muted-foreground animate-pulse font-medium">Securing your custom price...</p>
      </div>
    </PageShell>
  );

  if (error || !listing) return (
    <PageShell>
      <Card className="border-red-500/20 bg-red-500/5 text-center py-16">
        <AlertTriangle className="size-10 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Link Not Available</h2>
        <p className="text-muted-foreground px-6">{error}</p>
      </Card>
    </PageShell>
  );

  // Success Screen
  if (orderId) return (
    <PageShell>
      <Card className="overflow-hidden border-[color:var(--accent)]/20 bg-gradient-to-b from-[color:var(--accent-soft)]/30 to-background shadow-2xl">
        <CardContent className="grid place-items-center gap-6 py-16 text-center">
          <div className="rounded-full bg-[color:var(--accent)]/10 p-6">
            <CheckCircle2 className="size-12 text-[color:var(--accent)]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black">Order Placed!</h2>
            <p className="text-muted-foreground">Successfully sent to the seller.</p>
          </div>
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm ring-1 ring-border/50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tracking ID</p>
            <p className="mt-2 font-mono text-3xl font-black text-[color:var(--accent)]">{orderId}</p>
            <div className="mt-6 flex flex-col gap-3">
              <Button variant="outline" className="h-12 w-full gap-2 border-dashed" onClick={copyOrderDetails}>
                {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                {copied ? "Copied to Clipboard" : "Copy Order Summary"}
              </Button>
              <Button className="h-12 w-full gap-2 font-bold" onClick={() => window.location.href = `/track?id=${orderId}`}>
                <Search className="size-4" /> Track Order Status
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );

  return (
    <PageShell>
      <ProductHero listing={listing} />

      {!isActive ? (
        <Card className="border-amber-500/20 bg-amber-500/5 py-10 text-center">
          <Lock className="size-8 text-amber-500 mx-auto mb-2" />
          <h2 className="text-lg font-bold">Link Inactive</h2>
          <p className="text-sm text-muted-foreground px-6">Ask the seller for a new secure link.</p>
        </Card>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <ShoppingBag className="size-5 text-[color:var(--accent)]" />
            <h2 className="text-lg font-bold">Shipping Details</h2>
          </div>

          <Card className="border-none shadow-xl ring-1 ring-border/50">
            <CardContent className="flex flex-col gap-6 p-5 sm:p-6">
              
              <Field label="Receiver Name" required icon={<User className="size-4" />}>
                <Input className="h-12 bg-muted/30" value={form.customerName} onChange={(e) => setField("customerName", e.target.value)} placeholder="Full Name" />
              </Field>

              <Field label="Phone Number" required icon={<Phone className="size-4" />}>
                <Input className="h-12 bg-muted/30" type="tel" maxLength={15} value={form.phoneNumber} onChange={(e) => setField("phoneNumber", e.target.value.replace(/\D/g, ""))} placeholder="10-digit Mobile" />
              </Field>

              <Field label="Delivery Address" required icon={<MapPin className="size-4" />}>
                <Textarea className="min-h-[100px] bg-muted/30" value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="House/Flat No, Street, Landmark" />
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Pincode" required hint={pincodeStatus === "loading" ? "Validating..." : ""}>
                  <Input className={cn("h-12 bg-muted/30", pincodeStatus === "notfound" && "border-red-500/50")} maxLength={6} value={form.pincode} onChange={(e) => setField("pincode", e.target.value.replace(/\D/g, ""))} placeholder="6-Digit PIN" />
                </Field>
                <div className="grid grid-cols-2 gap-3 sm:contents">
                  <Field label="City" required><Input className="h-12 bg-muted/30" value={form.city} onChange={(e) => setField("city", e.target.value)} /></Field>
                  <Field label="State" required><Input className="h-12 bg-muted/30" value={form.state} onChange={(e) => setField("state", e.target.value)} /></Field>
                </div>
              </div>

              <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                <Field label="Quantity" required className="flex-1">
                  <div className="flex h-12 items-center gap-3 rounded-md border bg-muted/30 px-2">
                    <button onClick={() => setField("quantity", String(Math.max(1, qty - 1)))} className="size-8 rounded bg-background shadow hover:bg-muted">-</button>
                    <input className="w-full bg-transparent text-center font-bold" type="number" value={form.quantity} onChange={(e) => setField("quantity", e.target.value)} />
                    <button onClick={() => setField("quantity", String(qty + 1))} className="size-8 rounded bg-background shadow hover:bg-muted">+</button>
                  </div>
                </Field>
              </div>

              <Field label="Note for Seller (Optional)" icon={<MessageSquare className="size-4" />}>
                <Textarea className="bg-muted/30" value={form.comments} onChange={(e) => setField("comments", e.target.value)} placeholder="Any delivery instructions..." />
              </Field>

              {/* Order Summary Box */}
              <div className="rounded-2xl border bg-gradient-to-r from-muted/50 to-muted/20 overflow-hidden mt-2">
                <div className="p-4 flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unit Price</span>
                    <span className="font-medium">{formatINR(price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Qty</span>
                    <span className="font-medium">x {qty}</span>
                  </div>
                </div>
                <div className="bg-muted/50 p-4 border-t flex justify-between items-center">
                  <span className="font-bold">Total Payable</span>
                  <span className="text-2xl font-black text-[color:var(--accent)]">{formatINR(total)}</span>
                </div>
              </div>

              {submitError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg">{submitError}</div>}

              <Button onClick={submit} disabled={!valid || submitting} size="lg" className="h-14 w-full rounded-xl text-lg font-black shadow-lg shadow-[color:var(--accent)]/20 active:scale-[0.98] transition-transform">
                {submitting ? <><Loader2 className="mr-2 animate-spin" /> Processing...</> : <>Place Order <ArrowRight className="ml-2 size-5" /></>}
              </Button>
            </CardContent>
          </Card>
        </section>
      )}
    </PageShell>
  );
}

function ProductHero({ listing }: { listing: DynamicPriceListing }) {
  const product = listing.product;
  return (
    <Card className="overflow-hidden border-none shadow-xl ring-1 ring-border/50">
      <div className="bg-muted/10 p-2">
        <ProductImages productId={product?.id} productName={product?.name} />
      </div>
      <CardContent className="p-5 sm:p-6 flex flex-col gap-4">
        <div className="space-y-1">
          <Badge variant="outline" className="text-[10px] font-bold text-[color:var(--accent)] border-[color:var(--accent)]/20 uppercase tracking-widest bg-[color:var(--accent-soft)]/20 mb-2">Special Offer</Badge>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{product?.name || "Product Details"}</h1>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-[color:var(--accent)] tracking-tighter">{formatINR(Number(listing.price))}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Free Delivery</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{product?.description}</p>
        {listing.note && (
          <div className="bg-[color:var(--accent-soft)]/20 border-l-4 border-[color:var(--accent)] p-4 rounded-r-lg">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--accent)]">Seller's Note</span>
            <p className="text-sm italic mt-1 font-medium">"{listing.note}"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-background via-background to-muted/30 pb-12">
      <main className="mx-auto max-w-2xl px-4 pt-6 flex flex-col gap-6">
        <header className="flex justify-between items-center px-1">
          <span className="text-xl font-black tracking-tighter">Profit<span className="text-[color:var(--accent)]">Saathi</span></span>
          <Badge variant="outline" className="rounded-full bg-background/50 backdrop-blur-sm gap-2">
            <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase">Secure</span>
          </Badge>
        </header>
        {children}
      </main>
    </div>
  );
}

function Field({ label, required, icon, hint, children, className }: any) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex justify-between items-center">
        <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {icon} {label} {required && <span className="text-[color:var(--accent)]">*</span>}
        </Label>
        {hint && <span className="text-[10px] text-muted-foreground font-medium">{hint}</span>}
      </div>
      {children}
    </div>
  );
}