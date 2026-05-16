"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  Lock,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
} from "@workspace/ui";
import { useT } from "@/src/i18n/useT";
import { useUserStore } from "@/src/stores/user.store";
import type { AiProvider, AiChatProviderStatus } from "@/src/types/aiChat";

interface ProviderMeta {
  id: AiProvider;
  nameKey: string;
  blurbKey: string;
  /** Where to get a free key. */
  signupUrl: string;
  /** Help topic to link to inside the app. */
  helpHref: string;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: "GEMINI",
    nameKey: "settings.aiKey.gemini.name",
    blurbKey: "settings.aiKey.gemini.blurb",
    signupUrl: "https://aistudio.google.com/apikey",
    helpHref: "/help?topic=ai-key-gemini",
  },
  {
    id: "OPENROUTER",
    nameKey: "settings.aiKey.openrouter.name",
    blurbKey: "settings.aiKey.openrouter.blurb",
    signupUrl: "https://openrouter.ai/keys",
    helpHref: "/help?topic=ai-key-openrouter",
  },
  {
    id: "NVIDIA",
    nameKey: "settings.aiKey.nvidia.name",
    blurbKey: "settings.aiKey.nvidia.blurb",
    signupUrl: "https://build.nvidia.com/explore/discover",
    helpHref: "/help?topic=ai-key-nvidia",
  },
];

/** Bridge between the provider status payload and the User type for cross-component sync. */
function statusToUserPatch(s: AiChatProviderStatus) {
  return {
    geminiApiKeySet: s.geminiKeySet,
    openrouterApiKeySet: s.openrouterKeySet,
    nvidiaApiKeySet: s.nvidiaKeySet,
    aiPrimaryProvider: s.primaryProvider,
  };
}

export function AiKeySection() {
  const t = useT();
  const patchUser = useUserStore((s) => s.patchUser);

  const [status, setStatus] = useState<AiChatProviderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Refresh from the server on mount so the page reflects what's actually
  // stored (cheaper than re-reading the user store, and re-renders the
  // whole tile in one call after save).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/chat/providers");
        if (!res.ok) return;
        const s = (await res.json()) as AiChatProviderStatus;
        if (!cancelled) setStatus(s);
      } catch (e) {
        console.warn("providers fetch failed", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const applyStatus = useCallback((next: AiChatProviderStatus) => {
    setStatus(next);
    patchUser(statusToUserPatch(next));
  }, [patchUser]);

  const onPrimaryChange = async (next: AiProvider) => {
    setError(null);
    try {
      const res = await fetch("/api/ai/chat/providers/primary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      applyStatus((await res.json()) as AiChatProviderStatus);
      setToast(t("settings.aiKey.primarySaved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.couldNotSave"));
    }
  };

  const isKeyOnFile = useCallback(
    (id: AiProvider) =>
      status
        ? id === "GEMINI"
          ? status.geminiKeySet
          : id === "OPENROUTER"
            ? status.openrouterKeySet
            : status.nvidiaKeySet
        : false,
    [status]
  );

  const anyConfigured = status ? status.configured.length > 0 : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-[color:var(--accent)]" />
          {t("settings.aiKey.title")}
        </CardTitle>
        <CardDescription>{t("settings.aiKey.desc")}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Security disclosure — explains the two encryption layers */}
        <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-emerald-500" />
          <div className="space-y-1">
            <div className="font-medium text-foreground">{t("settings.aiKey.securityTitle")}</div>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>{t("settings.aiKey.securityTls")}</li>
              <li>{t("settings.aiKey.securityAes")}</li>
              <li>{t("settings.aiKey.securityMasked")}</li>
            </ul>
          </div>
        </div>

        {/* Primary-provider selector */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="aiPrimary">{t("settings.aiKey.primaryLabel")}</Label>
          <Select
            id="aiPrimary"
            value={status?.primaryProvider ?? ""}
            onChange={(e) => void onPrimaryChange(e.target.value as AiProvider)}
            disabled={!anyConfigured}
          >
            {!anyConfigured && (
              <option value="">{t("settings.aiKey.primaryNonePlaceholder")}</option>
            )}
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id} disabled={!isKeyOnFile(p.id)}>
                {t(p.nameKey as never)}{!isKeyOnFile(p.id) ? ` (${t("settings.aiKey.noKey")})` : ""}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">{t("settings.aiKey.primaryHint")}</p>
        </div>

        {toast && (
          <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500">
            {toast}
          </div>
        )}
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Per-provider key editors */}
        <div className="flex flex-col gap-3">
          {PROVIDERS.map((p) => (
            <ProviderKeyRow
              key={p.id}
              meta={p}
              isSet={isKeyOnFile(p.id)}
              isPrimary={status?.primaryProvider === p.id}
              onSaved={applyStatus}
              onToast={setToast}
              onError={setError}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProviderKeyRow({
  meta,
  isSet,
  isPrimary,
  onSaved,
  onToast,
  onError,
}: {
  meta: ProviderMeta;
  isSet: boolean;
  isPrimary: boolean;
  onSaved: (s: AiChatProviderStatus) => void;
  onToast: (m: string) => void;
  onError: (m: string | null) => void;
}) {
  const t = useT();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const save = async () => {
    const apiKey = value.trim();
    if (!apiKey) return;
    setSaving(true);
    onError(null);
    try {
      const res = await fetch("/api/ai/chat/providers/key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: meta.id, apiKey }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next = (await res.json()) as AiChatProviderStatus;
      onSaved(next);
      setValue("");
      onToast(t("settings.aiKey.saved"));
    } catch (e) {
      onError(e instanceof Error ? e.message : t("errors.couldNotSave"));
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    setRemoving(true);
    onError(null);
    try {
      const res = await fetch("/api/ai/chat/providers/key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: meta.id, apiKey: "" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onSaved((await res.json()) as AiChatProviderStatus);
      onToast(t("settings.aiKey.removed"));
    } catch (e) {
      onError(e instanceof Error ? e.message : t("errors.couldNotSave"));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card/40 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{t(meta.nameKey as never)}</span>
          {isSet && (
            <Badge variant="success">
              <CheckCircle2 className="size-3" />
              {t("settings.aiKey.set")}
            </Badge>
          )}
          {isPrimary && (
            <Badge variant="default">{t("settings.aiKey.primary")}</Badge>
          )}
        </div>
        <a
          href={meta.signupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="size-3" />
          {t("settings.aiKey.getKey")}
        </a>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">{t(meta.blurbKey as never)}</p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Lock className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isSet ? t("settings.aiKey.replacePlaceholder") : t("settings.aiKey.placeholder")}
            className="pl-7"
          />
        </div>
        <div className="flex items-center gap-2">
          {isSet && (
            <Button size="sm" variant="outline" onClick={clear} disabled={removing}>
              {removing ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              {t("settings.aiKey.clear")}
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={saving || !value.trim()}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {t("settings.aiKey.save")}
          </Button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
        <a href={meta.helpHref} className="inline-flex items-center gap-1 hover:text-foreground">
          <KeyRound className="size-3" />
          {t("settings.aiKey.howTo")}
        </a>
      </div>
    </div>
  );
}
