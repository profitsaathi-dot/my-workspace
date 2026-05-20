"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Phone,
  PowerOff,
  RefreshCw,
  Send,
  Smartphone,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
  Textarea,
  Topbar,
  cn,
  toast,
} from "@workspace/ui";
import type { WhatsAppSessionStatus, WhatsAppStatus } from "@/src/types/whatsapp";

const POLL_MS = 3000;

export default function WhatsAppPage() {
  const [data, setData] = useState<WhatsAppSessionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [refreshingQr, setRefreshingQr] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // We poll while we expect the status to change (STARTING / SCAN_QR_CODE),
  // and step back to a quiet refresh once the seller is in a stable state.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await fetch("/api/whatsapp/status", { cache: "no-store" });
      if (!res.ok) throw new Error(`Backend ${res.status}`);
      const next = (await res.json()) as WhatsAppSessionStatus;
      setData(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll only while we're actively waiting on a transition. WORKING /
  // STOPPED / FAILED are stable — no point hammering the API.
  useEffect(() => {
    const status = data?.status;
    const shouldPoll = status === "STARTING" || status === "SCAN_QR_CODE";
    if (!shouldPoll) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = setInterval(() => fetchStatus(true), POLL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [data?.status, fetchStatus]);

  const connect = async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Backend ${res.status}`);
      }
      const next = (await res.json()) as WhatsAppSessionStatus;
      setData(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start session");
    } finally {
      setConnecting(false);
    }
  };

  const refreshQr = async () => {
    if (refreshingQr) return;
    setRefreshingQr(true);
    try {
      const res = await fetch("/api/whatsapp/restart", { method: "POST" });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Backend ${res.status}`);
      }
      const next = (await res.json()) as WhatsAppSessionStatus;
      setData(next);
      toast.success("New QR generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not refresh QR");
    } finally {
      setRefreshingQr(false);
    }
  };

  const confirmDisconnect = async () => {
    if (disconnecting) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/whatsapp/disconnect", { method: "POST" });
      if (!res.ok) throw new Error(`Backend ${res.status}`);
      toast.success("WhatsApp disconnected");
      setData({ status: "DISCONNECTED", connected: false });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not disconnect");
    } finally {
      setDisconnecting(false);
      setDisconnectOpen(false);
    }
  };

  return (
    <>
      <Topbar
        title="WhatsApp"
        subtitle="Connect your WhatsApp account to send order updates and customer messages."
        actions={
          <Button variant="outline" onClick={() => fetchStatus()} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-3 sm:p-4 sm:gap-6 lg:p-6">
        {loading && !data && <SkeletonCard />}

        {!loading && error && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="grid place-items-center gap-2 py-10 text-center">
              <AlertTriangle className="size-5 text-red-300" />
              <p className="text-sm text-red-300">Couldn't load: {error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchStatus()}>
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && data && (
          <>
            {data.status === "ready" && data.connected ? (
              <ConnectedCard
                phoneNumber={data.phone ?? undefined}
                pushName={data.pushName ?? undefined}
                onDisconnect={() => setDisconnectOpen(true)}
              />
            ) : data.status === "qr_ready" && data.qrBase64 ? (
              <QrCard
                qrBase64={data.qrBase64}
                mimetype={data.qrMimetype}
                onRefresh={refreshQr}
                refreshing={refreshingQr}
              />
            ) : data.status === "STARTING" ? (
              <StartingCard />
            ) : data.status === "FAILED" ? (
              <FailedCard onRetry={connect} retrying={connecting} />
            ) : (
              <DisconnectedCard onConnect={connect} connecting={connecting} />
            )}

            {data.status === "ready" && data.connected && <SendTestCard />}
          </>
        )}
      </main>

      <AlertDialog
        open={disconnectOpen}
        onOpenChange={(open) => {
          if (!open && !disconnecting) setDisconnectOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to scan the QR code again to reconnect. Pending
              messages won't be sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>Keep connected</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDisconnect();
              }}
              disabled={disconnecting}
              className="bg-red-500/90 text-white hover:bg-red-500"
            >
              {disconnecting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" />
                  Disconnecting…
                </span>
              ) : (
                "Disconnect"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StatusBadge({ status }: { status: WhatsAppStatus }) {
  if (status === "ready") return <Badge variant="success">Connected</Badge>;
  if (status === "SCAN_QR_CODE") return <Badge variant="warning">Awaiting scan</Badge>;
  if (status === "STARTING") return <Badge variant="info">Starting</Badge>;
  if (status === "FAILED") return <Badge variant="danger">Failed</Badge>;
  return <Badge variant="outline">Disconnected</Badge>;
}

function DisconnectedCard({
  onConnect,
  connecting,
}: {
  onConnect: () => void;
  connecting: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="size-5 text-[color:var(--accent)]" />
          WhatsApp not connected
        </CardTitle>
        <CardDescription>
          Click connect, then scan the QR code with WhatsApp on your phone.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ol className="ml-5 list-decimal text-sm text-muted-foreground">
          <li>Open WhatsApp on your phone</li>
          <li>Go to Settings → Linked Devices → Link a Device</li>
          <li>Scan the QR code that appears here</li>
        </ol>
        <Button onClick={onConnect} disabled={connecting} size="lg">
          {connecting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Starting…
            </>
          ) : (
            <>
              <Smartphone className="size-4" />
              Connect WhatsApp
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function StartingCard() {
  return (
    <Card>
      <CardContent className="grid place-items-center gap-3 py-12 text-center">
        <Loader2 className="size-6 animate-spin text-[color:var(--accent)]" />
        <div>
          <h2 className="text-base font-semibold">Starting your session…</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This usually takes a few seconds. The QR code will appear next.
          </p>
        </div>
        <StatusBadge status="STARTING" />
      </CardContent>
    </Card>
  );
}

function QrCard({
  qrBase64,
  mimetype,
  onRefresh,
  refreshing,
}: {
  qrBase64: string;
  mimetype?: string;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const src = `data:${mimetype ?? "image/png"};base64,${qrBase64}`;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="size-5 text-[color:var(--accent)]" />
          Scan with WhatsApp
        </CardTitle>
        <CardDescription>
          On your phone: Settings → Linked Devices → Link a Device.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <div className="relative rounded-2xl border bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="WhatsApp QR code"
            width={260}
            height={260}
            className={cn(refreshing && "opacity-40")}
          />
          {refreshing && (
            <div className="absolute inset-0 grid place-items-center rounded-2xl">
              <Loader2 className="size-8 animate-spin text-[color:var(--accent)]" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Waiting for you to scan…
          </span>
        </div>
        <StatusBadge status="SCAN_QR_CODE" />
        <div className="flex flex-col items-center gap-1 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <RefreshCw className="size-3.5" />
                Generate new QR
              </>
            )}
          </Button>
          <span className="text-[11px] text-muted-foreground">
            QR expired? Click to get a fresh one.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ConnectedCard({
  phoneNumber,
  pushName,
  onDisconnect,
}: {
  phoneNumber?: string;
  pushName?: string;
  onDisconnect: () => void;
}) {
  return (
    <Card className="border-[color:var(--accent)]/30 bg-[color:var(--accent-soft)]/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-[color:var(--accent)]" />
          WhatsApp is connected
        </CardTitle>
        <CardDescription>
          Your account is linked. You can send messages from here or wire it
          into the order flow.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Phone</div>
            <div className="mt-0.5 inline-flex items-center gap-1 tabular-nums">
              <Phone className="size-3.5" />
              {phoneNumber ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Name</div>
            <div className="mt-0.5">{pushName ?? "—"}</div>
          </div>
        </div>
        <Button variant="outline" onClick={onDisconnect}>
          <PowerOff className="size-4" />
          Disconnect
        </Button>
      </CardContent>
    </Card>
  );
}

function FailedCard({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <Card className="border-red-500/30 bg-red-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-red-300" />
          WhatsApp session failed
        </CardTitle>
        <CardDescription>
          The session couldn't start. This often clears with a retry — if it
          doesn't, the WAHA service may be down.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onRetry} disabled={retrying}>
          {retrying ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Retrying…
            </>
          ) : (
            <>
              <RefreshCw className="size-4" />
              Retry
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function SendTestCard() {
  const [to, setTo] = useState("");
  const [text, setText] = useState("Hello from ProfitSaathi 👋");
  const [sending, setSending] = useState(false);

  const phoneDigits = to.replace(/\D/g, "");
  const valid = phoneDigits.length >= 10 && phoneDigits.length <= 15 && text.trim().length > 0;

  const send = async () => {
    if (!valid || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phoneDigits, text: text.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? `Failed (${res.status})`);
      toast.success("Message sent");
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="size-4 text-[color:var(--accent)]" />
          Send a test message
        </CardTitle>
        <CardDescription>
          Use a number with country code (e.g. <span className="font-mono">919999999999</span>).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Recipient</Label>
          <Input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={15}
            value={to}
            onChange={(e) => setTo(e.target.value.replace(/\D/g, ""))}
            placeholder="919999999999"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Message</Label>
          <Textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message"
          />
        </div>
        <Button onClick={send} disabled={!valid || sending}>
          {sending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send className="size-4" />
              Send
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="aspect-square w-60 self-center" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}
