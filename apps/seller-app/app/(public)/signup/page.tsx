"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Loader2,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { Badge, Button, Input, Label } from "@workspace/ui";
import { useT } from "@/src/i18n/useT";

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupInner />
    </Suspense>
  );
}

function SignupFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-background pattern-grid">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function SignupInner() {
  const t = useT();
  const router = useRouter();
  const search = useSearchParams();
  const { status } = useSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // After signup we always go to /onboarding so the seller can finish their
  // store profile (storeName, mobile, sellerType). The `callbackUrl` query
  // param flows through to /onboarding and from there to /verify-email so
  // the user lands where they originally tried to go.
  const callbackUrl = search?.get("callbackUrl") || "/dashboard";

  useEffect(() => {
    if (status === "authenticated") router.replace("/onboarding");
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError(t("auth.passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setFormError(t("auth.passwordMismatch"));
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
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
        setFormError(json?.message || t("auth.signupFailed"));
        return;
      }

      // Backend created the seller — sign in immediately so the rest of the
      // flow (onboarding, verify-email) runs against an authenticated session.
      const signin = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (signin?.error) {
        setFormError(signin.error);
        return;
      }
      router.replace(`/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("auth.signupFailed"));
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
            <Sparkles className="size-3" />
            {t("landing.region")} · v1.0
          </Badge>
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("auth.signupTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("auth.signupSub")}
          </p>
        </div>

        {formError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t("common.name")}</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aanya Bakes Owner"
            />
          </div>

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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <p className="text-xs text-muted-foreground">
              {t("auth.passwordHint")}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("auth.creatingAccount")}
              </>
            ) : (
              <>
                {t("auth.createAccount")}
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t("auth.hasAccount")}{" "}
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-medium text-[color:var(--accent)] hover:underline"
          >
            {t("auth.signIn")}
          </Link>
        </p>

        <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[color:var(--accent)]" />
          <p>{t("auth.encrypted")}</p>
        </div>
      </div>
    </div>
  );
}
