"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui";
import { Loader2, RotateCcw, ZoomIn } from "lucide-react";

interface Props {
  open: boolean;
  file: File | null;
  onCancel: () => void;
  onCropped: (file: File) => void;
}

/**
 * Crops the seller's QR screenshot down to a 1:1 square so the buyer-facing
 * image is just the code itself — no app chrome, no whitespace. Wraps
 * react-easy-crop with a square aspect lock and outputs a fresh PNG/JPEG
 * File via canvas, ready to upload.
 */
export function QrCropDialog({ open, file, onCancel, onCropped }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  // Read the picked file into a data URL once when the dialog opens.
  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  }, [file]);

  // Reset crop state every time a new file comes in.
  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open, file]);

  const onCropComplete = useCallback((_: Area, areaPx: Area) => {
    setCroppedAreaPixels(areaPx);
  }, []);

  const confirm = async () => {
    if (!file || !imageSrc || !croppedAreaPixels) return;
    try {
      setBusy(true);
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, file.type);
      const ext = file.type.includes("jpeg") ? "jpg" : "png";
      const cropped = new File([blob], `qr-cropped.${ext}`, {
        type: blob.type,
      });
      onCropped(cropped);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onCancel() : undefined)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crop your QR code</DialogTitle>
          <DialogDescription>
            Drag to position and pinch / use the slider to zoom. Keep just the
            QR square — trim away anything else.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-black/80">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ZoomIn className="size-4 text-muted-foreground" />
          <input
            type="range"
            min={1}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[color:var(--accent)]"
            aria-label="Zoom"
          />
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setCrop({ x: 0, y: 0 });
            }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={busy || !croppedAreaPixels}>
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Cropping…
              </>
            ) : (
              "Use cropped QR"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Render the visible crop region into a canvas and return the PNG/JPEG bytes.
async function getCroppedBlob(
  imageSrc: string,
  area: Area,
  mime: string
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height
  );

  const outType = mime === "image/jpeg" ? "image/jpeg" : "image/png";
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      outType,
      0.92
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
