"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ImageIcon,
  Loader2,
  Star,
  Upload,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Textarea,
  Topbar,
  formatINR,
} from "@workspace/ui";
import { encryptAES } from "@/src/lib/crypto/aes";
import { compressVideo, isFFmpegSupported } from "@/src/lib/video-compressor";
import type { Product } from "@/src/types/product";

type Status = "ACTIVE" | "INACTIVE";

interface FormState {
  id: number;
  name: string;
  description: string;
  status: Status;
  costPrice: string;
  shippingCost: string;
  packagingCost: string;
  competitorPrice: string;
  offerPrice: string;
}

type MediaItem =
  | { kind: "url"; index: number; src: string; type: "image" | "video" }
  | { kind: "file"; file: File; preview: string; type: "image" | "video" };

const COMPRESSION_OPTS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
};

// Auto video compression settings using FFmpeg
const AUTO_VIDEO_COMPRESSION = {
  enabled: true,
  maxResolution: 1280,
  bitrate: '800k',
  crf: 28, // Quality: lower = better, higher = more compression
  preset: 'fast' as const,
};

const blank: FormState = {
  id: 0,
  name: "",
  description: "",
  status: "ACTIVE",
  costPrice: "",
  shippingCost: "",
  packagingCost: "",
  competitorPrice: "",
  offerPrice: "",
};

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(blank);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mainIndex, setMainIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/fetch?id=${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Backend ${res.status}`);
        const p = (await res.json()) as Product & { offerPrice?: number; imagePaths?: string[] };
        if (cancelled) return;

        setForm({
          id: p.id,
          name: p.name ?? "",
          description: p.description ?? "",
          status: (p.status ?? "ACTIVE") as Status,
          costPrice: String(p.costPrice ?? ""),
          shippingCost: String(p.shippingCost ?? ""),
          packagingCost: String(p.packagingCost ?? ""),
          competitorPrice: String(p.competitorPrice ?? ""),
          offerPrice: String(p.sellingPrice ?? p.offerPrice ?? ""),
        });

        const items: MediaItem[] = [];
        for (let i = 0; i < 6; i++) {
          const mRes = await fetch(`/api/products/image?id=${p.id}&index=${i}`, { cache: "no-store" });
          if (!mRes.ok) break;
          const contentType = mRes.headers.get("content-type") || "";
          const isVid = contentType.includes("video") || (p.imagePaths?.[i]?.toLowerCase().match(/\.(mp4|webm|mov)$/));
          items.push({
            kind: "url",
            index: i,
            src: `/api/products/image?id=${p.id}&index=${i}`,
            type: isVid ? "video" : "image",
          });
        }
        if (cancelled) return;
        setMedia(items);
        setMainIndex(p.mainImageIndex || 0);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load product");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    return () => media.forEach((m) => { if (m.kind === "file") URL.revokeObjectURL(m.preview); });
  }, [media]);

  const cost = Number(form.costPrice) || 0;
  const shipping = Number(form.shippingCost) || 0;
  const packaging = Number(form.packagingCost) || 0;
  const competitor = Number(form.competitorPrice) || 0;
  const offer = Number(form.offerPrice) || 0;
  const baseTotal = cost + shipping + packaging;
  const finalTotal = offer > 0 ? offer : baseTotal;
  const sellingBelowCost = offer > 0 && offer < baseTotal;

  const margin = useMemo(() => (finalTotal > 0 ? ((finalTotal - baseTotal) / finalTotal) * 100 : 0), [finalTotal, baseTotal]);
  const discountBase = competitor > 0 ? competitor : 0;
  const discount = discountBase > 0 && offer > 0 && offer < discountBase ? ((discountBase - offer) / discountBase) * 100 : 0;

  const validForm = form.name.trim().length >= 2 && cost > 0 && media.length > 0;

  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setToast({ kind: "ok", msg: `Processing ${files.length} file(s)...` });
    const next: MediaItem[] = [];
    
    for (const file of Array.from(files)) {
      if (file.type.startsWith("video/")) {
        const originalSizeMB = (file.size / 1024 / 1024).toFixed(1);
        
        // Check if file is too large
        if (file.size > 200 * 1024 * 1024) {
          setToast({ kind: "err", msg: `${file.name}: File too large (${originalSizeMB}MB). Max 200MB.` });
          continue;
        }
        
        // Auto-compress videos using FFmpeg
        if (AUTO_VIDEO_COMPRESSION.enabled && isFFmpegSupported()) {
          try {
            setToast({ kind: "ok", msg: `Compressing ${file.name} (${originalSizeMB}MB)... Please wait.` });
            
            const compressed = await compressVideo(file, {
              maxResolution: AUTO_VIDEO_COMPRESSION.maxResolution,
              bitrate: AUTO_VIDEO_COMPRESSION.bitrate,
              crf: AUTO_VIDEO_COMPRESSION.crf,
              preset: AUTO_VIDEO_COMPRESSION.preset,
              onProgress: (progress) => {
                if (progress % 10 === 0) { // Update every 10%
                  setToast({ kind: "ok", msg: `Compressing ${file.name}... ${progress}%` });
                }
              },
            });
            
            const compressedSizeMB = (compressed.size / 1024 / 1024).toFixed(1);
            
            // Check if still too large after compression
            if (compressed.size > 50 * 1024 * 1024) {
              setToast({ 
                kind: "err", 
                msg: `${file.name}: Still ${compressedSizeMB}MB after compression. Try a shorter video.` 
              });
              continue;
            }
            
            next.push({ 
              kind: "file", 
              file: compressed, 
              preview: URL.createObjectURL(compressed), 
              type: "video" 
            });
            
            const savings = ((1 - compressed.size / file.size) * 100).toFixed(0);
            setToast({ 
              kind: "ok", 
              msg: `✓ ${file.name}: ${originalSizeMB}MB → ${compressedSizeMB}MB (${savings}% smaller)` 
            });
          } catch (err) {
            console.error("Video compression failed:", err);
            const errorMsg = err instanceof Error ? err.message : "Unknown error";
            setToast({ kind: "err", msg: `${file.name}: ${errorMsg}` });
            
            // Fallback: try to use original if it's small enough
            if (file.size <= 50 * 1024 * 1024) {
              next.push({ kind: "file", file, preview: URL.createObjectURL(file), type: "video" });
              setToast({ kind: "ok", msg: `${file.name}: Using original (${originalSizeMB}MB)` });
            }
          }
        } else if (!isFFmpegSupported()) {
          setToast({ kind: "err", msg: "Video compression not supported in this browser. Please use Chrome, Firefox, or Edge." });
          // Use original if small enough
          if (file.size <= 50 * 1024 * 1024) {
            next.push({ kind: "file", file, preview: URL.createObjectURL(file), type: "video" });
          }
        } else {
          // No compression
          if (file.size > 50 * 1024 * 1024) {
            setToast({ kind: "err", msg: `${file.name}: Must be under 50MB` });
            continue;
          }
          next.push({ kind: "file", file, preview: URL.createObjectURL(file), type: "video" });
        }
      } else {
        // Image compression (existing)
        try {
          const compressed = await imageCompression(file, COMPRESSION_OPTS);
          next.push({ kind: "file", file: compressed, preview: URL.createObjectURL(compressed), type: "image" });
        } catch {
          next.push({ kind: "file", file, preview: URL.createObjectURL(file), type: "image" });
        }
      }
    }
    
    setMedia((prev) => [...prev, ...next].slice(0, 6));
    if (next.length > 0) {
      setToast({ kind: "ok", msg: `✓ Added ${next.length} file(s) successfully` });
    }
  };

  // Auto video compression helper
  const removeMedia = (i: number) => {
    setMedia((prev) => {
      const removed = prev[i];
      if (removed?.kind === "file") URL.revokeObjectURL(removed.preview);
      const nextArr = prev.filter((_, idx) => idx !== i);
      if (mainIndex >= nextArr.length) setMainIndex(0);
      return nextArr;
    });
  };

  const submit = async () => {
    if (!validForm || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        id: form.id,
        name: form.name.trim(),
        description: form.description.trim(),
        status: form.status,
        costPrice: cost,
        shippingCost: shipping,
        packagingCost: packaging,
        competitorPrice: competitor,
        sellingPrice: finalTotal,
      };
      const encrypted = await encryptAES(JSON.stringify(payload));
      const fd = new FormData();
      fd.append("request", encrypted);
      
      // Build media update info
      // Track which existing media to keep and which are new
      const keepIndices: number[] = [];
      const newFiles: File[] = [];
      let adjustedMainIndex = 0;
      
      media.forEach((m, idx) => {
        if (m.kind === "url") {
          // Keep existing media at its original index
          keepIndices.push(m.index);
          // Track if this is the main image
          if (idx === mainIndex) {
            adjustedMainIndex = keepIndices.length - 1;
          }
        } else {
          // New file to upload
          newFiles.push(m.file);
          // Track if this is the main image
          if (idx === mainIndex) {
            adjustedMainIndex = keepIndices.length + newFiles.length - 1;
          }
        }
      });
      
      // Send keep indices as JSON array
      fd.append("keepIndices", JSON.stringify(keepIndices));
      
      // Send new files
      newFiles.forEach((file) => fd.append("media", file));
      
      // Send adjusted main index (position in final array)
      fd.append("mainImageIndex", adjustedMainIndex.toString());

      const res = await fetch("/api/products/create", { method: "PUT", body: fd });
      if (!res.ok) throw new Error(await res.text() || `Backend Error ${res.status}`);
      setToast({ kind: "ok", msg: "Product updated" });
      setTimeout(() => router.push("/products"), 600);
    } catch (e) {
      setToast({ kind: "err", msg: e instanceof Error ? e.message : "Failed to update" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main className="grid place-items-center p-12"><Loader2 className="size-8 animate-spin text-[color:var(--accent)]" /></main>;

  return (
    <>
      <Topbar title={`Edit · ${form.name || `#${form.id}`}`} actions={<a href="/products"><Button variant="outline"><ArrowLeft className="size-4 mr-2" /> Back</Button></a>} />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-3 sm:p-4 sm:gap-6 lg:p-6">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium ring-1 ring-inset ${toast.kind === "ok" ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)] ring-[color:var(--accent)]/30" : "bg-red-500/15 text-red-300 ring-red-500/30"}`}>
            {toast.msg}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="flex flex-col gap-4 lg:col-span-3">
            <Card>
              <CardHeader><CardTitle>Basic details</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Field label="Product name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></Field>
                <Field label="Status">
                  <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </Select>
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <PriceField label="Cost price" required value={form.costPrice} onChange={(v: string) =>setForm({ ...form, costPrice: v })} />
                <PriceField label="Shipping" value={form.shippingCost} onChange={(v : string) => setForm({ ...form, shippingCost: v })} />
                <PriceField label="Packaging" value={form.packagingCost} onChange={(v: string) => setForm({ ...form, packagingCost: v })} />
                <PriceField label="Offer price" value={form.offerPrice} onChange={(v: string) => setForm({ ...form, offerPrice: v })} className="sm:col-span-2" />
                {sellingBelowCost && (
                  <div className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                    <AlertTriangle className="size-3.5" />
                    Heads up: {formatINR(offer)} is below your total cost ({formatINR(baseTotal)})
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-2">
            <Card>
              <CardHeader><CardTitle>Photos & Videos</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div onClick={() => fileRef.current?.click()} className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/40 p-6 text-center transition hover:border-[color:var(--accent)]/40">
                  <Upload className="size-5 text-[color:var(--accent)]" />
                  <p className="text-sm font-medium">Add Image or Video</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => onPickFiles(e.target.files)} />
                <div className="grid grid-cols-3 gap-2">
                  {media.map((m, i) => (
                    <div key={i} className={`group relative aspect-square overflow-hidden rounded-lg ring-2 transition ${i === mainIndex ? "ring-[color:var(--accent)]" : "ring-border"}`}>
                      {m.type === "video" ? (
                        <video src={m.kind === "url" ? m.src : m.preview} className="size-full object-cover" muted playsInline onMouseOver={e => e.currentTarget.play()} onMouseOut={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }} />
                      ) : (
                        <img src={m.kind === "url" ? m.src : m.preview} alt="" className="size-full object-cover" />
                      )}
                      <button onClick={() => removeMedia(i)} className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-card/95 opacity-0 group-hover:opacity-100 transition"><X className="size-3" /></button>
                      <button onClick={() => setMainIndex(i)} className="absolute inset-x-1 bottom-1 rounded-md bg-card/85 py-1 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition">Set main</button>
                      {i === mainIndex && <span className="absolute left-1 top-1 rounded-full bg-[color:var(--accent)] p-1 text-white"><Star className="size-2.5 fill-current" /></span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-[color:var(--accent)]/30 bg-[color:var(--accent-soft)]/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Summary <Badge variant="success">{form.status}</Badge></CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Total cost" value={formatINR(baseTotal)} />
                <Stat label="Selling price" value={formatINR(finalTotal)} highlight={finalTotal > 0} />
                <Stat label="Margin" value={`${margin.toFixed(1)}%`} highlight={margin > 0} />
                <Stat label="Discount" value={discount > 0 ? `${discount.toFixed(1)}%` : "—"} />
              </CardContent>
            </Card>

            <Button size="lg" onClick={submit} disabled={!validForm || submitting} className="w-full">
              {submitting ? <><Loader2 className="size-4 animate-spin mr-2" /> Saving...</> : <><Check className="size-4 mr-2" /> Update product</>}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label} {required && <span className="text-[color:var(--accent)]">*</span>}</Label>
      {children}
    </div>
  );
}

function PriceField({ label, value, onChange, className, required }: any) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label>{label} {required && "*"}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
        <Input type="number" className="pl-7" value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-base font-semibold tabular-nums ${highlight ? "text-[color:var(--accent)]" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}