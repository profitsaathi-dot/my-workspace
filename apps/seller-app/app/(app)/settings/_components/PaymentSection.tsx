"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  QrCode,
  Save,
  Upload,
  Wallet,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  cn,
  toast,
} from "@workspace/ui";
import { useUserStore } from "@/src/stores/user.store";
import type { PaymentType, User } from "@/src/types/user";
import { QrCropDialog } from "./QrCropDialog";

const TYPES: {
  value: PaymentType;
  label: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "ONLINE",
    label: "Online payment",
    hint: "Take payment through Razorpay / UPI / cards manually outside the app.",
    icon: <CircleDollarSign className="size-5" />,
  },
  {
    value: "UPI_QR",
    label: "UPI QR code",
    hint: "Show your UPI QR code to buyers — they scan and pay directly.",
    icon: <QrCode className="size-5" />,
  },
  {
    value: "BANK_ACCOUNT",
    label: "Bank account",
    hint: "Share your account number and IFSC for direct bank transfers.",
    icon: <Banknote className="size-5" />,
  },
];

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/**
 * Payment-method settings. Shows three exclusive options; the chosen one
 * conditionally reveals its own fields. Bank-account number is collected
 * as a "password-style" pair (typed twice for verification) and never
 * round-trips back to the client — the server stores it write-only.
 */
