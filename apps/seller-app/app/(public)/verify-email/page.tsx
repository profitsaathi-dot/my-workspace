"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import { Badge, Button } from "@workspace/ui";
import { useT } from "@/src/i18n/useT";

const OTP_LENGTH = 6;

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-4 pattern-grid">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function VerifyEmailInner() {
  const t = useT();
  const router = useRouter();
  const search = useSearchParams();
  const { data: session, status } = useSession();
  const inputsRef = useRef<HTMLInputElement[]>([]);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const callbackUrl = search?.get("callbackUrl") || "/dashboard";
  const email =
    session?.user?.email ?? (session?.user?.name ? "" : "");

  // Send OTP automatically once the session is ready — but exactly once.
  // The previous version re-fired on every render where `status` or `email`
  // changed (and React strict mode double-invokes effects in dev), which
  // caused two OTP emails per page load.
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (autoSentRef.current) return;
    if (status !== "authenticated" || !email) return;
    autoSentRef.current = true;
    sendOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, email]);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  async function sendOtp() {
    if (!email || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: [email],
          cc: [],
          name: session?.user?.name ?? email.split("@")[0],
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || `Backend ${res.status}`);
      }
      setOkMsg(t("verify.codeSent"));
      setResendIn(45);
      inputsRef.current[0]?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("verify.couldNotSend"));
    } finally {
      setSending(false);
    }
  }

  async function verify(code: string) {
    if (verifying || code.length !== OTP_LENGTH || !email) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, otp: code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || t("verify.invalid"));
      }
      // Server-side: /api/otp/verify already flipped users.email_verified_at.
      // useSyncUser will pick it up and the gate will let us through.
      setOkMsg(t("verify.verified"));
      setTimeout(() => router.push(callbackUrl), 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("verify.failed"));
      setDigits(Array(OTP_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  }

  function handleChange(i: number, v: string) {
    const clean = v.replace(/\D/g, "").slice(0, 1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = clean;
      // auto-advance + auto-submit when complete
      if (clean && i < OTP_LENGTH - 1) inputsRef.current[i + 1]?.focus();
      const code = next.join("");
      if (code.length === OTP_LENGTH && !next.includes("")) verify(code);
      return next;
    });
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) inputsRef.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < OTP_LENGTH - 1)
      inputsRef.current[i + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.split("").concat(Array(OTP_LENGTH).fill("")).slice(0, OTP_LENGTH);
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    if (pasted.length === OTP_LENGTH) verify(pasted);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background p-4 pattern-grid">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
            <Mail className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{t("verify.title")}</h1>
            <p className="text-xs text-muted-foreground">
              {email ? t("verify.sentTo", { email }) : t("verify.settingUp")}
            </p>
          </div>
          <Badge variant="success" className="ml-auto">{t("common.stepXofY", { x: 2, y: 2 })}</Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          {t("verify.intro")}
        </p>

        <div className="flex justify-between gap-2" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                if (el) inputsRef.current[i] = el;
              }}
              inputMode="numeric"
              maxLength={1}
              autoComplete="one-time-code"
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKey(i, e)}
              disabled={verifying}
              className="h-14 w-full rounded-lg border bg-input text-center text-2xl font-semibold tabular-nums text-foreground outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/20 disabled:opacity-50"
            />
          ))}
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        {okMsg && !error && (
          <div className="flex items-center gap-2 rounded-lg border border-[color:var(--accent)]/30 bg-[color:var(--accent-soft)] px-3 py-2 text-sm text-[color:var(--accent)]">
            <CheckCircle2 className="size-4" />
            {okMsg}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            {t("verify.didntGet")}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={sendOtp}
            disabled={sending || resendIn > 0}
          >
            {sending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("verify.sending")}
              </>
            ) : resendIn > 0 ? (
              t("verify.resendIn", { n: resendIn })
            ) : (
              <>
                <RefreshCw className="size-4" />
                {t("verify.resend")}
              </>
            )}
          </Button>
        </div>

        <Button
          onClick={() => verify(digits.join(""))}
          disabled={verifying || digits.join("").length !== OTP_LENGTH}
          className="w-full"
          size="lg"
        >
          {verifying ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("verify.verifying")}
            </>
          ) : (
            <>
              {t("verify.verifyContinue")}
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          {t("verify.trouble")}{" "}
          <a
            href="https://wa.me/919999999999"
            className="text-[color:var(--accent)] hover:opacity-80"
          >
            {t("landing.whatsappSupport")}
          </a>
        </p>
      </div>
    </div>
  );
}
