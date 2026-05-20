"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  toast,
} from "@workspace/ui";
import { ChevronLeft, MapPin, User, Phone, Mail, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/app/lib/useAuth";
import { useProduct } from "../hooks/useProduct";
import { usePayment } from "../hooks/usePayment";
import { calculatePricing } from "../utils/pricing";
import OfflinePayment, { OfflinePaymentMode } from "../components/OfflinePayment";

interface StorePaymentInfo {
  storeName?: string | null;
  paymentType?: string | null;
  paymentQRCode?: string | null;
  bankAccountNumber?: string | null;
  bankAccountIfsc?: string | null;
}

interface FormState {
  name: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

const EMPTY: FormState = { name: "", phone: "", email: "", street: "", city: "", state: "", zip: "" };

// Try to split a free-form "street, city, state - zip" address back into parts.
const splitAddress = (s: string) => {
  if (!s) return { street: "", city: "", state: "", zip: "" };
  const [main, zipPart] = s.split(" - ");
  const parts = main.split(",").map((p) => p.trim()).filter(Boolean);
  const [street = "", city = "", state = ""] = [
    parts.slice(0, -2).join(", "),
    parts[parts.length - 2] ?? "",
    parts[parts.length - 1] ?? "",
  ];
  return { street, city, state, zip: zipPart?.trim() ?? "" };
};

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { storeToken, productToken } = useParams<{ storeToken: string; productToken: string }>();
  const qty = Math.max(1, Number(searchParams.get("qty")) || 1);
  const dynamicPriceToken = searchParams.get("dynamicPrice"); // Get dynamic price token from URL

  const t = useTranslations("customer.checkout");

  // useAuth still runs in case the visitor is logged in — we use the result
  // purely to prefill, never to gate.
  const { isCheckingAuth, userData } = useAuth();
  const { product, festivalOffer, loadingProduct } = useProduct(productToken, isCheckingAuth);
  const {
    startRazorpayPayment,
    startOfflinePayment,
    finishOfflinePayment,
    isPaymentLoading,
  } = usePayment();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [showReview, setShowReview] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  // null = not yet checked, true = verified by India Post, false = rejected
  const [pincodeValid, setPincodeValid] = useState<boolean | null>(null);
  const pincodeAbortRef = useRef<AbortController | null>(null);

  // Dynamic price state
  const [dynamicPrice, setDynamicPrice] = useState<number | null>(null);
  const [dynamicPriceLoading, setDynamicPriceLoading] = useState(false);

  // Seller's chosen payment method — drives whether we run Razorpay or open
  // the offline (UPI QR / bank transfer) sheet at confirm time.
  const [storePay, setStorePay] = useState<StorePaymentInfo | null>(null);
  const [offlineOrder, setOfflineOrder] = useState<{
    orderId: string;
    mode: OfflinePaymentMode;
  } | null>(null);

  // Fetch dynamic price if token is present
  useEffect(() => {
    if (!dynamicPriceToken) return;
    
    const fetchDynamicPrice = async () => {
      setDynamicPriceLoading(true);
      try {
        const response = await fetch(`/user/api/dynamic-price/${dynamicPriceToken}`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === "ACTIVE" && data.price) {
            setDynamicPrice(data.price);
          } else {
            toast.error("Dynamic price offer is no longer available");
            router.back();
          }
        }
      } catch (error) {
        console.error("Failed to fetch dynamic price:", error);
      } finally {
        setDynamicPriceLoading(false);
      }
    };

    fetchDynamicPrice();
  }, [dynamicPriceToken, router]);

  useEffect(() => {
    if (!storeToken) return;
    fetch(`/user/api/store/info?token=${encodeURIComponent(storeToken)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setStorePay({
          storeName: data.storeName ?? data.name ?? null,
          paymentType: data.paymentType ?? null,
          paymentQRCode: data.paymentQRCode ?? null,
          bankAccountNumber: data.bankAccountNumber ?? null,
          bankAccountIfsc: data.bankAccountIfsc ?? null,
        });
      })
      .catch(() => undefined);
  }, [storeToken]);

  // Prefill from saved profile/address once auth settles. Safe for guests
  // (userData fields are empty strings if not registered).
  useEffect(() => {
    if (isCheckingAuth) return;
    const split = splitAddress(userData.address || "");
    setForm({
      name: userData.name || "",
      phone: userData.phone || "",
      email: userData.email || "",
      street: split.street,
      city: split.city,
      state: split.state,
      zip: split.zip,
    });
    // A saved address went through this same flow originally, so trust the
    // stored PIN as valid — otherwise returning users would be blocked.
    if (/^\d{6}$/.test(split.zip)) setPincodeValid(true);
  }, [isCheckingAuth, userData.address, userData.email, userData.name, userData.phone]);

  // Order-summary thumbnail.
  const [productImage, setProductImage] = useState<string | null>(null);
  useEffect(() => {
    if (!product?.id) return;
    let url: string | null = null;
    fetch(`/user/api/products/image?id=${product.id}&index=0`)
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!blob) return;
        url = URL.createObjectURL(blob);
        setProductImage(url);
      })
      .catch(() => undefined);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [product?.id]);

  // ───────── early states ─────────

  if (isCheckingAuth || loadingProduct || dynamicPriceLoading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Loader2 className="size-8 animate-spin text-[color:var(--accent)]" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-muted-foreground">
        {t("productNotFound")}
      </div>
    );
  }

  // ───────── pricing ─────────

  const { finalPrice: calculatedPrice, appliedOffer } = calculatePricing(product, festivalOffer);
  // Use dynamic price if available, otherwise use calculated price
  const finalPrice = dynamicPrice !== null ? dynamicPrice : calculatedPrice;
  const isDynamicPrice = dynamicPrice !== null;
  const total = qty * finalPrice;

  // ───────── pay ─────────

  const formattedAddress =
    [form.street, form.city, form.state].filter(Boolean).join(", ") +
    (form.zip ? ` - ${form.zip}` : "");

  // First pass — opens the review dialog so the buyer can verify everything.
  const openReview = () => {
    const required =
      form.name.trim() &&
      form.phone.trim() &&
      form.street.trim() &&
      form.city.trim() &&
      form.state.trim();

    if (!required) {
      toast.error(t("fillRequired"));
      return;
    }
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      toast.error(t("invalidPhone"));
      return;
    }
    if (pincodeLoading) {
      toast.error(t("pincodeVerifying"));
      return;
    }
    if (!/^\d{6}$/.test(form.zip) || pincodeValid !== true) {
      toast.error(t("invalidPincode"));
      return;
    }
    setShowReview(true);
  };

  // Second pass — fires after the buyer confirms in the dialog. Branches on
  // the seller's payment-type setting: ONLINE runs Razorpay; UPI_QR /
  // BANK_ACCOUNT create the order and open the offline-payment sheet so the
  // buyer can transfer manually and upload a screenshot.
  const handlePay = async () => {
    const props = {
      product,
      qty,
      total,
      finalPrice,
      formData: {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: formattedAddress,
        comments: "",
      },
      appliedOffer,
      dynamicPriceToken: dynamicPriceToken || undefined, // Pass dynamic price token
    };

    const type = (storePay?.paymentType || "").toUpperCase();
    if (type === "UPI_QR" || type === "BANK_ACCOUNT") {
      setShowReview(false);
      const orderData = await startOfflinePayment(props);
      if (orderData?.orderId) {
        setOfflineOrder({ orderId: orderData.orderId, mode: type });
      }
      return;
    }

    // Default — including ONLINE or unknown / not-yet-loaded — falls back to
    // the existing Razorpay flow so existing sellers keep working.
    startRazorpayPayment(props);
  };

  const inputCls =
    "w-full pl-10 pr-3 py-2.5 rounded-lg bg-[color:var(--input)] border border-themed text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] transition";
  const plainCls =
    "w-full px-3 py-2.5 rounded-lg bg-[color:var(--input)] border border-themed text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] transition";

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  // India Post lookup — when the buyer enters a 6-digit PIN we fetch the
  // matching post office and pre-fill city + state. Abort prior in-flight
  // calls so a fast typist doesn't get stale results overwriting newer ones.
  const lookupPincode = async (pin: string) => {
    // Defence in depth — only digits, only six. The caller already enforces
    // this but we re-check here so a future caller can't sneak garbage into
    // the third-party URL.
    if (!/^\d{6}$/.test(pin)) return;

    pincodeAbortRef.current?.abort();
    const ctrl = new AbortController();
    pincodeAbortRef.current = ctrl;
    setPincodeLoading(true);
    // Helper that ignores writes from a stale (superseded) request — even if
    // abort fires too late on slow networks, the latest controller wins.
    const isLatest = () => pincodeAbortRef.current === ctrl;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
        signal: ctrl.signal,
      });
      if (!isLatest()) return;
      if (!res.ok) {
        setPincodeValid(false);
        toast.error(t("pincodeNotFound"));
        return;
      }
      const data = await res.json();
      if (!isLatest()) return;
      const entry = Array.isArray(data) ? data[0] : null;
      const po = entry?.PostOffice?.[0];
      if (entry?.Status === "Success" && po) {
        setForm((p) => ({
          ...p,
          city: po.District || p.city,
          state: po.State || p.state,
        }));
        setPincodeValid(true);
      } else {
        setPincodeValid(false);
        toast.error(t("pincodeNotFound"));
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError" && isLatest()) {
        // Fail closed — leaving validation unset would let unverified PINs
        // slip through if the user hits Pay before retrying.
        setPincodeValid(false);
        toast.error(t("pincodeNotFound"));
      }
    } finally {
      if (isLatest()) setPincodeLoading(false);
    }
  };

  const onZipChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    set("zip", digits);
    if (digits.length === 6) {
      lookupPincode(digits);
    } else {
      // Cancel any in-flight lookup and reset validity so the user can't
      // race a partial PIN past the openReview check.
      pincodeAbortRef.current?.abort();
      setPincodeLoading(false);
      setPincodeValid(null);
    }
  };

  return (
    <div className="min-h-full bg-background pb-32">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1 -ml-1 rounded-md hover:bg-muted transition"
            aria-label="Back"
          >
            <ChevronLeft className="size-6" />
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        </div>

        {/* Order summary */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              {t("orderSummary")}
            </h2>
            {isDynamicPrice && (
              <div className="inline-flex items-center gap-1 bg-[color:var(--accent)] text-[color:var(--accent-foreground)] text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                <span className="text-xs">⚡</span> Special Price
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <div className="size-20 rounded-lg bg-muted overflow-hidden shrink-0 relative">
              {productImage ? (
                <Image src={productImage} alt={product.name} fill className="object-contain p-2" />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-tight line-clamp-2">{product.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("qty")}: {qty} · ₹{finalPrice.toFixed(2)}
              </p>
              {isDynamicPrice && (
                <p className="text-[10px] text-[color:var(--accent)] font-medium mt-1">
                  🎉 Exclusive offer applied
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("total")}
              </p>
              <p className="text-xl font-semibold text-[color:var(--accent)] mt-0.5">
                ₹{total.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        {/* Your details */}
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <User className="size-4 text-[color:var(--accent)]" />
            {t("yourDetails")}
          </h2>

          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              className={inputCls}
              placeholder={t("namePlaceholder")}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              className={inputCls}
              inputMode="tel"
              maxLength={10}
              placeholder={t("contactPlaceholder")}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))}
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              className={inputCls}
              type="email"
              placeholder={t("emailPlaceholderOptional")}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
        </Card>

        {/* Address */}
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="size-4 text-[color:var(--accent)]" />
            {t("deliveryAddress")}
          </h2>

          <input
            className={plainCls}
            placeholder={t("streetPlaceholder")}
            value={form.street}
            onChange={(e) => set("street", e.target.value)}
          />

          <div>
            <div className="relative">
              <input
                className={`${plainCls} pr-10 ${
                  pincodeValid === false
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }`}
                inputMode="numeric"
                maxLength={6}
                placeholder={t("zipPlaceholder")}
                value={form.zip}
                onChange={(e) => onZipChange(e.target.value)}
                aria-invalid={pincodeValid === false}
              />
              {pincodeLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-[color:var(--accent)]" />
              )}
            </div>
            <p
              className={`text-[11px] mt-1.5 ml-0.5 ${
                pincodeValid === false ? "text-red-500" : "text-muted-foreground"
              }`}
            >
              {pincodeValid === false ? t("invalidPincode") : t("pincodeHint")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              className={plainCls}
              placeholder={t("cityPlaceholder")}
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
            <input
              className={plainCls}
              placeholder={t("statePlaceholder")}
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
            />
          </div>
        </Card>
      </div>

      {/* Sticky pay bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/85 backdrop-blur-md border-t border-themed">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              {t("total")}
            </p>
            <p className="text-2xl font-semibold text-[color:var(--accent)] leading-tight">
              ₹{total.toFixed(2)}
            </p>
          </div>
          <Button
            size="lg"
            disabled={isPaymentLoading}
            onClick={openReview}
            className="min-w-[160px]"
          >
            {isPaymentLoading ? (
              <>
                <Loader2 className="animate-spin" />
                {t("processing")}
              </>
            ) : (
              t("pay")
            )}
          </Button>
        </div>
      </div>

      {/* Confirm-before-pay safety review */}
      <AlertDialog open={showReview} onOpenChange={setShowReview}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-[color:var(--accent)]" />
              {t("reviewTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("reviewDesc")}</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            {/* Phone — most error-prone field, given prominence */}
            <div className="rounded-lg border border-themed bg-[color:var(--accent-soft)] p-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--accent)] mb-1">
                <Phone className="size-3.5" />
                {t("contactPlaceholder")}
              </div>
              <p className="font-mono text-base font-semibold tracking-wide tabular-nums">
                +91 {form.phone}
              </p>
            </div>

            {/* Address */}
            <div className="rounded-lg border border-themed bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                <MapPin className="size-3.5" />
                {t("deliveryAddress")}
              </div>
              <p className="text-sm leading-relaxed">{formattedAddress}</p>
            </div>

            {/* Name + email row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                  {t("namePlaceholder")}
                </p>
                <p className="font-medium truncate">{form.name}</p>
              </div>
              {form.email && (
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                    {t("emailPlaceholderOptional")}
                  </p>
                  <p className="font-medium truncate">{form.email}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-themed p-3 mt-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t("total")}
              </span>
              <span className="text-lg font-semibold text-[color:var(--accent)]">
                ₹{total.toFixed(2)}
              </span>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("editDetails")}</AlertDialogCancel>
            <AlertDialogAction onClick={handlePay}>
              {t("confirmAndPay")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Offline payment (UPI QR / bank transfer) — opens after the order
          has been created so the buyer can pay manually and upload proof. */}
      {offlineOrder && (
        <OfflinePayment
          open={!!offlineOrder}
          onOpenChange={(o) => {
            if (!o) setOfflineOrder(null);
          }}
          mode={offlineOrder.mode}
          amount={total}
          orderId={offlineOrder.orderId}
          storeToken={storeToken}
          bankAccountNumber={storePay?.bankAccountNumber}
          bankAccountIfsc={storePay?.bankAccountIfsc}
          storeName={storePay?.storeName}
          onCompleted={() => {
            const id = offlineOrder.orderId;
            setOfflineOrder(null);
            finishOfflinePayment(id);
          }}
        />
      )}
    </div>
  );
}
