"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Fingerprint, Loader2, ShieldCheck } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui";
import {
  fetchPasskeyStatus,
  getPasskeySupport,
  registerCurrentSessionPasskey,
} from "@/src/lib/auth/passkey-client";

const DISMISS_PREFIX = "ps-passkey-dismissed";

function getDismissKey(subjectId: string | number | undefined) {
  return `${DISMISS_PREFIX}:${subjectId ?? "unknown"}`;
}

export function PasskeyEnrollmentPrompt() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjectId = useMemo(
    () => session?.user?.subjectId ?? session?.user?.id,
    [session?.user?.id, session?.user?.subjectId],
  );

  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;

    (async () => {
      setChecking(true);
      setError(null);

      try {
        const support = await getPasskeySupport();
        if (!support.canRegister) return;

        const dismissKey = getDismissKey(subjectId);
        if (
          typeof window !== "undefined" &&
          window.sessionStorage.getItem(dismissKey) === "1"
        ) {
          return;
        }

        const json = await fetchPasskeyStatus();

        if (!json?.enabled && !cancelled) {
          setOpen(true);
        }
      } catch (err) {
        console.error("[passkey] status check failed", err);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, subjectId]);

  const closeForSession = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(getDismissKey(subjectId), "1");
    }
    setOpen(false);
  };

  const enablePasskey = async () => {
    setBusy(true);
    setError(null);

    try {
      await registerCurrentSessionPasskey();

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(getDismissKey(subjectId));
      }
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't enable passkey",
      );
    } finally {
      setBusy(false);
    }
  };

  if (status !== "authenticated" || checking) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        if (!next) {
          closeForSession();
          return;
        }
        setOpen(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="success">Recommended</Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              Faster sign-in on this device
            </span>
          </div>
          <DialogTitle className="mt-2 flex items-center gap-2">
            <Fingerprint className="size-5 text-[color:var(--accent)]" />
            Enable passkey on this Mac?
          </DialogTitle>
          <DialogDescription>
            Use Touch ID or your saved device passkey next time instead of
            typing your password.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={closeForSession}
            disabled={busy}
          >
            Not now
          </Button>
          <Button type="button" onClick={enablePasskey} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Setting up…
              </>
            ) : (
              <>
                <Fingerprint className="size-4" />
                Enable passkey
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
