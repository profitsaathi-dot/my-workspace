"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, X, PlayCircle } from "lucide-react";

const PLACEHOLDER = "/placeholder.png";
const MAX_PROBES = 6;

interface MediaItem {
  url: string;
  type: "image" | "video";
}

export default function ProductImages({
  productId,
  productName = "product",
}: {
  productId?: number;
  productName?: string;
}) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mainIndex, setMainIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const startX = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!productId) {
      setMedia([]);
      return;
    }

    let items: MediaItem[] = [];
    let cancelled = false;

    const fetchMedia = async () => {
      try {
        const requests = Array.from({ length: MAX_PROBES }).map((_, i) =>
          fetch(`/api/products/image?id=${productId}&index=${i}`)
        );
        const responses = await Promise.all(requests);
        const validResponses = responses.filter((res) => res.ok);

        const mediaItems = await Promise.all(
          validResponses.map(async (res) => {
            const contentType = res.headers.get("content-type") || "";
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            return {
              url,
              type: contentType.includes("video") ? ("video" as const) : ("image" as const),
            };
          })
        );

        if (cancelled) {
          mediaItems.forEach((m) => URL.revokeObjectURL(m.url));
          return;
        }

        items = mediaItems;
        setMedia(items.length ? items : [{ url: PLACEHOLDER, type: "image" }]);
      } catch {
        if (!cancelled) setMedia([{ url: PLACEHOLDER, type: "image" }]);
      }
    };

    fetchMedia();

    return () => {
      cancelled = true;
      items.forEach((m) => URL.revokeObjectURL(m.url));
    };
  }, [productId]);

  if (media.length === 0) return null;

  const activeMedia = media[mainIndex];

  const next = () => {
    setDirection(1);
    setMainIndex((p) => (p + 1) % media.length);
  };

  const prev = () => {
    setDirection(-1);
    setMainIndex((p) => (p - 1 + media.length) % media.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const endX = e.changedTouches[0].clientX;
    const diff = startX.current - endX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
    isDragging.current = false;
  };

  if (isPreviewOpen) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          onClick={() => setIsPreviewOpen(false)}
          className="absolute right-6 top-6 z-[60] rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        >
          <X size={24} />
        </button>

        <div className="relative flex h-[80vh] w-full max-w-5xl items-center justify-center">
          {activeMedia.type === "video" ? (
            <video
              key={activeMedia.url}
              src={activeMedia.url}
              controls
              autoPlay
              className="max-h-full max-w-full rounded-lg"
            />
          ) : (
            <Image
              src={activeMedia.url}
              alt={productName}
              fill
              className="object-contain"
              unoptimized
            />
          )}
        </div>

        {media.length > 1 && (
          <div className="absolute bottom-8 flex gap-4">
            <button onClick={prev} className="rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20">
              <ChevronLeft size={24} />
            </button>
            <button onClick={next} className="rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20">
              <ChevronRight size={24} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-background"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={mainIndex}
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, x: direction * 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 50 }}
            transition={{ duration: 0.3 }}
            onClick={() => {
              if (!isDragging.current) setIsPreviewOpen(true);
            }}
          >
            {activeMedia.type === "video" ? (
              <div className="relative h-full w-full">
                <video
                  src={activeMedia.url}
                  className="h-full w-full cursor-pointer object-contain p-2"
                  muted
                  playsInline
                  onMouseOver={(e) => e.currentTarget.play()}
                  onMouseOut={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 0;
                  }}
                />
                <div className="pointer-events-none absolute bottom-4 right-4 text-white/70">
                   <PlayCircle size={32} />
                </div>
              </div>
            ) : (
              <Image
                src={activeMedia.url}
                alt={productName}
                fill
                className="h-full w-full cursor-pointer object-contain p-4"
                priority
                unoptimized
              />
            )}
          </motion.div>
        </AnimatePresence>

        <button
          onClick={() => setIsPreviewOpen(true)}
          className="absolute right-2 top-2 z-20 rounded-lg bg-card/80 p-1.5 text-foreground shadow-sm transition-opacity md:opacity-0 md:group-hover:opacity-100"
        >
          <Maximize2 size={16} />
        </button>

        {media.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-card/90 p-2 text-foreground shadow-md transition-all hover:bg-card md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-card/90 p-2 text-foreground shadow-md transition-all hover:bg-card md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {media.length > 1 && (
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
          {media.map((m, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDirection(idx > mainIndex ? 1 : -1);
                setMainIndex(idx);
              }}
              className={`relative size-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                mainIndex === idx
                  ? "scale-95 border-[color:var(--accent)]"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {m.type === "video" ? (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <video src={m.url} className="h-full w-full object-cover" muted />
                  <PlayCircle size={16} className="absolute text-white shadow-sm" />
                </div>
              ) : (
                <Image src={m.url} alt={`thumbnail-${idx}`} fill className="object-cover" unoptimized />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}