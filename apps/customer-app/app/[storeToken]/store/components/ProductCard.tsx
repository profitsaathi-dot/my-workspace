"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";

export interface Product {
  id: number;
  name: string;
  sellingPrice: number;
  public_token: string;
  image?: string;
  mainImageindex?: string ;
}

export default function ProductCard({
  product,
  storeToken,
}: {
  product: Product;
  storeToken: string;
}) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(product.image || null);
  const [imgLoading, setImgLoading] = useState(!product.image);

  useEffect(() => {
    if (product.image) return;

    console.debug("selected index 0 for product", product.mainImageindex);

    let revoked: string | null = null;
    const fetchImage = async () => {
      try {
        const res = await fetch(`/user/api/products/image?id=${product.id}&index=${product.mainImageindex || 0}`);
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          revoked = url;
          setImageUrl(url);
        }
      } catch (error) {
        console.error("Failed to load image for product", product.id);
      } finally {
        setImgLoading(false);
      }
    };

    fetchImage();
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [product.id, product.image]);

  return (
    <div
      onClick={() => router.push(`/${storeToken}/product/${product.public_token}`)}
      className="group bg-card border border-themed rounded-xl shadow-sm hover:shadow-md hover:border-[color:var(--accent)]/40 transition-all cursor-pointer overflow-hidden flex flex-col h-full"
    >
      {/* IMAGE */}
      <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {imgLoading ? (
          <div className="w-full h-full bg-muted animate-pulse" />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="object-contain w-full h-full p-4 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <Package className="text-muted-foreground" size={36} strokeWidth={1} />
        )}
      </div>

      {/* DETAILS */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="text-sm font-medium text-foreground line-clamp-2 min-h-[40px] leading-tight">
          {product.name}
        </h3>

        <p className="mt-2 font-semibold text-base text-foreground">
          <span className="text-sm font-normal">₹</span>
          {product.sellingPrice.toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
}
