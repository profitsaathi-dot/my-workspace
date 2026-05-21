"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Button, Input, Label } from "@workspace/ui";
import { encryptAES } from "@/lib/crypto/aes";

// This page should be accessible without authentication
export default function ForgotPasswordPage() {
  const router = useRouter();
  const { storeToken } = useParams<{ storeToken: string }>();

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
      const encrypted = await encryptAES(JSON.stringify({ email: email.trim() }));
      
      const res = await fetch("/user/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: encrypted }),
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
      const encrypted = await encryptAES(JSON.stringify({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      }));
      
      const res = await fetch("/user/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: encrypted }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      setSuccessMessage(data.message || "Password reset successful");
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push(`/user/${storeToken}/login`);
      }, 2000);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to reset password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center bg-background text-foreground relative pattern-grid px-4">
      <div className="w-full max-w-md z-10">
        <div className="rounded-2xl border bg-card p-8 backdrop-blur">
          <div className="flex justify-center mb-6">
            <div className="grid size-12 place-items-center rounded-xl bg-[color:var(--accent-soft)] text-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/20">
              <Mail className="size-6" />
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight mb-2 text-center">
            {step === "email" ? "Reset Password" : "Enter OTP"}
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-6">
            {step === "email"
              ? "We'll send you an OTP to reset your password"
              : "Enter the OTP sent to your email and set a new password"}
          </p>

          {formError && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-500">
              {formError}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm text-green-500">
              {successMessage}
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
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
                <p className="mt-1 text-xs text-muted-foreground">
                  Check your email for the 6-digit code
                </p>
              </div>

              <div>
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
                <p className="mt-1 text-xs text-muted-foreground">
                  At least 8 characters
                </p>
              </div>

              <div>
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
                  setBusy(true);
                  try {
                    const encrypted = await encryptAES(JSON.stringify({ email: email.trim() }));
                    
                    const res = await fetch("/user/api/auth/forgot-password", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ request: encrypted }),
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
                className="w-full text-sm text-[color:var(--accent)] hover:underline"
              >
                Didn't receive OTP? Resend
              </button>
            </form>
          )}

          <div className="flex items-center my-6">
            <div className="flex-grow h-px bg-[color:var(--border)]" />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link
              href={`/user/${storeToken}/login`}
              className="font-medium text-[color:var(--accent)] hover:underline"
            >
              Sign in
            </Link>
          </p>

          <div className="mt-4 flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[color:var(--accent)]" />
            <p>Your password will be encrypted and stored securely</p>
          </div>
        </div>
      </div>
    </div>
  );
}
