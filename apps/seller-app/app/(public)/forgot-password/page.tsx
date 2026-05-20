"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Mail, ShieldCheck, Store } from "lucide-react";
import { Badge, Button, Input, Label } from "@workspace/ui";
import { useT } from "@/src/i18n/useT";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ForgotPasswordInner />
    </Suspense>
  );
}

function ForgotPasswordFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-background pattern-grid">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function ForgotPasswordInner() {
  const t = useT();
  const router = useRouter();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSendOTP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setFormError("Please enter your email address");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to send OTP");
      }

      setSuccessMessage(data.message || "OTP sent to your email");
      setStep("otp");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to send OTP");
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!otp.trim() || !newPassword || !confirmPassword) {
      setFormError("Please fill in all fields");
      return;
    }

    if (newPassword.length < 8) {
      setFormError("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      setSuccessMessage(data.message || "Password reset successful");
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to reset password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center bg-background pattern-grid">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-[color:var(--accent-soft)] via-[color:var(--accent-soft)]/50 to-transparent"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-6 rounded-2xl border bg-card p-8 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-[color:var(--accent)] text-[color:var(--accent-foreground)]">
            <Store className="size-5" />
          </span>
          <div>
            <div className="font-semibold tracking-tight">ProfitSaathi</div>
            <div className="text-xs text-muted-foreground">{t("landing.sellerConsole")}</div>
          </div>
          <Badge variant="success" className="ml-auto">
            v1.0
          </Badge>
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {step === "email" ? "Reset Password" : "Enter OTP"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "email"
              ? "We'll send you an OTP to reset your password"
              : "Enter the OTP sent to your email and set a new password"}
          </p>
        </div>

        {formError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
            {formError}
          </div>
        )}

        {successMessage && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm text-green-300">
            {successMessage}
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleSendOTP} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t("common.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seller@example.com"
              />
            </div>

            <Button type="submit" size="lg" disabled={busy} className="w-full">
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending OTP…
                </>
              ) : (
                <>
                  <Mail className="size-4" />
                  Send OTP
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="otp">OTP Code</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
              />
              <p className="text-xs text-muted-foreground">
                Check your email for the 6-digit code
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={busy}
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setFormError(null);
                }}
                className="flex-1"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>

              <Button type="submit" size="lg" disabled={busy} className="flex-1">
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Resetting…
                  </>
                ) : (
                  <>
                    Reset Password
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>

            <button
              type="button"
              onClick={async () => {
                setFormError(null);
                setSuccessMessage(null);
                setBusy(true);
                try {
                  const res = await fetch("/api/auth/forgot-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: email.trim() }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setSuccessMessage("OTP resent to your email");
                  } else {
                    setFormError(data.message || "Failed to resend OTP");
                  }
                } catch (error) {
                  setFormError("Failed to resend OTP");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="text-sm text-[color:var(--accent)] hover:underline disabled:opacity-50"
            >
              Didn't receive OTP? Resend
            </button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-medium text-[color:var(--accent)] hover:underline"
          >
            Sign in
          </Link>
        </p>

        <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[color:var(--accent)]" />
          <p>Your password will be encrypted and stored securely</p>
        </div>
      </div>
    </div>
  );
}
