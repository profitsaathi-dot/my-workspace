"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const POLL_MS = 3000;

type WhatsAppStatus =
  | "DISCONNECTED"
  | "STARTING"
  | "SCAN_QR_CODE"
  | "READY"
  | "FAILED";

interface WhatsAppSessionStatus {
  status: WhatsAppStatus;
  connected: boolean;
  phone?: string | null;
  pushName?: string | null;
  qrBase64?: string | null;
  qrMimetype?: string | null;
}

export default function WhatsAppPage() {
  const [data, setData] = useState<WhatsAppSessionStatus | null>(null);

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [refreshingQr, setRefreshingQr] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      setError(null);

      const response = await fetch("/api/whatsapp/status", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed (${response.status})`);
      }

      const result: WhatsAppSessionStatus = await response.json();

      const normalizedStatus = (
        result.status || "DISCONNECTED"
      ).toUpperCase() as WhatsAppStatus;

      setData({
        ...result,
        status: normalizedStatus,
        connected:
          normalizedStatus === "READY"
            ? true
            : result.connected ?? false,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load WhatsApp status"
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const shouldPoll = useMemo(() => {
    return (
      data?.status === "STARTING" ||
      data?.status === "SCAN_QR_CODE"
    );
  }, [data?.status]);

  useEffect(() => {
    if (!shouldPoll) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    if (pollRef.current) return;

    pollRef.current = setInterval(() => {
      fetchStatus(true);
    }, POLL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [shouldPoll, fetchStatus]);

  const connect = async () => {
    try {
      if (connecting) return;

      setConnecting(true);

      const response = await fetch("/api/whatsapp/connect", {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.message || `Failed (${response.status})`
        );
      }

      const normalizedStatus = (
        result.status || "STARTING"
      ).toUpperCase() as WhatsAppStatus;

      setData({
        ...result,
        status: normalizedStatus,
      });

      toast.success("WhatsApp session started");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to start session"
      );
    } finally {
      setConnecting(false);
    }
  };

  const refreshQr = async () => {
    try {
      if (refreshingQr) return;

      setRefreshingQr(true);

      const response = await fetch("/api/whatsapp/restart", {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.message || `Failed (${response.status})`
        );
      }

      const normalizedStatus = (
        result.status || "SCAN_QR_CODE"
      ).toUpperCase() as WhatsAppStatus;

      setData({
        ...result,
        status: normalizedStatus,
      });

      toast.success("New QR generated");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to refresh QR"
      );
    } finally {
      setRefreshingQr(false);
    }
  };

  const confirmDisconnect = async () => {
    try {
      if (disconnecting) return;

      setDisconnecting(true);

      const response = await fetch("/api/whatsapp/disconnect", {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.message || `Failed (${response.status})`
        );
      }

      setData({
        status: "DISCONNECTED",
        connected: false,
      });

      toast.success("WhatsApp disconnected");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to disconnect"
      );
    } finally {
      setDisconnecting(false);
      setDisconnectOpen(false);
    }
  };

  return (
    <>
      <Topbar
        title="WhatsApp"
        subtitle="Connect your WhatsApp account to send messages and order updates."
        actions={
          <Button
            variant="outline"
            onClick={() => fetchStatus()}
            disabled={loading}
          >
            <RefreshCw
              className={cn(
                "size-4",
                loading && "animate-spin"
              )}
            />
            Refresh
          </Button>
        }
      />

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-3 sm:p-4 lg:p-6">
        {loading && !data && <SkeletonCard />}

        {!loading && error && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="grid place-items-center gap-3 py-10 text-center">
              <AlertTriangle className="size-5 text-red-400" />

              <p className="text-sm text-red-300">{error}</p>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchStatus()}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && data && (
          <>
            {data.status === "READY" && data.connected ? (
              <>
                <ConnectedCard
                  phoneNumber={data.phone ?? undefined}
                  pushName={data.pushName ?? undefined}
                  onDisconnect={() =>
                    setDisconnectOpen(true)
                  }
                />

                <SendTestCard />
              </>
            ) : data.status === "SCAN_QR_CODE" &&
              data.qrBase64 ? (
              <QrCard
                qrBase64={data.qrBase64}
                mimetype={data.qrMimetype ?? undefined}
                onRefresh={refreshQr}
                refreshing={refreshingQr}
              />
            ) : data.status === "STARTING" ? (
              <StartingCard />
            ) : data.status === "FAILED" ? (
              <FailedCard
                onRetry={connect}
                retrying={connecting}
              />
            ) : (
              <DisconnectedCard
                onConnect={connect}
                connecting={connecting}
              />
            )}
          </>
        )}
      </main>

      <AlertDialog
        open={disconnectOpen}
        onOpenChange={(open) => {
          if (!disconnecting) {
            setDisconnectOpen(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Disconnect WhatsApp?
            </AlertDialogTitle>

            <AlertDialogDescription>
              You will need to scan QR again to reconnect.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDisconnect();
              }}
              disabled={disconnecting}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {disconnecting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Disconnecting...
                </>
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

function StatusBadge({
  status,
}: {
  status: WhatsAppStatus;
}) {
  switch (status) {
    case "READY":
      return <Badge variant="success">Connected</Badge>;

    case "SCAN_QR_CODE":
      return <Badge variant="warning">Awaiting Scan</Badge>;

    case "STARTING":
      return <Badge variant="info">Starting</Badge>;

    case "FAILED":
      return <Badge variant="danger">Failed</Badge>;

    default:
      return <Badge variant="outline">Disconnected</Badge>;
  }
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
          Start a session and scan QR code.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <ol className="ml-5 list-decimal text-sm text-muted-foreground">
          <li>Open WhatsApp</li>
          <li>Go to Linked Devices</li>
          <li>Tap Link a Device</li>
          <li>Scan QR code</li>
        </ol>

        <Button
          onClick={onConnect}
          disabled={connecting}
          size="lg"
        >
          {connecting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Starting...
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
      <CardContent className="grid place-items-center gap-4 py-12 text-center">
        <Loader2 className="size-7 animate-spin text-[color:var(--accent)]" />

        <div>
          <h2 className="text-lg font-semibold">
            Starting session...
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            QR code will appear shortly.
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
  const src = `data:${
    mimetype ?? "image/png"
  };base64,${qrBase64}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="size-5 text-[color:var(--accent)]" />
          Scan QR Code
        </CardTitle>

        <CardDescription>
          Open WhatsApp → Linked Devices → Link Device
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-4">
        <div className="relative rounded-2xl border bg-white p-4 shadow-sm">
          <img
            src={src}
            alt="WhatsApp QR"
            width={260}
            height={260}
            className={cn(
              "rounded-md transition-opacity",
              refreshing && "opacity-30"
            )}
          />

          {refreshing && (
            <div className="absolute inset-0 grid place-items-center">
              <Loader2 className="size-8 animate-spin text-[color:var(--accent)]" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Waiting for QR scan...
        </div>

        <StatusBadge status="SCAN_QR_CODE" />

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="size-4" />
              Generate New QR
            </>
          )}
        </Button>
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
    <Card className="border-[color:var(--accent)]/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-green-500" />
          WhatsApp Connected
        </CardTitle>

        <CardDescription>
          Your WhatsApp account is linked.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">
              Phone
            </p>

            <div className="mt-1 flex items-center gap-1 text-sm">
              <Phone className="size-4" />
              {phoneNumber ?? "-"}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              Name
            </p>

            <div className="mt-1 text-sm">
              {pushName ?? "-"}
            </div>
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

function FailedCard({
  onRetry,
  retrying,
}: {
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <Card className="border-red-500/30 bg-red-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-red-400" />
          Session Failed
        </CardTitle>

        <CardDescription>
          WhatsApp session could not start.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Button onClick={onRetry} disabled={retrying}>
          {retrying ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Retrying...
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
  const [text, setText] = useState(
    "Hello from ProfitSaathi 👋"
  );
  const [sending, setSending] = useState(false);

  const phoneDigits = to.replace(/\D/g, "");

  const valid =
    phoneDigits.length >= 10 &&
    phoneDigits.length <= 15 &&
    text.trim().length > 0;

  const sendMessage = async () => {
    try {
      if (!valid || sending) return;

      setSending(true);

      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: phoneDigits,
          text: text.trim(),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.message || `Failed (${response.status})`
        );
      }

      toast.success("Message sent");

      setText("");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to send message"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="size-4 text-[color:var(--accent)]" />
          Send Test Message
        </CardTitle>

        <CardDescription>
          Use number with country code.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Recipient</Label>

          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            maxLength={15}
            value={to}
            placeholder="919999999999"
            onChange={(event) => {
              setTo(
                event.target.value.replace(/\D/g, "")
              );
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="message">Message</Label>

          <Textarea
            id="message"
            rows={4}
            value={text}
            placeholder="Type your message"
            onChange={(event) => {
              setText(event.target.value);
            }}
          />
        </div>

        <Button
          onClick={sendMessage}
          disabled={!valid || sending}
        >
          {sending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="size-4" />
              Send Message
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
      <CardContent className="flex flex-col gap-4 p-5">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mx-auto aspect-square w-60 rounded-xl" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}