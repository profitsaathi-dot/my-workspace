"use client";

import React from "react";
import { Plus, Minus } from "lucide-react";

interface Props {
  qty: number;
  onIncrease: () => void;
  onDecrease: () => void;
  remainingStock?: number | null;
}

export default function QuantitySelector({ qty, onIncrease, onDecrease, remainingStock }: Props) {
  return (
    <div className="flex items-center justify-between bg-card p-2 rounded-xl border border-themed">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-2">
        Quantity
      </span>
      <div className="flex items-center gap-2 bg-muted rounded-lg p-1 border border-themed">
        <button
          onClick={onDecrease}
          className="size-9 flex items-center justify-center hover:bg-card text-foreground rounded-md transition-all active:translate-y-px"
          aria-label="Decrease"
        >
          <Minus size={16} />
        </button>
        <span className="font-semibold text-base w-6 text-center text-foreground">{qty}</span>
        <button
          onClick={onIncrease}
          disabled={remainingStock !== null && remainingStock !== undefined && qty >= remainingStock}
          className="size-9 flex items-center justify-center hover:bg-card text-foreground rounded-md transition-all active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Increase"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
