"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, ChevronLeft, ChevronRight, X, PlayCircle } from "lucide-react";

interface MediaItem {
  url: string;
  type: "image" | "video";
}

export default function ProductImages({ productId }: { productId?: number }) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const startX = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!productId) return;

    let mediaItems: MediaItem[] = [];

    const fetchMedia = async () => {
      try {
        // Probing 5 possible slots for media
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
            
            // Critical check: determine if it's a video or image
            return {
              url,
              type: contentType.includes("video") ? ("video" as const) : ("image" as const),
            };
          })
        );

        mediaItems = items;
        setMedia(items.length ? items : [{ url: "/placeholder.png", type: "image" }]);
      } catch (err) {
        setMedia([{ url: "/placeholder.png", type: "image" }]);
      }
    };

    fetchMedia();

    return () => {
      mediaItems.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [productId]);

  const activeItem = media[currentIndex];

  const next = () => {
    setDirection(1);
    setCurrentIndex((p) => (p + 1) % media.length);
  };

  const prev = () => {
    setDirection(-1);
    setCurrentIndex((p) => (p - 1 + media.length) % media.length);
  };

  if (media.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full bg-muted rounded-xl overflow-hidden border border-themed group">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, x: direction * 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 50 }}
            transition={{ duration: 0.3 }}
          >
            {activeItem?.type === "video" ? (
              <video
                src={activeItem.url}
                className="w-full h-full object-contain p-2"
                controls
                playsInline
                autoPlay
                muted // Autoplay usually requires mute in browsers
              />
            ) : (
              <Image
                src={activeItem?.url || "/placeholder.png"}
                alt="product"
                fill
                className="object-contain p-4"
                unoptimized // Critical for Object URLs
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {media.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-card/90 p-2 rounded-full shadow-md z-10 hover:bg-card">
              <ChevronLeft size={18} />
            </button>
            <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/90 p-2 rounded-full shadow-md z-10 hover:bg-card">
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {media.map((item, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`relative w-16 h-16 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all ${
              currentIndex === idx ? "border-[color:var(--accent)]" : "border-transparent opacity-70"
            }`}
          >
            {item.type === "video" ? (
              <div className="w-full h-full bg-black flex items-center justify-center">
                <PlayCircle size={20} className="text-white z-10" />
                <video src={item.url} className="w-full h-full object-cover opacity-60" />
              </div>
            ) : (
              <Image src={item.url} alt="thumb" fill className="object-cover" unoptimized />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}