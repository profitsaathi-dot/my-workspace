"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface CartProductDetails {
  id: number;
  sellingPrice: number;
  [key: string]: unknown;
}

export interface CartItem {
  id: number;
  name: string;
  qty: number;
  productDetails: CartProductDetails;
}

interface CartContextValue {
  cart: CartItem[];
  loading: boolean;
  totalAmount: number;
  totalItems: number;
  getItemCount: (productId: number) => number;
  updateQty: (id: number, newQty: number) => Promise<void>;
  removeItem: (id: number) => Promise<void>;
  /** Alias of removeItem kept for callers using the older name. */
  removeFromCart: (id: number) => Promise<void>;
  fetchCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // useCallback prevents unnecessary re-renders when passed to children
  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch("/user/api/cart");
      if (res.ok) {
        const data = (await res.json()) as CartItem[];
        setCart(data);
      }
    } catch (error) {
      console.error("Failed to fetch cart", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const syncItemWithServer = async (item: CartItem) => {
    try {
      const payload = {
        id: item.id,
        productId: item.productDetails.id,
        name: item.name,
        qty: item.qty,
      };

      await fetch("/user/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Failed to sync cart item", error);
    }
  };

  const removeItem = async (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    try {
      await fetch(`/user/api/cart/${id}`, { method: "DELETE" });
    } catch (error) {
      console.error("Failed to delete cart item", error);
    }
  };

  const updateQty = async (id: number, newQty: number) => {
    if (newQty <= 0) {
      await removeItem(id);
      return;
    }

    setCart((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, qty: newQty } : item
      );

      const changedItem = updated.find((i) => i.id === id);
      if (changedItem) {
        syncItemWithServer(changedItem);
      }
      return updated;
    });
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + (item.productDetails?.sellingPrice || 0) * item.qty,
    0
  );

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  const getItemCount = (productId: number) => {
    const item = cart.find((i) => i.productDetails?.id === productId);
    return item ? item.qty : 0;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        totalAmount,
        totalItems,
        getItemCount,
        updateQty,
        removeItem,
        removeFromCart: removeItem,
        fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
