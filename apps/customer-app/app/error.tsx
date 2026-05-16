"use client";

/**
 * Runtime error boundary. Next.js renders this when a server/client component
 * throws during render. The `reset()` callback retries the failing segment
 * without a full page reload.
 *
 * Strings come from `customer.errors` so the page respects the user's locale.
 */
import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@workspace/ui";
import { useTranslations } from "next-intl";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const t = useTranslations("customer.errors");

  useEffect(() => {
    console.error("[error.tsx]", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 pattern-grid">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border bg-card p-8 text-center backdrop-blur">
        <div className="grid size-12 place-items-center rounded-full bg-red-500/10 text-red-500">
          <AlertTriangle className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("somethingWentWrong")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("somethingWentWrongDesc")}
        </p>
        <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={reset}>
            <RotateCcw className="size-4" />
            {t("retry")}
          </Button>
          <a href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              <Home className="size-4" />
              {t("backHome")}
            </Button>
          </a>
        </div>
      </div>
    </main>
  );
}
