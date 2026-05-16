"use client";

import { Suspense, useEffect, useState } from "react";
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
import { withBase } from "@/lib/env";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Proxy.ts always sets `callbackUrl` with the basePath; the explicit
  // default here covers fresh visits to /admin/login with no query string.
  const callbackUrl = search?.get("callbackUrl") || withBase("/");
  const errorParam = search?.get("error");

  useEffect(() => {
    if (status === "authenticated") router.replace(callbackUrl);
  }, [status, callbackUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      });
      if (!res || res.error || res.ok === false) {
        setError("Invalid email or password, or this account is not an admin.");
        return;
      }
      // Use the relative callbackUrl, not res.url. NextAuth's res.url is built
      // from NEXTAUTH_URL — if that env var is misconfigured for the current
      // host (common in dev when the proxy isn't running) the absolute URL
      // would navigate to the wrong origin.
      router.replace(callbackUrl);
    } catch (err) {
      setError((err as Error).message || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-[color:var(--accent-soft)] via-[color:var(--accent-soft)]/50 to-transparent"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-6 rounded-2xl border bg-card p-8 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-[color:var(--accent)] text-[color:var(--accent-foreground)]">
            <Store className="size-5" />
          </span>
          <div>
            <div className="font-semibold tracking-tight">ProfitSaathi</div>
            <div className="text-xs text-muted-foreground">Admin console</div>
          </div>
          <Badge variant="success" className="ml-auto">
            <Sparkles className="size-3" />
            India · v1.0
          </Badge>
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in to continue
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your admin email and password.
          </p>
        </div>

        {(error || errorParam) && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-500 dark:text-red-300">
            {error ?? `Sign-in failed${errorParam ? `: ${errorParam}` : ""}`}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              disabled={busy}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
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
        </form>

        <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[color:var(--accent)]" />
          <p>
            All admin actions are encrypted in transit and audited server-side.
            Sessions auto-refresh in the background using a rotating refresh
            token.
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Need access? Ask the platform owner to create an admin account for
          you.
        </p>
      </div>
    </div>
  );
}
