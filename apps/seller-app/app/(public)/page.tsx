"use client";

import {
  Calculator,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  TrendingUp,
} from "lucide-react";
import { Badge, Card, CardContent } from "@workspace/ui";
import { GetStartedButton, SignInButton } from "./components/AuthButtons";
import { useT } from "@/src/i18n/useT";

const testimonials = [
  {
    name: "Aanya P.",
    role: "Home baker · Bengaluru",
    quote:
      "I went from guessing prices to charging ₹40 more on my brownie box — same orders, better margin.",
  },
  {
    name: "Karthik R.",
    role: "Handmade · Chennai",
    quote:
      "Health score went from 42 to 78 in one month. The AI told me which slow product to bundle.",
  },
  {
    name: "Ritu M.",
    role: "Boutique · Jaipur",
    quote:
      "WhatsApp broadcast through ProfitSaathi brought back 11 customers in a week. Worth it for ₹199.",
  },
];

export default function LandingPage() {
  const t = useT();
  const features = [
    {
      icon: Calculator,
      title: t("landing.feature1Title"),
      desc: t("landing.feature1Desc"),
    },
    {
      icon: TrendingUp,
      title: t("landing.feature2Title"),
      desc: t("landing.feature2Desc"),
    },
    {
      icon: Lightbulb,
      title: t("landing.feature3Title"),
      desc: t("landing.feature3Desc"),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background pattern-grid">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span
              className="grid size-7 place-items-center rounded-lg text-[color:var(--accent-foreground)]"
              style={{ background: "var(--accent)" }}
            >
              <Store className="size-4" />
            </span>
            ProfitSaathi
            <Badge variant="success" className="ml-1">{t("landing.region")}</Badge>
          </a>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a className="text-muted-foreground hover:text-foreground" href="#features">{t("landing.navFeatures")}</a>
            <a className="text-muted-foreground hover:text-foreground" href="#pricing">{t("landing.navPricing")}</a>
            <a className="text-muted-foreground hover:text-foreground" href="#stories">{t("landing.navStories")}</a>
          </nav>
          <div className="flex items-center gap-2">
            <SignInButton variant="ghost" size="sm" />
            <GetStartedButton size="sm" />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="border-b">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
            <div className="flex flex-col gap-6">
              <Badge variant="success" className="w-fit">
                <Sparkles className="size-3" />
                {t("landing.heroBadge")}
              </Badge>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                {t("landing.heroTitle1")}{" "}
                <span className="text-[color:var(--accent)]">{t("landing.heroTitle2")}</span>
              </h1>
              <p className="max-w-md text-lg text-muted-foreground">
                {t("landing.heroSub")}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <GetStartedButton size="lg">
                  {t("landing.ctaCreateFree")}
                </GetStartedButton>
                <SignInButton variant="outline" size="lg">
                  {t("landing.ctaHaveAccount")}
                </SignInButton>
              </div>
              <div className="flex items-center gap-5 pt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-foreground">4.9</span>
                  · {t("landing.rating")}
                </div>
                <div className="hidden h-4 w-px bg-[color:var(--border)] sm:block" />
                <div className="hidden sm:block">{t("landing.noCard")}</div>
              </div>
            </div>

            <div className="relative">
              <div
                aria-hidden
                className="aspect-[4/5] w-full overflow-hidden rounded-2xl border bg-card p-6"
              >
                <div className="flex h-full flex-col justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("landing.snapshotLabel")}
                    </div>
                    <div className="mt-1 text-2xl font-semibold">
                      Hearth & Form
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Pune · Premium · 4.92★
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <Tile label={t("dashboard.kpiSales")} value="₹1.24L" tone="accent" />
                    <Tile label={t("dashboard.kpiHealth")} value="78/100" tone="accent" />
                    <Tile label={t("profit.margin")} value="22.4%" />
                    <Tile label={t("nav.orders")} value="284" />
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[color:var(--accent)]">
                      <Sparkles className="size-3" />
                      {t("landing.aiAdvisor")}
                    </div>
                    <p className="text-sm text-foreground">
                      {t("landing.aiAdvisorTip")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="border-b">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <div className="mb-10 max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight">
                {t("landing.featuresTitle")}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {t("landing.featuresSub")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <Card key={f.title}>
                    <CardContent className="flex flex-col gap-3 py-6">
                      <div className="grid size-10 place-items-center rounded-lg bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                        <Icon className="size-5" />
                      </div>
                      <h3 className="font-semibold">{f.title}</h3>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="stories" className="border-b">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="mb-8 text-3xl font-semibold tracking-tight">
              {t("landing.storiesTitle")}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {testimonials.map((t) => (
                <Card key={t.name}>
                  <CardContent className="flex flex-col gap-3 py-6">
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star className="size-4 fill-current" />
                      <Star className="size-4 fill-current" />
                      <Star className="size-4 fill-current" />
                      <Star className="size-4 fill-current" />
                      <Star className="size-4 fill-current" />
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="mt-auto pt-2">
                      <div className="text-sm font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="border-b">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-semibold tracking-tight">{t("landing.pricingTitle")}</h2>
              <p className="mt-2 text-muted-foreground">
                {t("landing.pricingSub")}
              </p>
            </div>
            <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="flex flex-col gap-3 py-6">
                  <div className="text-sm font-medium text-muted-foreground">{t("landing.planFree")}</div>
                  <div className="text-3xl font-semibold tabular-nums">₹0</div>
                  <ul className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground">
                    <li>{t("landing.planFreePerk1")}</li>
                    <li>{t("landing.planFreePerk2")}</li>
                    <li>{t("landing.planFreePerk3")}</li>
                  </ul>
                  <div className="mt-4">
                    <GetStartedButton variant="outline" className="w-full">
                      {t("landing.startFree")}
                    </GetStartedButton>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-[color:var(--accent)]/40 bg-[color:var(--accent-soft)]/40">
                <CardContent className="flex flex-col gap-3 py-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-[color:var(--accent)]">{t("landing.planPremium")}</div>
                    <Badge variant="success">{t("landing.mostPopular")}</Badge>
                  </div>
                  <div className="text-3xl font-semibold tabular-nums">
                    ₹199<span className="text-base text-muted-foreground"> {t("landing.perMonth")}</span>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                    <li className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-[color:var(--accent)]" /> {t("landing.premiumPerk1")}</li>
                    <li className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-[color:var(--accent)]" /> {t("landing.premiumPerk2")}</li>
                    <li className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-[color:var(--accent)]" /> {t("landing.premiumPerk3")}</li>
                    <li className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-[color:var(--accent)]" /> {t("landing.premiumPerk4")}</li>
                  </ul>
                  <div className="mt-4">
                    <GetStartedButton className="w-full">
                      {t("landing.tryPremium")}
                    </GetStartedButton>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA STRIP */}
        <section>
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight">
              {t("landing.ctaTitle")}
            </h2>
            <p className="max-w-xl text-muted-foreground">
              {t("landing.ctaSub")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <GetStartedButton size="lg">
                {t("landing.getStartedFree")}
              </GetStartedButton>
              <SignInButton variant="outline" size="lg" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>{t("landing.footerCopy")}</div>
          <div className="flex flex-wrap gap-5">
            <a className="hover:text-foreground" href="#">{t("landing.help")}</a>
            <a className="hover:text-foreground" href="#">{t("landing.privacy")}</a>
            <a className="hover:text-foreground" href="#">{t("landing.terms")}</a>
            <a
              className="text-[color:var(--accent)] hover:opacity-80"
              href="https://wa.me/919999999999"
            >
              {t("landing.whatsappSupport")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "accent";
}) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-lg font-semibold tabular-nums ${
          tone === "accent" ? "text-[color:var(--accent)]" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
