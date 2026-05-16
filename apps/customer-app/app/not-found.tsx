"use client";

import { Compass } from "lucide-react";
import { Button } from "@workspace/ui";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("customer.errors");
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 pattern-grid">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border bg-card p-8 text-center backdrop-blur">
        <div className="grid size-12 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
          <Compass className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("notFound")}</h1>
        <p className="text-sm text-muted-foreground">{t("notFoundDesc")}</p>
        <a href="/">
          <Button>{t("backHome")}</Button>
        </a>
      </div>
    </main>
  );
}
