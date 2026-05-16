"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Store } from "lucide-react";
import { Button, Input } from "@workspace/ui";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/app/lib/LanguageSwitcher";

export default function Home() {
  const router = useRouter();
  const [storeToken, setStoreToken] = useState("");
  const t = useTranslations("customer.home");

  const handleEnterStore = () => {
    const token = storeToken.trim();
    if (!token) return;

    router.push(`/${encodeURIComponent(token)}/store`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 pattern-grid">
      <div className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)]">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/20">
          <Store className="size-7" />
        </div>

        <h1 className="text-4xl font-semibold tracking-tight mb-3">
          {t("title")}
        </h1>

        <p className="text-muted-foreground mb-10">
          {t("subtitle")}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="text"
            placeholder={t("tokenPlaceholder")}
            value={storeToken}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStoreToken(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") handleEnterStore();
            }}
            className="flex-1"
          />

          <Button
            size="lg"
            onClick={handleEnterStore}
            disabled={!storeToken.trim()}
          >
            {t("enter")} <ArrowRight />
          </Button>
        </div>

        <div className="mt-10 text-sm text-muted-foreground">
          {t("tryDemo")}
          <div className="flex flex-wrap justify-center gap-3 mt-3">
            {["demo1", "shop123", "teststore"].map((token) => (
              <button
                key={token}
                onClick={() => router.push(`/${encodeURIComponent(token)}/store`)}
                className="px-3 py-1 rounded-full border border-themed bg-card hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition"
              >
                {token}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
