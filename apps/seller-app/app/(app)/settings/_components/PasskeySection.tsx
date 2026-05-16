"use client";

import { useEffect, useState } from "react";
import { Fingerprint, Loader2, ShieldCheck } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui";
import type { PasskeyStatusResponse } from "@/src/lib/auth/backend-auth";
import {
  fetchPasskeyStatus,
  getPasskeySupport,
  registerCurrentSessionPasskey,
  type PasskeySupport,
} from "@/src/lib/auth/passkey-client";

type Props = {
  onToast?: (message: string) => void;
};

export function PasskeySection({ onToast }: Props) {
  const [support, setSupport] = useState<PasskeySupport | null>(null);
  const [status, setStatus] = useState<PasskeyStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const supportInfo = await getPasskeySupport();
        if (!cancelled) setSupport(supportInfo);

        const statusInfo = await fetchPasskeyStatus();
        if (!cancelled) setStatus(statusInfo);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Couldn't load your passkey settings",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const addPasskey = async () => {
    setBusy(true);
    setError(null);

    try {
      await registerCurrentSessionPasskey();
      const nextStatus = await fetchPasskeyStatus();
      setStatus(nextStatus);
      onToast?.(
        nextStatus.credentialIds.length > 1
          ? "Another passkey was added"
          : "Passkey added successfully",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't add your passkey",
      );
    } finally {
      setBusy(false);
    }
  };

  const count = status?.credentialIds.length ?? 0;
  const enabled = Boolean(status?.enabled);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="size-4 text-[color:var(--accent)]" />
          Passkey
        </CardTitle>
        <CardDescription>
          Add Touch ID or a device passkey for faster sign-in on this Mac.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
         <Badge variant={enabled ? "success" : "outline"}>
            {enabled ? "Enabled" : "Not enabled"}
          </Badge>
          {!loading && (
            <span className="text-sm text-muted-foreground">
              {enabled
                ? `${count} passkey${count === 1 ? "" : "s"} registered`
                : "No passkeys registered yet"}
            </span>
          )}
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          Use Touch ID on your Mac, or a compatible device passkey, instead of
          typing your password every time.
        </div>

        {support?.message && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-200">
            {support.message}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-[color:var(--accent)]" />
            <span>
              Open this app on{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                http://localhost:8084
              </code>{" "}
              while testing locally.
            </span>
          </div>
          <Button
            type="button"
            onClick={addPasskey}
            disabled={busy || loading || !support?.canRegister}
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Adding…
              </>
            ) : (
              <>
                <Fingerprint className="size-4" />
                {enabled ? "Add another passkey" : "Add passkey"}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
