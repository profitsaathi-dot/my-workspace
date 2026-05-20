"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { signIn } from "next-auth/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Card, Input } from "@workspace/ui";

/**
 * Customer login + signup. Replaces the old Keycloak redirect flow with a
 * direct call to Spring's `/api/v1/auth/login` (via NextAuth's Credentials
 * provider) and `/api/v1/auth/signup/customer` (via `/user/api/auth/signup`).
 *
 * Both flows land the buyer back on `/user/{storeToken}/store` once
 * authenticated. Signup auto-signs-in on success so the buyer doesn't have
 * to re-enter their password.
 */
export default function LoginPage() {
  const t = useTranslations("customer.auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { storeToken } = useParams<{ storeToken: string }>();

  const callbackUrl =
    searchParams?.get("callbackUrl") || `/user/${storeToken}/store`;

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError(t("missingFields"));
      return;
    }
    setBusy(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      router.replace(res?.url ?? callbackUrl);
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError(t("missingName"));
      return;
    }
    if (password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/user/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        setError(json?.message || t("signupFailed"));
        return;
      }
      const signin = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      });
      if (signin?.error) {
        setError(signin.error);
        return;
      }
      router.replace(signin?.url ?? callbackUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("signupFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center bg-background text-foreground relative pattern-grid px-4">
      <div className="w-full max-w-md z-10">
        <Card className="p-8">
          <div className="flex justify-center mb-6">
            <div className="grid size-12 place-items-center rounded-xl bg-[color:var(--accent-soft)] text-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/20">
              {mode === "signup" ? <UserPlus className="size-6" /> : <LogIn className="size-6" />}
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight mb-2 text-center">
            {mode === "signup" ? t("createAccount") : t("welcomeBack")}
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-6">
            {mode === "signup" ? t("signUpSub") : t("signInSub")}
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-500">
              {error}
            </div>
          )}

          <form
            className="space-y-4"
            onSubmit={mode === "signup" ? handleSignup : handleLogin}
          >
            {mode === "signup" && (
              <div>
                <label className="text-sm font-medium" htmlFor="name">
                  {t("fullName")}
                </label>
                <Input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setName(e.target.value)
                  }
                  placeholder={t("fullNamePlaceholder")}
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium" htmlFor="email">
                {t("email")}
              </label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                placeholder={t("emailPlaceholder")}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" htmlFor="password">
                  {t("password")}
                </label>
                {mode === "login" && (
                  <Link
                    href={`/user/${storeToken}/forgot-password`}
                    className="text-xs text-[color:var(--accent)] hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                type="password"
                required
                minLength={mode === "signup" ? 8 : undefined}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                placeholder={t("passwordPlaceholder")}
              />
              {mode === "signup" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("passwordHint")}
                </p>
              )}
            </div>

            {mode === "signup" && (
              <div>
                <label className="text-sm font-medium" htmlFor="confirm">
                  {t("confirmPassword")}
                </label>
                <Input
                  id="confirm"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setConfirm(e.target.value)
                  }
                  placeholder={t("passwordPlaceholder")}
                />
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : mode === "signup" ? (
                <>
                  <UserPlus />
                  {t("signUp")}
                </>
              ) : (
                <>
                  <LogIn />
                  {t("signIn")}
                </>
              )}
            </Button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-grow h-px bg-[color:var(--border)]" />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "signup" ? t("hasAccount") : t("noAccount")}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setError(null);
                setPassword("");
                setConfirm("");
              }}
              className="ml-2 font-medium text-[color:var(--accent)] hover:underline"
            >
              {mode === "signup" ? t("signIn") : t("signUp")}
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
}
