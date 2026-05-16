"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@workspace/ui";
import { useT } from "@/src/i18n/useT";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  useEffect(() => {
    // TODO: send to your telemetry pipeline
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 pattern-grid">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border bg-card p-8 text-center backdrop-blur">
        <div className="grid size-12 place-items-center rounded-full bg-red-500/10 text-red-400">
          <AlertTriangle className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("errors.somethingWrong")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {error.message || t("errors.unexpected")}
        </p>
        {error.digest && (
          <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
            {error.digest}
          </code>
        )}
        <div className="flex gap-2">
          <Button onClick={reset}>
            <RefreshCw className="size-4" />
            {t("common.tryAgain")}
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            {t("common.goHome")}
          </Button>
        </div>
      </div>
    </main>
  );
}
