"use client";

import React, { useState } from "react";
import { Tag, Info, ChevronUp, ChevronDown } from "lucide-react";
import { Product, PricingDetails } from "../types";

export default function ProductInfo({ product, pricing }: { product: Product, pricing: PricingDetails }) {
  const [showFullDesc, setShowFullDesc] = useState(false);
  const { finalPrice, displayOriginalPrice, isDiscount, discountPercent, appliedOffer } = pricing;

  return (
    <div className="space-y-4">
      <div className="bg-[color:var(--accent-soft)] rounded-xl p-4 border border-[color:var(--accent)]/20">
        {appliedOffer && (
          <div className="inline-flex items-center gap-1 bg-[color:var(--accent)] text-[color:var(--accent-foreground)] text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider">
            <Tag size={10} /> {appliedOffer.name}
          </div>
        )}
        {!appliedOffer && product?.sellingPrice < product?.costPrice && (
          <div className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider">
            <Tag size={10} /> Special Price
          </div>
        )}

        <div className="flex justify-between items-start">
          <h2 className="font-semibold text-xl text-foreground flex-1 pr-2 leading-tight">
            {product.name}
          </h2>
          <div className="text-right whitespace-nowrap">
            {isDiscount && (
              <p className="text-xs text-muted-foreground line-through mb-1">
                ₹{displayOriginalPrice.toFixed(2)}
              </p>
            )}
            <p className="text-2xl font-semibold text-[color:var(--accent)]">
              ₹{finalPrice.toFixed(2)}
            </p>
            {isDiscount && (
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {discountPercent.toFixed(1)}% OFF
              </p>
            )}
          </div>
        </div>
      </div>

      {product.description && (
        <div className="bg-card rounded-xl border border-themed overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Info size={16} />
              <span className="text-xs font-semibold uppercase tracking-widest">Product Details</span>
            </div>
            <div className="transition-all duration-300">
              <p className={`text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap ${!showFullDesc ? "line-clamp-2" : ""}`}>
                {product.description}
              </p>
            </div>
            <button
              onClick={() => setShowFullDesc(!showFullDesc)}
              className="mt-3 w-full flex items-center justify-center gap-1 py-2 text-[color:var(--accent)] text-sm font-medium hover:bg-[color:var(--accent-soft)] rounded-lg transition-colors"
            >
              {showFullDesc ? <>Show Less <ChevronUp size={16} /></> : <>Read Full Description <ChevronDown size={16} /></>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
