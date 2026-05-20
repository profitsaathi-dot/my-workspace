"use client";

import React, { useState } from "react";
import { ShoppingCart, Package, Loader2, Plus, Minus, Trash2 } from "lucide-react";
import { Button, toast } from "@workspace/ui";
import { useCart } from "../../../../context/cart-context";
import { useStoreInfo } from "../../../context/store-info-context";

import { Product } from "../types";

interface Props {
  product: Product | null;
  qty: number;
  onBuyNow: () => void;
  remainingStock?: number | null;
  isLoggedIn: boolean;
}

export default function CartActions({ product, qty, onBuyNow, remainingStock, isLoggedIn }: Props) {
  const { getItemCount, cart, updateQty, removeFromCart, fetchCart } = useCart();
  const { isSocial, loading: storeLoading } = useStoreInfo();
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Show loading state while determining seller type to prevent flicker
  if (storeLoading) {
    return (
      <div className="flex flex-col gap-3 mb-2">
        <div className="h-12 bg-muted/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  const cartQty = product ? getItemCount(product.id) : 0;
  const cartItem = product ? cart.find((item: any) => item.productDetails?.id === product.id) : null;

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      toast("Please login or use 'Buy Now' to verify via WhatsApp");
      return;
    }
    if (!product) return;

    setIsAddingToCart(true);
    try {
      const res = await fetch("/user/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, name: product.name, qty: qty }),
      });
      if (!res.ok) throw new Error("Failed");
      if (fetchCart) await fetchCart();
      toast.success("Added to cart");
    } catch (error) {
      console.error(error);
      toast.error("Could not add to cart");
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Social-seller stores have no cart flow — collapse to a full-width Buy Now.
  if (isSocial) {
    return (
      <div className="flex flex-col gap-3 mb-2">
        <Button
          size="lg"
          disabled={remainingStock === 0}
          onClick={onBuyNow}
          className="w-full"
        >
          <Package />
          Buy Now
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-3 mb-2">
      {/* CART QUANTITY CONTROLS */}
      {isLoggedIn && cartQty > 0 ? (
        <div className="w-full md:w-1/2 flex items-center justify-between border border-[color:var(--accent)] bg-[color:var(--accent-soft)] py-2 px-3 rounded-lg">
          <button
            onClick={() => cartItem && (cartItem.qty <= 1 ? (removeFromCart ? removeFromCart(cartItem.id) : updateQty(cartItem.id, 0)) : updateQty(cartItem.id, cartItem.qty - 1))}
            className="size-9 flex items-center justify-center bg-card text-[color:var(--accent)] rounded-md shadow-sm hover:bg-card/80 active:translate-y-px transition"
            aria-label="Decrease cart quantity"
          >
            {cartQty === 1 ? <Trash2 size={16} className="text-red-500" /> : <Minus size={16} />}
          </button>

          <div className="flex flex-col items-center">
            <span className="font-semibold text-base text-[color:var(--accent)]">{cartQty}</span>
            <span className="text-[10px] text-[color:var(--accent)]/80 uppercase font-semibold tracking-widest">In Cart</span>
          </div>

          <button
            onClick={() => cartItem && updateQty(cartItem.id, cartItem.qty + 1)}
            disabled={remainingStock !== null && cartQty >= (remainingStock || 999)}
            className="size-9 flex items-center justify-center bg-card text-[color:var(--accent)] rounded-md shadow-sm hover:bg-card/80 active:translate-y-px transition disabled:opacity-50"
            aria-label="Increase cart quantity"
          >
            <Plus size={16} />
          </button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="lg"
          disabled={isAddingToCart || remainingStock === 0}
          onClick={handleAddToCart}
          className="w-full md:w-1/2 border-[color:var(--accent)] text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]"
        >
          {isAddingToCart ? <Loader2 className="animate-spin" /> : (
            <><ShoppingCart /> Add to Cart</>
          )}
        </Button>
      )}

      {/* BUY NOW */}
      <Button
        size="lg"
        disabled={remainingStock === 0}
        onClick={onBuyNow}
        className="w-full md:w-1/2"
      >
        <Package />
        Buy Now
      </Button>
    </div>
  );
}
