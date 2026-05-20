"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Tag, Info, Clock, AlertCircle, Package, ChevronUp, ChevronDown } from "lucide-react";
import Image from "next/image";
import { Button } from "@workspace/ui";

interface DynamicPriceListing {
  publicToken: string;
  price: number;
  customerName?: string;
  note?: string;
  status: string;
  expiresAt: string;
  product: {
    id: number;
    name: string;
    description: string;
    imageCount: number;
    mainImageIndex: number;
    mainImageUrl: string;
    publicToken?: string; // Add product public token
  };
}

export default function DynamicPricePage() {
  const { storeToken, dynamicToken } = useParams<{ storeToken: string; dynamicToken: string }>();
  const router = useRouter();

  const [listing, setListing] = useState<DynamicPriceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [media, setMedia] = useState<Array<{ url: string; type: "image" | "video" }>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFullDesc, setShowFullDesc] = useState(false);

  useEffect(() => {
    if (!dynamicToken || !storeToken) {
      console.log("[Dynamic Price Page] Missing tokens:", { dynamicToken, storeToken });
      return;
    }

    const abortController = new AbortController();

    const fetchDynamicPrice = async () => {
      try {
        setLoading(true);
        const apiUrl = `/user/api/dynamic-price/${dynamicToken}`;
        console.log("[Dynamic Price Page] Fetching from:", apiUrl);
        
        const response = await fetch(apiUrl, {
          signal: abortController.signal,
        });
        
        console.log("[Dynamic Price Page] Response status:", response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          console.error("[Dynamic Price Page] Error response:", errorData);
          throw new Error(errorData.error || "Failed to load dynamic price");
        }
        
        const data = await response.json();
        console.log("[Dynamic Price Page] Success, data:", data);
        setListing(data);

        // Fetch product images
        if (data.product?.id) {
          fetchProductMedia(data.product.id);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log("[Dynamic Price Page] Request aborted");
          return;
        }
        console.error("[Dynamic Price Page] Error:", err);
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchDynamicPrice();
    return () => abortController.abort();
  }, [dynamicToken, storeToken]);

  const fetchProductMedia = async (productId: number) => {
    try {
      const requests = Array.from({ length: 5 }).map((_, i) =>
        fetch(`/user/api/products/image?id=${productId}&index=${i}`)
      );

      const responses = await Promise.all(requests);
      const valid = responses.filter((res) => res.ok);

      const items = await Promise.all(
        valid.map(async (res) => {
          const contentType = res.headers.get("content-type") || "";
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          
          return {
            url,
            type: contentType.includes("video") ? ("video" as const) : ("image" as const),
          };
        })
      );

      setMedia(items.length ? items : [{ url: "/placeholder.png", type: "image" }]);
    } catch (err) {
      console.error("Failed to fetch media:", err);
      setMedia([{ url: "/placeholder.png", type: "image" }]);
    }
  };

  const handleBuyNow = () => {
    if (!listing?.product) return;
    
    // Use product publicToken if available, otherwise fall back to product ID
    const productIdentifier = listing.product.publicToken || listing.product.id;
    console.log("[Dynamic Price] Product data:", listing.product);
    console.log("[Dynamic Price] Using product identifier:", productIdentifier);
    const checkoutUrl = `/${storeToken}/product/${productIdentifier}/checkout?dynamicPrice=${dynamicToken}&qty=1`;
    console.log("[Dynamic Price] Redirecting to:", checkoutUrl);
    router.push(checkoutUrl);
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-[color:var(--accent)]" size={40} />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-full flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-sm border border-themed p-6 text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Offer Not Available
          </h1>
          <p className="text-muted-foreground mb-6">
            {error || "This special offer is no longer available."}
          </p>
          <Button onClick={() => router.push(`/${storeToken}/store`)}>
            Browse Store
          </Button>
        </div>
      </div>
    );
  }

  const isExpired = listing.status !== "ACTIVE";
  const expiresAt = new Date(listing.expiresAt);
  const now = new Date();
  const timeLeft = expiresAt.getTime() - now.getTime();
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  const activeItem = media[currentIndex];

  return (
    <div className="min-h-full bg-background flex flex-col items-center p-0 md:p-6 pb-12">
      <div className="w-full max-w-md bg-card md:rounded-2xl md:shadow-sm border border-themed">
        {/* Header */}
        <div className="p-4 flex items-center gap-3 border-b border-themed sticky top-0 bg-card/85 backdrop-blur-md z-30">
          <button
            onClick={() => router.back()}
            className="p-1 -ml-1 rounded-md hover:bg-muted transition"
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-foreground">Special Offer</h1>
            {listing.customerName && (
              <p className="text-xs text-muted-foreground">For {listing.customerName}</p>
            )}
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Product Images */}
          <div className="space-y-3">
            <div className="relative aspect-square w-full bg-muted rounded-xl overflow-hidden border border-themed">
              {activeItem?.type === "video" ? (
                <video
                  src={activeItem.url}
                  className="w-full h-full object-contain p-2"
                  controls
                  playsInline
                  autoPlay
                  muted
                />
              ) : (
                <Image
                  src={activeItem?.url || "/placeholder.png"}
                  alt={listing.product.name}
                  fill
                  className="object-contain p-4"
                  unoptimized
                />
              )}
            </div>

            {/* Thumbnails */}
            {media.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {media.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative w-16 h-16 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all ${
                      currentIndex === idx ? "border-[color:var(--accent)]" : "border-transparent opacity-70"
                    }`}
                  >
                    <Image src={item.url} alt="thumb" fill className="object-cover" unoptimized />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-4">
            {/* Special Offer Badge */}
            <div className="bg-[color:var(--accent-soft)] rounded-xl p-4 border border-[color:var(--accent)]/20">
              <div className="inline-flex items-center gap-1 bg-[color:var(--accent)] text-[color:var(--accent-foreground)] text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider">
                <Tag size={10} /> Special Price
              </div>

              <div className="flex justify-between items-start">
                <h2 className="font-semibold text-xl text-foreground flex-1 pr-2 leading-tight">
                  {listing.product.name}
                </h2>
                <div className="text-right whitespace-nowrap">
                  <p className="text-2xl font-semibold text-[color:var(--accent)]">
                    ₹{listing.price.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Expiry Timer */}
              {!isExpired && timeLeft > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-[color:var(--accent)]">
                  <Clock size={14} />
                  <span className="font-medium">
                    Expires in {hoursLeft}h {minutesLeft}m
                  </span>
                </div>
              )}
            </div>

            {/* Note */}
            {listing.note && (
              <div className="bg-card rounded-xl border border-themed p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Info size={16} />
                  <span className="text-xs font-semibold uppercase tracking-widest">Special Note</span>
                </div>
                <p className="text-sm text-foreground/85 leading-relaxed">
                  {listing.note}
                </p>
              </div>
            )}

            {/* Description */}
            {listing.product.description && (
              <div className="bg-card rounded-xl border border-themed overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Info size={16} />
                    <span className="text-xs font-semibold uppercase tracking-widest">Product Details</span>
                  </div>
                  <div className="transition-all duration-300">
                    <p className={`text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap ${!showFullDesc ? "line-clamp-2" : ""}`}>
                      {listing.product.description}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowFullDesc(!showFullDesc)}
                    className="mt-3 w-full flex items-center justify-center gap-1 py-2 text-[color:var(--accent)] text-sm font-medium hover:bg-[color:var(--accent-soft)] rounded-lg transition-colors"
                  >
                    {showFullDesc ? (
                      <>
                        Show Less <ChevronUp size={16} />
                      </>
                    ) : (
                      <>
                        Read Full Description <ChevronDown size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-6 border-t border-themed">
            {isExpired ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                <p className="text-red-500 font-semibold">
                  This offer has {listing.status === "USED" ? "been used" : "expired"}
                </p>
              </div>
            ) : (
              <Button
                size="lg"
                onClick={handleBuyNow}
                className="w-full"
              >
                <Package />
                Buy Now at Special Price
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
