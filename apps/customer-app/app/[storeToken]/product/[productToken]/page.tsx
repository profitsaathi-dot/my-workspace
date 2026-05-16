"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/app/lib/useAuth";
import { useProduct } from "./hooks/useProduct";
import { useCart } from "../../../context/cart-context";
import { calculatePricing } from "./utils/pricing";

import ProductImages from "./components/ProductImages";
import ProductInfo from "./components/ProductInfo";
import QuantitySelector from "./components/QuantitySelector";
import CartActions from "./components/CartActions";

export default function ProductPage() {
  const t = useTranslations("customer.product");
  const { storeToken, productToken } = useParams<{ storeToken: string; productToken: string }>();
  const router = useRouter();

  const { isCheckingAuth, isRegisteredUser } = useAuth();
  const { product, festivalOffer, loadingProduct } = useProduct(productToken, isCheckingAuth);
  const { cart, getItemCount, updateQty } = useCart();

  const [qty, setQty] = useState(1);

  // Keep local qty in sync with whatever the cart already has for this product.
  useEffect(() => {
    if (product) {
      const existingQty = getItemCount(product.id);
      setQty(existingQty > 0 ? existingQty : 1);
    }
  }, [product, cart, getItemCount]);

  if (isCheckingAuth || loadingProduct) {
    return (
      <div className="min-h-full flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-[color:var(--accent)]" size={40} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-full flex items-center justify-center bg-background">
        <p className="text-foreground font-medium">{t("notFound")}</p>
      </div>
    );
  }

  const { finalPrice, displayOriginalPrice, isDiscount, discountPercent, appliedOffer } =
    calculatePricing(product, festivalOffer);
  const total = qty * finalPrice;
  const remainingStock = festivalOffer ? festivalOffer.stockLimit - festivalOffer.sold : null;

  const handleIncrease = () => {
    if (remainingStock !== null && remainingStock !== undefined && qty >= remainingStock) return;

    const existingItem = cart.find((item) => item.productDetails.id === product.id);
    if (existingItem) {
      updateQty(existingItem.id, existingItem.qty + 1);
    } else {
      setQty((prev) => prev + 1);
    }
  };

  const handleDecrease = () => {
    const existingItem = cart.find((item) => item.productDetails.id === product.id);
    if (existingItem) {
      updateQty(existingItem.id, Math.max(1, existingItem.qty - 1));
    } else {
      setQty((prev) => Math.max(1, prev - 1));
    }
  };

  // Buy Now: hand off to the dedicated checkout page (address + payment).
  const handleBuyNow = () => {
    router.push(`/${storeToken}/product/${productToken}/checkout?qty=${qty}`);
  };

  return (
    <div className="min-h-full bg-background flex flex-col items-center p-0 md:p-6 pb-12">
      <div className="w-full max-w-md bg-card md:rounded-2xl md:shadow-sm border border-themed">
        <div className="p-4 flex items-center gap-3 border-b border-themed sticky top-0 bg-card/85 backdrop-blur-md z-30">
          <button
            onClick={() => router.back()}
            className="p-1 -ml-1 rounded-md hover:bg-muted transition"
            aria-label={t("back")}
          >
            <ChevronLeft size={22} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <ProductImages productId={product.id} />
          <ProductInfo
            product={product}
            pricing={{ finalPrice, displayOriginalPrice, isDiscount, discountPercent, appliedOffer }}
          />

          <QuantitySelector
            qty={qty}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
            remainingStock={remainingStock}
          />

          <div className="pt-6 border-t border-themed">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t("total")}
              </span>
              <span className="text-3xl font-semibold text-[color:var(--accent)]">
                ₹{total.toFixed(2)}
              </span>
            </div>

            <CartActions
              product={product}
              qty={qty}
              onBuyNow={handleBuyNow}
              remainingStock={remainingStock}
              isLoggedIn={isRegisteredUser}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
