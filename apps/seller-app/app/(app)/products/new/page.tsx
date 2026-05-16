"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { useT } from "@/src/i18n/useT";

type Status = "ACTIVE" | "INACTIVE";

interface FormState {
  name: string;
  description: string;
  status: Status;
  costPrice: string;
  shippingCost: string;
  packagingCost: string;
  competitorPrice: string;
  offerPrice: string;
}

interface MediaItem {
  file: File;
  preview: string;
  type: "image" | "video";
}

const COMPRESSION_OPTS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
};

const empty: FormState = {
  name: "",
  description: "",
  status: "ACTIVE",
  costPrice: "",
  shippingCost: "",
  packagingCost: "",
  competitorPrice: "",
  offerPrice: "",
};

export default function NewProductPage() {
  const t = useT();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mainIndex, setMainIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    return () => {
      media.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, [media]);

  const cost = Number(form.costPrice) || 0;
  const shipping = Number(form.shippingCost) || 0;
  const packaging = Number(form.packagingCost) || 0;
  const competitor = Number(form.competitorPrice) || 0;
  const offer = Number(form.offerPrice) || 0;
  const baseTotal = cost + shipping + packaging;
  const finalTotal = offer > 0 ? offer : baseTotal;
  const sellingBelowCost = offer > 0 && offer < baseTotal;

  const margin = useMemo(
    () => (finalTotal > 0 ? ((finalTotal - baseTotal) / finalTotal) * 100 : 0),
    [finalTotal, baseTotal]
  );

  const discountBase = competitor > 0 ? competitor : 0;
  const discount =
    discountBase > 0 && offer > 0 && offer < discountBase
      ? ((discountBase - offer) / discountBase) * 100
      : 0;

  const validForm =
    form.name.trim().length >= 2 && cost > 0 && media.length > 0;

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: MediaItem[] = [];

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      if (isVideo) {
        if (file.size > 20 * 1024 * 1024) {
          setToast({ kind: "err", msg: "Video must be under 20MB" });
          continue;
        }
        next.push({
          file,
          preview: URL.createObjectURL(file),
          type: "video",
        });
      } else if (isImage) {
        try {
          const compressed = await imageCompression(file, COMPRESSION_OPTS);
          next.push({
            file: compressed,
            preview: URL.createObjectURL(compressed),
            type: "image",
          });
        } catch {
          next.push({ file, preview: URL.createObjectURL(file), type: "image" });
        }
      }
    }
    setMedia((prev) => [...prev, ...next].slice(0, 6));
  };

  const removeMedia = (i: number) => {
    setMedia((prev) => {
      const removed = prev[i];
      if (removed) URL.revokeObjectURL(removed.preview);
      const next = prev.filter((_, idx) => idx !== i);
      if (mainIndex >= next.length) setMainIndex(0);
      return next;
    });
  };

  const submit = async () => {
    if (!validForm || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
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
      media.forEach((item) => fd.append("media", item.file));
      fd.append("mainImageIndex", mainIndex.toString());

      const res = await fetch("/api/products/create", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `Backend error ${res.status}`);
      }

      setToast({ kind: "ok", msg: "Product added successfully" });
      setTimeout(() => router.push("/products"), 600);
    } catch (e) {
      setToast({
        kind: "err",
        msg: e instanceof Error ? e.message : "Failed to add product",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Topbar
        title={t("products.new.title")}
        subtitle={t("products.new.subtitle")}
        actions={
          <a href="/products">
            <Button variant="outline">
              <ArrowLeft className="size-4" />
              {t("common.backToList")}
            </Button>
          </a>
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-3 sm:p-4 lg:p-6 sm:gap-6">
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium ring-1 ring-inset ${
              toast.kind === "ok"
                ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)] ring-[color:var(--accent)]/30"
                : "bg-red-500/15 text-red-300 ring-red-500/30"
            }`}
          >
            {toast.msg}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left Column */}
          <div className="flex flex-col gap-4 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>{t("products.new.basicTitle")}</CardTitle>
                <CardDescription>{t("products.new.basicDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Field label={t("products.new.fieldName")} required>
                  <Input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder={t("products.new.fieldNamePh")}
                    autoFocus
                  />
                </Field>
                <Field label={t("products.new.fieldDesc")}>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    placeholder={t("products.new.fieldDescPh")}
                    rows={3}
                  />
                </Field>
                <Field label={t("products.new.fieldStatus")}>
                  <Select
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value as Status)}
                  >
                    <option value="ACTIVE">{t("products.new.statusActive")}</option>
                    <option value="INACTIVE">{t("products.new.statusInactive")}</option>
                  </Select>
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("products.new.pricingTitle")}</CardTitle>
                <CardDescription>{t("products.new.pricingDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <PriceField
                  label={t("products.new.fieldCost")}
                  required
                  hint={t("products.new.fieldCostHint")}
                  value={form.costPrice}
                  onChange={(v) => setField("costPrice", v)}
                />
                <PriceField
                  label={t("products.new.fieldShipping")}
                  hint={t("products.new.fieldShippingHint")}
                  value={form.shippingCost}
                  onChange={(v) => setField("shippingCost", v)}
                />
                <PriceField
                  label={t("products.new.fieldPackaging")}
                  hint={t("products.new.fieldPackagingHint")}
                  value={form.packagingCost}
                  onChange={(v) => setField("packagingCost", v)}
                />
                <PriceField
                  label={t("products.new.fieldCompetitor")}
                  hint={t("common.optional")}
                  value={form.competitorPrice}
                  onChange={(v) => setField("competitorPrice", v)}
                />
                <PriceField
                  label={t("products.new.fieldOffer")}
                  hint={t("products.new.fieldOfferHint")}
                  value={form.offerPrice}
                  onChange={(v) => setField("offerPrice", v)}
                  className="sm:col-span-2"
                />
                {sellingBelowCost && (
                  <div className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                    <AlertTriangle className="size-3.5" />
                    {t("products.new.belowCost")} ({formatINR(offer)} / {formatINR(baseTotal)})
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("products.new.photosTitle")}</CardTitle>
                <CardDescription>{t("products.new.photosDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    onPickFiles(e.dataTransfer.files);
                  }}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border bg-muted/40 p-6 text-center transition hover:border-[color:var(--accent)]/40"
                >
                  <Upload className="size-5 text-[color:var(--accent)]" />
                  <p className="text-sm font-medium">Upload Image or Video</p>
                  <p className="text-xs text-muted-foreground">{t("products.new.fileTypes")}</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    onPickFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                {media.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {media.map((item, i) => (
                      <div
                        key={i}
                        className={`group relative aspect-square overflow-hidden rounded-lg ring-2 transition ${
                          i === mainIndex ? "ring-[color:var(--accent)]" : "ring-border"
                        }`}
                      >
                        {item.type === "video" ? (
                          <video
                            src={item.preview}
                            className="size-full object-cover"
                            muted
                            onMouseOver={(e) => e.currentTarget.play()}
                            onMouseOut={(e) => {
                              e.currentTarget.pause();
                              e.currentTarget.currentTime = 0;
                            }}
                          />
                        ) : (
                          <img src={item.preview} alt="" className="size-full object-cover" />
                        )}

                        {i === mainIndex && (
                          <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-[color:var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            <Star className="size-2.5 fill-current" /> {t("products.new.main")}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => removeMedia(i)}
                          className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-card/95 text-foreground opacity-0 transition group-hover:opacity-100"
                        >
                          <X className="size-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setMainIndex(i)}
                          className="absolute inset-x-1 bottom-1 rounded-md bg-card/85 px-2 py-1 text-[10px] font-medium text-foreground opacity-0 transition group-hover:opacity-100"
                        >
                          {t("products.new.setMain")}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-[color:var(--accent)]/30 bg-[color:var(--accent-soft)]/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {t("products.new.summary")}
                  <Badge variant="success">{form.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <Stat label={t("products.new.totalCost")} value={formatINR(baseTotal)} />
                <Stat
                  label={t("products.new.sellingPrice")}
                  value={formatINR(finalTotal)}
                  highlight={finalTotal > 0}
                />
                <Stat
                  label={t("products.new.margin")}
                  value={`${margin.toFixed(1)}%`}
                  highlight={margin > 0}
                />
                <Stat
                  label={t("products.new.discount")}
                  value={discount > 0 ? `${discount.toFixed(1)}%` : "—"}
                />
                {competitor > 0 && (
                  <Stat
                    label={t("products.new.vsCompetitor")}
                    value={`${(((finalTotal - competitor) / competitor) * 100).toFixed(1)}%`}
                  />
                )}
              </CardContent>
            </Card>

            <Button
              size="lg"
              onClick={submit}
              disabled={!validForm || submitting}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("settings.saving")}
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  {t("products.new.saveProduct")}
                </>
              )}
            </Button>
            {!validForm && (
              <p className="text-xs text-muted-foreground text-center">
                {t("products.new.needFields")}
              </p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <Label>
          {label}
          {required && <span className="ml-1 text-[color:var(--accent)]">*</span>}
        </Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function PriceField({ label, hint, required, value, onChange, className }: { label: string; hint?: string; required?: boolean; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <div className="flex items-baseline justify-between">
        <Label>
          {label}
          {required && <span className="ml-1 text-[color:var(--accent)]">*</span>}
        </Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-7"
        />
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