"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Hash,
  Loader2,
  Phone,
  Sparkles,
  Store,
  User,
} from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  cn,
} from "@workspace/ui";
import { useT } from "@/src/i18n/useT";

type SellerType = "individual" | "social";

// Public-link slug: keep the seller's chosen name verbatim — preserve
// case, accents, even non-Latin scripts — and only swap whitespace for
// underscores so the result is URL-safe. Trim trailing/leading underscores
// in case the seller starts/ends with a space.
const slugify = (s: string) =>
  s
    .trim()
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "");

export default function OnboardingPage() {
  const t = useT();
  const router = useRouter();
  const { data: session } = useSession();

  const sellerTypes: {
    value: SellerType;
    title: string;
    hint: string;
    desc: string;
    icon: React.ReactNode;
    examples: string;
  }[] = [
    {
      value: "individual",
      title: t("onboarding.individualTitle"),
      hint: t("onboarding.individualHint"),
      desc: t("onboarding.individualDesc"),
      icon: <User className="size-5" />,
      examples: t("onboarding.individualEx"),
    },
    {
      value: "social",
      title: t("onboarding.socialTitle"),
      hint: t("onboarding.socialHint"),
      desc: t("onboarding.socialDesc"),
      icon: <Hash className="size-5" />,
      examples: t("onboarding.socialEx"),
    },
  ];
  const [storeName, setStoreName] = useState("");
  const [mobile, setMobile] = useState("");
  const [type, setType] = useState<SellerType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  // Seed the store name from the signed-in user — but ONLY once, the first
  // time the session becomes available. Tracking the "have we seeded yet?"
  // flag in a ref means subsequent typing (including clearing the field
  // entirely) doesn't trigger a re-seed.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (!session?.user) return;
    const seed =
      session.user.name?.trim() ||
      session.user.email?.split("@")[0] ||
      "";
    if (seed) {
      setStoreName(seed);
      seededRef.current = true;
    }
  }, [session?.user]);

  const storeSlug = useMemo(() => slugify(storeName), [storeName]);
  const storeValid = storeName.trim().length >= 2;
  // Indian mobile: 10 digits, must start with 6/7/8/9.
  const mobileValid = /^[6-9]\d{9}$/.test(mobile);
  const valid = storeValid && mobileValid && type !== null;

  const submit = async () => {
    if (!valid || !type) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/user/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: storeName.trim(),
          sellerType: type,
          mobile: mobile.trim(),
        }),
      });

      if (!res.ok) {
        // Two layers of message:
        //   - userMsg: shown in the UI. Short, friendly, no infra/stack details.
        //   - devDetail: logged for whoever is debugging.
        let userMsg = t("onboarding.errGeneric");
        if (res.status === 401) {
          userMsg = t("onboarding.errSession");
        } else if (res.status === 422 || res.status === 400) {
          // Validation error — surface the backend's message ONLY if it looks
          // user-readable (short, no HTML/newlines/stack traces).
          try {
            const ct = res.headers.get("content-type") ?? "";
            if (ct.includes("application/json")) {
              const j = await res.json();
              const m = (j?.message || j?.error || "").toString();
              if (m && m.length < 200 && !m.includes("<") && !m.includes("\n")) {
                userMsg = m;
              }
            }
          } catch {
            /* keep the generic message */
          }
        }

        let devDetail = `HTTP ${res.status}`;
        try {
          devDetail += " " + (await res.clone().text()).slice(0, 500);
        } catch {
          /* ignore */
        }
        console.error("[onboarding] submit failed:", devDetail);

        throw new Error(userMsg);
      }

      router.push("/verify-email?callbackUrl=%2Fdashboard");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-1 flex-col bg-background pattern-grid">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-[color:var(--accent-soft)] via-[color:var(--accent-soft)]/50 to-transparent"
      />

      <header className="relative z-10 flex h-14 items-center justify-between px-4 sm:px-6">
        <a
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="grid size-7 place-items-center rounded-lg bg-[color:var(--accent)] text-[color:var(--accent-foreground)]">
            <Store className="size-4" />
          </span>
          ProfitSaathi
          <Badge variant="success" className="ml-1">
            Seller
          </Badge>
        </a>
        <div className="text-xs text-muted-foreground">
          {t("common.stepXofY", { x: 1, y: 2 })}
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <div className="mb-8">
          <Badge variant="success" className="mb-4">
            <Sparkles className="size-3" />
            {t("onboarding.welcome")}, {session?.user?.name || "seller"}
          </Badge>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {t("onboarding.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t("onboarding.sub")}
          </p>
        </div>

        <div className="flex flex-col gap-6 rounded-2xl border bg-card p-6 backdrop-blur sm:p-8">
          {/* Account info — read-only, sourced from the signed-in session */}
          <div className="grid gap-2 rounded-lg border bg-muted/40 p-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t("common.email")}</span>
              <span className="truncate text-foreground">
                {session?.user?.email ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t("common.name")}</span>
              <span className="truncate text-foreground">
                {session?.user?.name ?? "—"}
              </span>
            </div>
          </div>

          {/* Store name */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="storeName">{t("onboarding.storeName")}</Label>
              <span className="text-xs text-muted-foreground">
                {t("onboarding.storeNameShown")}
              </span>
            </div>
            <Input
              id="storeName"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Aanya Bakes"
              autoComplete="off"
              className={cn(
                storeName.length > 0 &&
                  !storeValid &&
                  "border-red-500/40 focus:border-red-500/60"
              )}
            />
            {storeSlug && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("onboarding.publicLink")}:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[color:var(--accent)]">
                  profitsaathi.in/{storeSlug}
                </code>
              </p>
            )}
          </div>

          {/* Mobile number — 10-digit Indian mobile, used for support and
              order-status SMS. Required, validated client- and server-side. */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="mobile" className="flex items-center gap-1.5">
                <Phone className="size-3.5" />
                {t("common.phone")}
              </Label>
              <span className="text-xs text-muted-foreground">
                {t("common.required")}
              </span>
            </div>
            <Input
              id="mobile"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              onKeyDown={(e) => {
                if (
                  e.key.length === 1 &&
                  !/[0-9]/.test(e.key) &&
                  !e.ctrlKey &&
                  !e.metaKey
                ) {
                  e.preventDefault();
                }
              }}
              placeholder="9876543210"
              className={cn(
                mobile.length > 0 &&
                  !mobileValid &&
                  "border-red-500/40 focus:border-red-500/60"
              )}
            />
            {mobile.length > 0 && !mobileValid && (
              <p className="mt-0.5 text-xs text-red-400">
                Enter a 10-digit Indian mobile (starts with 6, 7, 8, or 9)
              </p>
            )}
          </div>

          {/* Seller type */}
          <div className="flex flex-col gap-2">
            <Label>{t("onboarding.sellerType")}</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sellerTypes.map((opt) => {
                const selected = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    aria-pressed={selected}
                    className={cn(
                      "group relative flex flex-col gap-2 rounded-xl border p-4 text-left transition",
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
                      <span
                        className={cn(
                          "grid size-5 place-items-center rounded-full border transition",
                          selected
                            ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
                            : "border"
                        )}
                      >
                        {selected && <Check className="size-3" />}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {opt.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {opt.hint}
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {opt.desc}
                    </p>
                    <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {opt.examples}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit error is now scoped to the confirmation dialog so the
              user sees it next to the Confirm action they just clicked. */}

          {/* Submit */}
          <div className="flex items-center justify-between gap-3 border-t pt-5">
            <p className="text-xs text-muted-foreground">
              {t("onboarding.terms")}{" "}
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="underline underline-offset-2 hover:text-foreground"
              >
                {t("onboarding.termsLink")}
              </button>
              .
            </p>
            <Button
              size="lg"
              onClick={() => {
                setSubmitError(null);
                setConfirmOpen(true);
              }}
              disabled={!valid || submitting}
              className="min-w-[160px]"
            >
              {t("common.continue")}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </main>

      {/* Confirmation dialog — final review before we lock in the seller's
          identity. Submit only fires from inside the dialog so a misclick
          on Continue never silently writes the row. */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !submitting) {
            setConfirmOpen(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm your details</DialogTitle>
            <DialogDescription>
              We'll use these to set up your store. You can update them later
              from Settings.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <ul className="space-y-2">
              <li className="flex flex-col gap-0.5">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("onboarding.storeName")}
                </span>
                <span className="font-medium">{storeName.trim() || "—"}</span>
              </li>
              <li className="flex flex-col gap-0.5">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("onboarding.sellerType")}
                </span>
                <span className="font-medium capitalize">{type ?? "—"}</span>
              </li>
              <li className="flex flex-col gap-0.5">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("common.phone")}
                </span>
                <span className="font-mono font-medium">+91 {mobile || "—"}</span>
              </li>
              <li className="flex flex-col gap-0.5">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("common.email")}
                </span>
                <span className="font-medium">{session?.user?.email ?? "—"}</span>
              </li>
            </ul>
          </div>

          {submitError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
            >
              {t("common.back")}
            </Button>
            <Button onClick={submit} disabled={!valid || submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("settings.saving")}
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  Confirm &amp; continue
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terms & Conditions popup. Replace the body of <TermsBody /> with
          your final legal copy — keep the structure (sections + scroll
          area) so long versions stay readable on mobile. */}
      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Terms &amp; Conditions</DialogTitle>
            <DialogDescription>
              Please read these carefully before continuing.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed">
            <TermsBody />
          </div>

          <DialogFooter>
            <Button onClick={() => setTermsOpen(false)}>I understand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TermsBody() {
  return (
    <div className="space-y-4 text-muted-foreground">
      <Section title="1. Account &amp; eligibility">
        <p>
          ProfitSaathi is for use by sellers operating a legitimate small
          business. You must be at least 18 years of age and authorised to
          accept these terms on behalf of your business. You are responsible
          for keeping your account credentials private.
        </p>
      </Section>

      <Section title="2. Use of the service">
        <p>
          You may use ProfitSaathi to manage your products, orders, pricing,
          and customer messages. You agree not to misuse the service —
          including bulk-spam messaging, scraping, or attempts to circumvent
          access controls — and to comply with all applicable laws,
          including consumer-protection and tax regulations in your
          jurisdiction.
        </p>
      </Section>

      <Section title="3. Customer data">
        <p>
          Customer details you enter (names, phone numbers, addresses) are
          used only to fulfil orders and reach buyers about their purchases.
          You must collect this data lawfully and tell your customers how
          you use it.
        </p>
      </Section>

      <Section title="4. WhatsApp &amp; messaging">
        <p>
          Sending messages through ProfitSaathi's integrations (including
          WhatsApp via WAHA) is subject to those platforms' policies. We
          provide tooling, but you remain solely responsible for the
          content you send and any account actions WhatsApp may take in
          response.
        </p>
      </Section>

      <Section title="5. Payments">
        <p>
          Where ProfitSaathi facilitates payment links or settlements, the
          underlying processor (e.g. Razorpay) handles the transaction. We
          don't store full card numbers or banking credentials. Refunds and
          chargebacks are governed by the processor's terms.
        </p>
      </Section>

      <Section title="6. Limitations">
        <p>
          The service is provided on an "as is" basis. To the maximum
          extent permitted by law, ProfitSaathi disclaims liability for
          indirect, incidental, or consequential losses arising from your
          use of the platform.
        </p>
      </Section>

      <Section title="7. Changes">
        <p>
          We may update these terms from time to time. Material changes
          will be highlighted on your next sign-in; continued use of the
          service after changes constitutes acceptance.
        </p>
      </Section>

      <Section title="8. Contact">
        <p>
          For questions, write to{" "}
          <a
            href="mailto:support@profitsaathi.in"
            className="text-[color:var(--accent)] underline-offset-2 hover:underline"
          >
            support@profitsaathi.in
          </a>
          .
        </p>
      </Section>

      <p className="pt-2 text-xs italic">
        This is placeholder copy. Replace with your final legal terms before
        going live.
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-foreground mb-1 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}
