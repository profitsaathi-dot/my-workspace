"use client";

import { ShoppingCart, Plus, Minus, Trash2, ShoppingBag, LogIn, ArrowRight } from "lucide-react";
import { Button, Card } from "@workspace/ui";
import { useCart } from "../../context/cart-context";
import { useSearch } from "../context/search-context";
import { useAuth } from "@/app/lib/useAuth";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function CartPage() {
  const { cart, loading, totalAmount, updateQty, removeItem, fetchCart } = useCart();
  const { search } = useSearch();
  const { isRegisteredUser, isCheckingAuth } = useAuth();
  const router = useRouter();
  const t = useTranslations("customer.cart");

  const { storeToken } = useParams<{ storeToken: string }>();
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [loadingImages, setLoadingImages] = useState(true);

  useEffect(() => {
    if (fetchCart) {
      fetchCart();
    }
  }, [fetchCart]);

  useEffect(() => {
    if (!cart?.length) {
      setLoadingImages(false);
      return;
    }

    const loadImages = async () => {
      const newUrls = { ...imageUrls };
      const promises = cart.map(async (item) => {
        const productId = item.productDetails.id;
        if (newUrls[productId]) return;

        try {
          const res = await fetch(`/user/api/products/image?id=${productId}&index=0`);
          if (!res.ok) throw new Error();
          const blob = await res.blob();
          newUrls[productId] = URL.createObjectURL(blob);
        } catch {
          newUrls[productId] = "";
        }
      });

      await Promise.all(promises);
      setImageUrls(newUrls);
      setLoadingImages(false);
    };

    loadImages();
  }, [cart]);

  useEffect(() => {
    return () => {
      Object.values(imageUrls).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [imageUrls]);

  const filteredCart = cart?.filter((item) =>
    item.name.toLowerCase().includes((search || "").toLowerCase())
  ) || [];

  // 1. Loading state
  if (loading || isCheckingAuth) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 border-4 border-[color:var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse font-medium">{t("syncing")}</p>
        </div>
      </div>
    );
  }

  // 2. Login required
  if (!isRegisteredUser) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="size-16 bg-[color:var(--accent-soft)] rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="text-[color:var(--accent)]" size={28} />
          </div>
          <h2 className="text-2xl font-semibold mb-2">{t("loginRequired")}</h2>
          <p className="text-muted-foreground mb-8 text-sm">
            {t("loginRequiredDesc")}
          </p>
          <Button
            size="lg"
            className="w-full"
            onClick={() => router.push(`/${storeToken}/login`)}
          >
            {t("loginToAccount")}
            <ArrowRight />
          </Button>
        </Card>
      </div>
    );
  }

  // 3. Main cart UI
  return (
    <div className="min-h-full bg-background pb-44 xl:pb-32">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="grid size-10 place-items-center rounded-lg bg-[color:var(--accent-soft)] text-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/20">
            <ShoppingCart size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
          </div>
        </div>

        {/* Empty State */}
        {filteredCart.length === 0 && !loadingImages && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="size-20 bg-muted rounded-full flex items-center justify-center mb-2">
              <ShoppingBag size={36} className="text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">{t("empty")}</h3>
            <p className="text-muted-foreground max-w-xs text-sm">
              {t("emptyDesc")}
            </p>
            <button
              onClick={() => router.push(`/${storeToken}/store`)}
              className="text-[color:var(--accent)] font-medium hover:underline"
            >
              {t("continueShopping")}
            </button>
          </div>
        )}

        {/* Items List */}
        <div className="space-y-3">
          {filteredCart.map((item) => (
            <div
              key={item.id}
              className="group bg-card p-4 rounded-xl border border-themed shadow-sm transition-all hover:shadow-md hover:border-[color:var(--accent)]/30 flex gap-4"
            >
              <div className="size-24 rounded-lg bg-muted shrink-0 overflow-hidden">
                {imageUrls[item.productDetails.id] ? (
                  <img
                    src={imageUrls[item.productDetails.id]}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                    Loading...
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between flex-1 min-w-0">
                <div>
                  <h3 className="font-medium truncate">{item.name}</h3>
                  <p className="font-semibold text-lg text-[color:var(--accent)]">
                    ₹{item.productDetails.sellingPrice}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-muted rounded-lg p-1 border border-themed">
                    <button
                      onClick={() => item.qty <= 1 ? removeItem(item.id) : updateQty(item.id, item.qty - 1)}
                      className="p-2 hover:bg-card rounded-md transition active:translate-y-px"
                      aria-label="Decrease quantity"
                    >
                      {item.qty === 1 ? <Trash2 size={14} className="text-red-500" /> : <Minus size={14} />}
                    </button>
                    <span className="px-3 text-sm font-semibold min-w-[2ch] text-center">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="p-2 hover:bg-card rounded-md transition active:translate-y-px"
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-muted-foreground hover:text-red-500 transition p-2"
                    aria-label="Remove item"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Bottom Bar — sits above the mobile bottom nav (xl:bottom-0 on desktop). */}
      {filteredCart.length > 0 && (
        <div className="fixed left-0 w-full bg-background/95 supports-[backdrop-filter]:bg-background/85 [-webkit-backdrop-filter:blur(12px)] backdrop-blur-md border-t border-themed p-4 md:p-6 z-40 bottom-[calc(4rem+env(safe-area-inset-bottom))] xl:bottom-0">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-semibold block mb-1">{t("total")}</p>
              <p className="text-2xl font-semibold text-[color:var(--accent)]">₹{totalAmount.toFixed(2)}</p>
            </div>
            <Button size="lg">{t("checkout")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
