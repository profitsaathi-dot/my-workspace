"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {startAuthentication,} from "@simplewebauthn/browser";
import {
  ArrowRight,
  Loader2,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { Badge, Button, Input, Label } from "@workspace/ui";
import { useT } from "@/src/i18n/useT";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-background pattern-grid">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function LoginInner() {
  const t = useT();
  const router = useRouter();
  const search = useSearchParams();
  const { status } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const callbackUrl = search?.get("callbackUrl") || "/dashboard";
  const errorParam = search?.get("error");

  useEffect(() => {
    if (status === "authenticated") router.replace(callbackUrl);
  }, [status, callbackUrl, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!email.trim() || !password) {
      setFormError(t("auth.missingFields"));
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
        setFormError(res.error);
        return;
      }
      router.replace(res?.url ?? callbackUrl);
    } finally {
      setBusy(false);
    }
  };

  const loginWithPasskey =
    async () => {
      setFormError(null);
      setBusy(true);

      try {
        const optionsResponse = await fetch(
          "/api/passkey/authenticate-options",
          {
            method: "POST",
          },
        );

        const optionsPayload = await optionsResponse.json();
        if (!optionsResponse.ok) {
          throw new Error(
            optionsPayload?.message || "Couldn't start passkey sign-in",
          );
        }

        const { challengeId, ...options } = optionsPayload;
        const credential = await startAuthentication(options);

        const verificationResponse = await fetch(
          "/api/passkey/verify-authentication",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              challengeId,
              credential,
            }),
          },
        );

        const verification = await verificationResponse.json();
        if (!verificationResponse.ok || !verification?.verified || !verification?.ticket) {
          throw new Error(verification?.message || "Passkey sign-in failed");
        }

        const res = await signIn("passkey", {
          ticket: verification.ticket,
          redirect: false,
          callbackUrl,
        });

        if (res?.error) {
          throw new Error(res.error);
        }

        router.replace(callbackUrl);
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Passkey sign-in failed",
        );
      } finally {
        setBusy(false);
      }
    };

  const errorMessage =
    formError ??
    (errorParam ? `${t("auth.signInFailed")}: ${errorParam}` : null);

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
            {t("auth.signInTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("auth.signInSub")}
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button
  type="submit"
  size="lg"
  disabled={busy || status === "loading"}
  className="w-full"
>
  {busy ? (
    <>
      <Loader2 className="size-4 animate-spin" />
      Signing in…
    </>
  ) : (
    <>
      Sign in
      <ArrowRight className="size-4" />
    </>
  )}
</Button>

<div className="relative py-2">
  <div className="absolute inset-0 flex items-center">
    <span className="w-full border-t" />
  </div>

  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-card px-2 text-muted-foreground">
      Or continue with
    </span>
  </div>
</div>

<Button
  type="button"
  variant="outline"
  size="lg"
  className="w-full"
  disabled={busy || status === "loading"}
  onClick={() =>
    signIn("google", {
      callbackUrl,
    })
  }
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    className="size-4"
  >
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 10-2 13.5-5.3l-6.2-5.2C29.1 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.5 16.3 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.3 5.5-6 7l6.2 5.2C39.2 36.7 44 31 44 24c0-1.3-.1-2.7-.4-3.5z"
    />
  </svg>

  Continue with Google
</Button>

<Button
  type="button"
  variant="outline"
  className="w-full"
  onClick={loginWithPasskey}
>
  Continue with Passkey
</Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link
            href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-medium text-[color:var(--accent)] hover:underline"
          >
            {t("auth.createAccount")}
          </Link>
        </p>

        <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[color:var(--accent)]" />
          <p>{t("auth.encrypted")}</p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {t("auth.needHelp")}{" "}
          <a href="https://wa.me/919999999999" className="text-[color:var(--accent)] hover:text-[color:var(--accent)]">
            {t("landing.whatsappSupport")}
          </a>
        </p>
      </div>
    </div>
  );
}