export function PaymentSection() {
  const user = useUserStore((s) => s.user);
  const patchUser = useUserStore((s) => s.patchUser);

  const [type, setType] = useState<PaymentType | null>(null);

  // QR — track both the existing filename (from /me) and an optional new
  // file the user just picked. Upload happens on Save, not on pick.
  const [pickedQrFile, setPickedQrFile] = useState<File | null>(null);
  const [pickedQrPreview, setPickedQrPreview] = useState<string | null>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Raw file the user just selected — held aside while they crop it down to
  // the QR square before it becomes the upload candidate.
  const [rawPicked, setRawPicked] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  // Bank account — both fields password-style, second is the
  // verification copy. Never displays the previously-saved value because
  // the backend never returns it.
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountConfirm, setBankAccountConfirm] = useState("");
  const [showBank, setShowBank] = useState(false);
  const [ifsc, setIfsc] = useState("");

  // IFSC → bank/branch resolution via /api/ifsc/<code>. Debounced so the
  // user doesn't hit Razorpay on every keystroke, and aborted on each new
  // value so out-of-order responses can't clobber a fresh result.
  const [ifscLookup, setIfscLookup] = useState<{
    state: "idle" | "loading" | "ok" | "error";
    bank?: string | null;
    branch?: string | null;
    city?: string | null;
    state_?: string | null;
    error?: string;
  }>({ state: "idle" });

  const [saving, setSaving] = useState(false);

  // Hydrate on first load + whenever the user record refreshes.
  useEffect(() => {
    setType(user?.paymentType ?? null);
    setIfsc(user?.bankAccountIfsc ?? "");
  }, [user?.paymentType, user?.bankAccountIfsc]);

  // Free the previous preview URL when a new one replaces it / on unmount.
  useEffect(() => {
    return () => {
      if (pickedQrPreview) URL.revokeObjectURL(pickedQrPreview);
    };
  }, [pickedQrPreview]);

  // Stage the raw file and open the cropper. The actual upload candidate
  // (pickedQrFile) is only set after the seller confirms a crop region.
  const onPickQr = (file: File | null) => {
    if (!file) return;
    setRawPicked(file);
    setCropOpen(true);
    // Reset the file input so re-selecting the same file fires onChange again.
    if (qrInputRef.current) qrInputRef.current.value = "";
  };

  const onCropConfirmed = (cropped: File) => {
    if (pickedQrPreview) URL.revokeObjectURL(pickedQrPreview);
    setPickedQrFile(cropped);
    setPickedQrPreview(URL.createObjectURL(cropped));
    setCropOpen(false);
    setRawPicked(null);
  };

  const onCropCancel = () => {
    setCropOpen(false);
    setRawPicked(null);
  };

  const accountValid = /^\d{9,18}$/.test(bankAccount);
  const accountsMatch =
    bankAccount.length > 0 && bankAccount === bankAccountConfirm;
  const ifscValid = IFSC_REGEX.test(ifsc);

  // Resolve the IFSC to a bank + branch once it's well-formed. Debounce
  // by 300ms so we don't spam Razorpay while the user is still typing,
  // and abort in-flight calls when the value changes again.
  useEffect(() => {
    if (!ifscValid) {
      setIfscLookup({ state: "idle" });
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setIfscLookup({ state: "loading" });
      try {
        const res = await fetch(`/api/ifsc/${encodeURIComponent(ifsc)}`, {
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string };
          setIfscLookup({
            state: "error",
            error: body.message ?? "Couldn't find a bank for this IFSC",
          });
          return;
        }
        const data = (await res.json()) as {
          bank?: string | null;
          branch?: string | null;
          city?: string | null;
          state?: string | null;
        };
        setIfscLookup({
          state: "ok",
          bank: data.bank,
          branch: data.branch,
          city: data.city,
          state_: data.state,
        });
      } catch (e) {
        // AbortError fires whenever a newer keystroke supersedes us —
        // expected, not user-facing.
        if ((e as { name?: string })?.name === "AbortError") return;
        setIfscLookup({
          state: "error",
          error: e instanceof Error ? e.message : "Lookup failed",
        });
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [ifsc, ifscValid]);

  // What's required to enable Save varies by type.
  const canSave = useMemo(() => {
    if (saving || !type) return false;
    if (type === "ONLINE") return true;
    if (type === "UPI_QR") {
      // Allow saving even without a new pick — the user might be
      // switching from another type to QR after a previous upload.
      return !!pickedQrFile || !!user?.paymentQRCode;
    }
    if (type === "BANK_ACCOUNT") {
      // If neither account field is touched, we treat this as "type only"
      // update (e.g. user previously saved bank details and is just
      // re-affirming the type). Otherwise enforce match + IFSC.
      const enteringAccount =
        bankAccount.length > 0 || bankAccountConfirm.length > 0;
      if (enteringAccount) {
        return accountValid && accountsMatch && ifscValid;
      }
      return ifsc.length === 0 || ifscValid;
    }
    return false;
  }, [
    saving,
    type,
    pickedQrFile,
    user?.paymentQRCode,
    bankAccount,
    bankAccountConfirm,
    accountValid,
    accountsMatch,
    ifsc,
    ifscValid,
  ]);

  const save = async () => {
    if (!canSave || !type) return;
    setSaving(true);
    try {
      // 1) Upload QR first if there's a new file. The endpoint persists
      //    the filename onto the user row server-side; we don't need it
      //    in the PATCH body below.
      if (type === "UPI_QR" && pickedQrFile) {
        const fd = new FormData();
        fd.append("image", pickedQrFile, pickedQrFile.name);
        const upRes = await fetch("/api/user/payment/qr", {
          method: "POST",
          body: fd,
        });
        if (!upRes.ok) {
          const t = await upRes.text().catch(() => "");
          throw new Error(t || `QR upload failed (${upRes.status})`);
        }
        const upJson = (await upRes.json()) as { paymentQRCode?: string };
        if (upJson.paymentQRCode) {
          patchUser({ paymentQRCode: upJson.paymentQRCode } as Partial<User>);
        }
        // Drop the local pick — the server now owns it.
        if (pickedQrPreview) URL.revokeObjectURL(pickedQrPreview);
        setPickedQrFile(null);
        setPickedQrPreview(null);
      }

      // 2) PATCH the rest. Only include fields the user actually set so
      //    we don't accidentally clobber server-side values.
      const body: Record<string, string> = { paymentType: type };
      if (type === "BANK_ACCOUNT") {
        if (bankAccount.length > 0) {
          body.bankAccountNumber = bankAccount;
          body.bankAccountIfsc = ifsc.toUpperCase();
        } else if (ifsc.length > 0) {
          body.bankAccountIfsc = ifsc.toUpperCase();
        }
      }

      const res = await fetch("/api/user/payment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Save failed (${res.status})`);
      }

      // Mirror locally so the UI reflects the change without a re-fetch.
      patchUser({
        paymentType: type,
        bankAccountIfsc: ifsc ? ifsc.toUpperCase() : null,
      } as Partial<User>);

      // Clear the password-style fields — we never re-display them.
      setBankAccount("");
      setBankAccountConfirm("");
      toast.success("Payment settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="size-4 text-[color:var(--accent)]" />
          Payment method
        </CardTitle>
        <CardDescription>
          Pick how buyers should pay you. Only one method is shown to
          customers at a time.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TYPES.map((opt) => {
            const selected = type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                aria-pressed={selected}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border p-3 text-left transition",
                  selected
                    ? "border-[color:var(--accent)]/60 bg-[color:var(--accent-soft)]/50 ring-1 ring-[color:var(--accent)]/30"
                    : "border bg-muted/40 hover:bg-muted/70"
                )}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "grid size-9 place-items-center rounded-lg ring-1 ring-inset transition",
                      selected
                        ? "bg-[color:var(--accent)]/20 text-[color:var(--accent)] ring-[color:var(--accent)]/40"
                        : "bg-muted text-foreground ring-[color:var(--border)]"
                    )}
                  >
                    {opt.icon}
                  </div>
                  {selected && (
                    <CheckCircle2 className="size-4 text-[color:var(--accent)]" />
                  )}
                </div>
                <div className="font-medium">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.hint}</div>
              </button>
            );
          })}
        </div>

        {type === "ONLINE" && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            Buyers will see "Online payment" at checkout — handle the actual
            transfer outside the app (Razorpay link, PayPal, etc.).
          </div>
        )}

        {type === "UPI_QR" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Upload UPI QR code</Label>
              <input
                ref={qrInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => onPickQr(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => qrInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border bg-muted/40 p-6 text-center transition hover:border-[color:var(--accent)]/40"
              >
                <Upload className="size-5 text-[color:var(--accent)]" />
                <p className="text-sm font-medium">
                  {pickedQrFile
                    ? pickedQrFile.name
                    : user?.paymentQRCode
                      ? "Replace existing QR"
                      : "Click to upload your QR image"}
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG or JPG, screenshot from your UPI app
                </p>
              </button>
              {/* Preview priority:
                  1. Newly picked file (object-URL),
                  2. Saved QR served by `GET /api/user/payment/qr`. The
                     `?t=` cache-buster forces the browser to re-fetch
                     after a replace upload, since the URL itself is
                     stable but the bytes change. */}
              {pickedQrPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pickedQrPreview}
                  alt="QR preview"
                  className="mx-auto max-h-56 rounded-lg border bg-white p-2"
                />
              ) : user?.paymentQRCode ? (
                <div className="flex flex-col items-center gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/user/payment/qr?t=${encodeURIComponent(user.paymentQRCode ?? "")}`}
                    alt="Saved UPI QR"
                    className="mx-auto max-h-56 rounded-lg border bg-white p-2"
                  />
                  <span className="text-xs text-muted-foreground">
                    Saved QR — pick a new image above to replace it
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {type === "BANK_ACCOUNT" && (
          <div className="flex flex-col gap-3">
            {/* Saved-account chip — surfaces what's currently on file
                without exposing the full number. The backend never
                returns the raw value (encrypted at rest, JsonIgnore on
                /me), so this is the only way the seller sees their own
                saved account in the UI. */}
            {user?.bankAccountMasked && bankAccount.length === 0 && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[color:var(--accent)]/30 bg-[color:var(--accent-soft)]/40 px-3 py-2 text-sm">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[color:var(--accent)]" />
                  <span>
                    Saved account
                    <span className="ml-2 font-mono">{user.bankAccountMasked}</span>
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Re-enter below to update
                </span>
              </div>
            )}

            <BankField
              label="Bank account number"
              value={bankAccount}
              onChange={setBankAccount}
              show={showBank}
              onToggleShow={() => setShowBank((v) => !v)}
              error={
                bankAccount.length > 0 && !accountValid
                  ? "Account number must be 9–18 digits"
                  : undefined
              }
              placeholder={
                user?.bankAccountMasked ?? "e.g. 123456789012"
              }
            />
            <BankField
              label="Re-enter to confirm"
              value={bankAccountConfirm}
              onChange={setBankAccountConfirm}
              show={showBank}
              onToggleShow={() => setShowBank((v) => !v)}
              error={
                bankAccountConfirm.length > 0 && bankAccount !== bankAccountConfirm
                  ? "Account numbers don't match"
                  : undefined
              }
              placeholder="Re-type the account number"
            />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ifsc">IFSC code</Label>
              <Input
                id="ifsc"
                value={ifsc}
                onChange={(e) =>
                  setIfsc(e.target.value.toUpperCase().slice(0, 11))
                }
                placeholder="HDFC0001234"
                autoComplete="off"
                spellCheck={false}
                maxLength={11}
                className="font-mono uppercase tracking-wide"
              />
              {ifsc.length > 0 && !ifscValid && (
                <p className="text-xs text-red-400">
                  IFSC must be 4 letters + 0 + 6 alphanumeric (e.g. HDFC0001234)
                </p>
              )}

              {/* IFSC → bank lookup result. Three states: loading shows a
                  small spinner; ok shows the resolved Bank + Branch so
                  the seller can sanity-check before saving; error means
                  Razorpay didn't recognise the code (typo / wrong IFSC). */}
              {ifscValid && ifscLookup.state === "loading" && (
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Looking up bank…
                </p>
              )}
              {ifscValid && ifscLookup.state === "ok" && ifscLookup.bank && (
                <div className="rounded-lg border border-[color:var(--accent)]/30 bg-[color:var(--accent-soft)]/40 p-3 text-sm">
                  <div className="inline-flex items-center gap-2 font-medium">
                    <CheckCircle2 className="size-3.5 text-[color:var(--accent)]" />
                    {ifscLookup.bank}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {ifscLookup.branch ?? "—"}
                    {ifscLookup.city ? ` · ${ifscLookup.city}` : ""}
                    {ifscLookup.state_ ? `, ${ifscLookup.state_}` : ""}
                  </div>
                </div>
              )}
              {ifscValid && ifscLookup.state === "error" && (
                <p className="inline-flex items-start gap-1 text-xs text-amber-400">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  {ifscLookup.error ?? "Couldn't verify this IFSC"}
                </p>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-300">
              <Lock className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Your account number is stored securely and never echoed back
                in API responses. To change it, re-enter the new number twice.
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={save} disabled={!canSave}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save payment method
              </>
            )}
          </Button>
        </div>

        <QrCropDialog
          open={cropOpen}
          file={rawPicked}
          onCancel={onCropCancel}
          onCropped={onCropConfirmed}
        />
      </CardContent>
    </Card>
  );
}

function BankField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 18))}
          placeholder={placeholder}
          className="pr-10 font-mono"
          aria-invalid={!!error}
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? "Hide" : "Show"}
          className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error && (
        <p className="inline-flex items-center gap-1 text-xs text-red-400">
          <AlertTriangle className="size-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
