"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  ImagePlus,
  KeyRound,
  Loader2,
  MessagesSquare,
  Palette,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Topbar,
  buttonVariants,
  cn,
} from "@workspace/ui";
import { useT } from "@/src/i18n/useT";
import type {
  AiChatMessageView,
  AiChatProviderStatus,
  AiChatSessionSummary,
  AiProvider,
  ImageGenProviderUsed,
} from "@/src/types/aiChat";

interface PendingUserMsg {
  id: string;            // local id, prefixed with "tmp-"
  text: string;
  hasImage: boolean;
}

type ThreadMessage = AiChatMessageView | (PendingUserMsg & { tempPending: true });

const PROVIDER_LABEL: Record<AiProvider, string> = {
  GEMINI: "Gemini",
  OPENROUTER: "OpenRouter",
  NVIDIA: "NVIDIA",
};

/**
 * Strip the `data:image/...;base64,` prefix from a FileReader result.
 * Gemini's `inline_data.data` field wants raw base64 only.
 */
function stripDataUrlPrefix(dataUrl: string): { mime: string; base64: string } {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return { mime: "image/jpeg", base64: dataUrl };
  return { mime: match[1] ?? "image/jpeg", base64: match[2] ?? "" };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Copy text to the clipboard, falling back to the legacy
 * {@code execCommand} path for browsers / contexts where
 * {@code navigator.clipboard} is unavailable (older Android Chrome, http
 * origins). Resolves true when something was copied.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

function extFromMime(mime: string | null): string {
  if (!mime) return "png";
  const m = mime.toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("webp")) return "webp";
  return "png";
}

/**
 * Triggers a browser save dialog for a stored Saathi-generated image.
 * We fetch the bytes into a Blob first instead of relying on `<a download>`
 * — same-origin works either way, but Blob URLs let us bypass the
 * "cache-control: no-store" replay quirk and guarantee a filename.
 */
async function downloadGeneratedImage(messageId: number, mime: string | null): Promise<void> {
  try {
    const res = await fetch(`/api/ai/chat/image/${messageId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saathi-image-${messageId}.${extFromMime(mime ?? blob.type)}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Defer revocation so the browser definitely finished the download dispatch.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch (e) {
    console.error("download failed", e);
  }
}

export default function ChatPage() {
  const t = useT();

  const [sessions, setSessions] = useState<AiChatSessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [providers, setProviders] = useState<AiChatProviderStatus | null>(null);
  const [lastProviderUsed, setLastProviderUsed] = useState<AiProvider | null>(null);

  const [draft, setDraft] = useState("");
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string; mime: string; base64: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  /** When true, the next send goes to the image-gen endpoint instead of chat. */
  const [imageGenMode, setImageGenMode] = useState(false);
  /** Index of the most-recently-copied message bubble — used to flash a "copied" check icon for ~1.5s. */
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Initial load: sessions + which provider keys are on file.
  useEffect(() => {
    (async () => {
      try {
        const [sRes, pRes] = await Promise.all([
          fetch("/api/ai/chat/sessions"),
          fetch("/api/ai/chat/providers"),
        ]);
        if (sRes.ok) setSessions((await sRes.json()) as AiChatSessionSummary[]);
        if (pRes.ok) setProviders((await pRes.json()) as AiChatProviderStatus);
      } catch (e) {
        console.error("chat init failed", e);
      }
    })();
  }, []);

  const noProvidersConfigured = providers ? providers.configured.length === 0 : false;

  // Auto-scroll to bottom on new message.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const openSession = useCallback(async (id: number) => {
    setLoadingSession(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/chat/sessions/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const detail = (await res.json()) as {
        session: AiChatSessionSummary;
        messages: AiChatMessageView[];
      };
      setActiveSessionId(detail.session.id);
      setMessages(detail.messages);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("chat.error.generic"));
    } finally {
      setLoadingSession(false);
    }
  }, [t]);

  const newSession = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
  }, []);

  const deleteSession = useCallback(async (id: number) => {
    try {
      await fetch(`/api/ai/chat/sessions/${id}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (e) {
      console.error("delete session failed", e);
    }
  }, [activeSessionId]);

  const onPickFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Hard client cap matches the backend's 4 MB check so we fail fast.
    if (file.size > 4 * 1024 * 1024) {
      setError(t("chat.composer.imageHint"));
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    const { mime, base64 } = stripDataUrlPrefix(dataUrl);
    setPendingImage({ dataUrl, mime, base64 });
    // Reset the input so the same file can be picked again after removing it.
    e.target.value = "";
  }, [t]);

  /**
   * Image-generation path. Calls /api/ai/chat/image, which persists an
   * assistant message with image_path. We refresh the session after success
   * so the new message (and image URL) shows up. Image bytes are fetched
   * via /api/ai/chat/image/<messageId>, never inlined in the JSON.
   */
  const sendImageGen = useCallback(async () => {
    const prompt = draft.trim();
    if (!prompt) return;
    if (sending) return;

    // When a source image is attached in image-gen mode, the backend treats
    // this as an image-to-image edit and charges the FEATURE_IMAGE_EDIT counter.
    const isEdit = pendingImage !== null;

    setError(null);
    setSending(true);

    const tempId = `tmp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId as unknown as number,
        text: prompt,
        hasImage: isEdit,
        tempPending: true,
      } as unknown as ThreadMessage,
    ]);

    try {
      const res = await fetch("/api/ai/chat/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
          prompt,
          imageBase64: pendingImage?.base64 ?? null,
          imageMime: pendingImage?.mime ?? null,
        }),
      });

      if (res.status === 502) {
        const upstream = (await res.json().catch(() => ({}))) as { failures?: string[] };
        const detail = (upstream.failures ?? []).slice(0, 2).join(" · ");
        setError(`${t("chat.error.allFailed")}${detail ? ` — ${detail}` : ""}`);
        setMessages((prev) => prev.filter((m) => (m as PendingUserMsg).id !== tempId));
        return;
      }
      if (!res.ok) {
        const upstream = (await res.json().catch(() => ({}))) as { message?: string };
        setError(upstream.message ?? t("chat.error.generic"));
        setMessages((prev) => prev.filter((m) => (m as PendingUserMsg).id !== tempId));
        return;
      }

      const data = (await res.json()) as {
        sessionId: number;
        messageId: number;
        providerUsed: ImageGenProviderUsed;
      };

      setActiveSessionId(data.sessionId);
      setDraft("");
      setPendingImage(null);

      // Re-fetch the whole session so the new generated-image bubble shows up
      // with the right id/imagePath. Keeps us in sync with the DB.
      const refreshed = await fetch(`/api/ai/chat/sessions/${data.sessionId}`);
      if (refreshed.ok) {
        const detail = (await refreshed.json()) as {
          session: AiChatSessionSummary;
          messages: AiChatMessageView[];
        };
        setMessages(detail.messages);
        setSessions((prev) => {
          const idx = prev.findIndex((s) => s.id === detail.session.id);
          return idx === -1
            ? [detail.session, ...prev]
            : prev.map((s) => (s.id === detail.session.id ? detail.session : s));
        });
      } else {
        setMessages((prev) => prev.filter((m) => (m as PendingUserMsg).id !== tempId));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("chat.error.generic"));
      setMessages((prev) => prev.filter((m) => (m as PendingUserMsg).id !== tempId));
    } finally {
      setSending(false);
    }
  }, [draft, pendingImage, sending, activeSessionId, t]);

  const send = useCallback(async () => {
    if (imageGenMode) return sendImageGen();
    const text = draft.trim();
    if (!text && !pendingImage) return;
    if (sending) return;

    setError(null);
    setSending(true);

    const tempId = `tmp-${Date.now()}`;
    const userPlaceholder: ThreadMessage = {
      id: tempId as unknown as number,
      text,
      hasImage: Boolean(pendingImage),
      tempPending: true,
    } as unknown as ThreadMessage;
    setMessages((prev) => [...prev, userPlaceholder]);

    const body = {
      sessionId: activeSessionId,
      message: text,
      imageBase64: pendingImage?.base64 ?? null,
      imageMime: pendingImage?.mime ?? null,
    };

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 412) {
        // No AI provider configured — show the empty state, scroll back to it.
        setError(t("chat.error.noKey"));
        setMessages((prev) => prev.filter((m) => (m as PendingUserMsg).id !== tempId));
        // Refresh provider state so the inline empty state renders correctly.
        try {
          const r = await fetch("/api/ai/chat/providers");
          if (r.ok) setProviders((await r.json()) as AiChatProviderStatus);
        } catch { /* ignore */ }
        return;
      }

      if (res.status === 502) {
        const upstream = (await res.json().catch(() => ({}))) as {
          message?: string;
          failures?: string[];
        };
        const detail = (upstream.failures ?? []).slice(0, 2).join(" · ");
        setError(`${t("chat.error.allFailed")}${detail ? ` — ${detail}` : ""}`);
        setMessages((prev) => prev.filter((m) => (m as PendingUserMsg).id !== tempId));
        return;
      }

      if (!res.ok) {
        const upstream = (await res.json().catch(() => ({}))) as { message?: string };
        const msg = upstream.message ?? "";
        setError(msg || t("chat.error.generic"));
        setMessages((prev) => prev.filter((m) => (m as PendingUserMsg).id !== tempId));
        return;
      }

      const data = (await res.json()) as {
        sessionId: number;
        reply: string;
        providerUsed: AiProvider;
      };

      // Replace the optimistic placeholder with the real saved user message,
      // then append the assistant reply. We don't have ids from the server for
      // each turn separately — re-fetch the session detail to stay in sync.
      const wasNewSession = activeSessionId === null;
      setActiveSessionId(data.sessionId);
      setLastProviderUsed(data.providerUsed);
      setDraft("");
      setPendingImage(null);

      const refreshed = await fetch(`/api/ai/chat/sessions/${data.sessionId}`);
      if (refreshed.ok) {
        const detail = (await refreshed.json()) as {
          session: AiChatSessionSummary;
          messages: AiChatMessageView[];
        };
        setMessages(detail.messages);
        // Bump the session into the sessions list (top) if it's new.
        if (wasNewSession) {
          setSessions((prev) => [detail.session, ...prev.filter((s) => s.id !== detail.session.id)]);
        } else {
          setSessions((prev) =>
            prev.map((s) => (s.id === detail.session.id ? detail.session : s))
          );
        }
      } else {
        // Best-effort fallback so the user still sees the reply.
        setMessages((prev) =>
          prev.map((m) =>
            (m as PendingUserMsg).id === tempId
              ? { id: -1, role: "USER" as const, content: text, hasImage: Boolean(pendingImage), createdAt: new Date().toISOString() }
              : m
          ).concat({
            id: -2,
            role: "ASSISTANT" as const,
            content: data.reply,
            hasImage: false,
            createdAt: new Date().toISOString(),
          })
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("chat.error.generic"));
      setMessages((prev) => prev.filter((m) => (m as PendingUserMsg).id !== tempId));
    } finally {
      setSending(false);
    }
  }, [imageGenMode, sendImageGen, draft, pendingImage, sending, activeSessionId, t]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  }, [send]);

  const idea = useCallback((key: "caption" | "hashtags" | "reel" | "whatsapp") => {
    setDraft(t(`chat.ideas.${key}` as never));
  }, [t]);

  const onCopy = useCallback(async (idx: number, text: string) => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopiedIdx(idx);
    window.setTimeout(() => setCopiedIdx((v) => (v === idx ? null : v)), 1500);
  }, []);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        const ta = (a.updatedAt ?? a.createdAt) ?? "";
        const tb = (b.updatedAt ?? b.createdAt) ?? "";
        return tb.localeCompare(ta);
      }),
    [sessions]
  );

  return (
    <>
      <Topbar
        title={t("chat.title")}
        subtitle={t("chat.subtitle")}
        actions={
          providers?.primaryProvider ? (
            <Badge variant="default">
              <Sparkles className="size-3" />
              {PROVIDER_LABEL[providers.primaryProvider]}
              {lastProviderUsed && lastProviderUsed !== providers.primaryProvider
                ? ` · ${t("chat.providerFallback", { p: PROVIDER_LABEL[lastProviderUsed] })}`
                : ""}
            </Badge>
          ) : null
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-3 p-2 sm:gap-4 sm:p-4 lg:gap-6 lg:p-6">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[280px_1fr]">
          {/* Sessions rail — hidden on mobile so the chat thread has the full
              viewport. Desktop sellers use it for cross-session navigation;
              mobile sellers stay in their active chat. */}
          <aside className="hidden lg:block">
            <Card>
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {t("chat.sessions.title")}
                  </span>
                  <Button size="sm" variant="ghost" onClick={newSession}>
                    <Plus className="size-3.5" />
                    {t("chat.sessions.new")}
                  </Button>
                </div>
                {sortedSessions.length === 0 ? (
                  <div className="rounded-md border border-dashed bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
                    {t("chat.sessions.empty")}
                  </div>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {sortedSessions.map((s) => (
                      <li key={s.id} className="group flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void openSession(s.id)}
                          className={cn(
                            "flex flex-1 items-center gap-2 truncate rounded-md px-2 py-1.5 text-left text-xs",
                            activeSessionId === s.id
                              ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <MessagesSquare className="size-3.5 shrink-0" />
                          <span className="truncate">{s.title ?? "Chat"}</span>
                        </button>
                        <button
                          type="button"
                          aria-label={t("chat.sessions.delete")}
                          onClick={() => void deleteSession(s.id)}
                          className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* Main thread — flex-1 + lg:order-2 keeps it right-side on desktop
              and full-width on mobile. The scroller uses dvh so it tracks
              the mobile address-bar collapse correctly. */}
          <section className="flex min-h-[60vh] flex-col gap-3 lg:order-2">
            <Card className="flex flex-1 flex-col">
              <CardContent className="flex flex-1 flex-col p-0">
                <div
                  ref={scrollerRef}
                  className="flex-1 overflow-y-auto px-2 py-3 sm:px-4 sm:py-4"
                  style={{ maxHeight: "min(70dvh, 70vh)" }}
                >
                  {loadingSession ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                    </div>
                  ) : noProvidersConfigured && messages.length === 0 ? (
                    <NoProvidersEmptyState t={t} />
                  ) : messages.length === 0 ? (
                    <EmptyState t={t} idea={idea} />
                  ) : (
                    <div className="flex flex-col gap-3">
                      {messages.map((m, idx) => {
                        const isUser = "role" in m ? m.role === "USER" : true;
                        const content = "content" in m ? m.content : (m as PendingUserMsg).text;
                        const hasImage = "hasImage" in m ? m.hasImage : false;
                        const pending = "tempPending" in m;
                        // Saathi-generated images live behind /api/ai/chat/image/<id>
                        // and are only set on assistant turns persisted by the
                        // backend. The pending-placeholder branch never has an id.
                        const generatedImageId =
                          !pending && !isUser && "imagePath" in m && m.imagePath
                            ? (m as AiChatMessageView).id
                            : null;
                        const copyableText = typeof content === "string" ? content : "";
                        // Surface which provider answered this turn — handy
                        // for spotting fallback (e.g. primary=NVIDIA but a
                        // particular reply says "via Gemini"). Only on the
                        // persisted assistant messages — pending placeholders
                        // don't have it yet.
                        const chatProviderUsed =
                          !pending && !isUser && "chatProvider" in m
                            ? (m as AiChatMessageView).chatProvider ?? null
                            : null;
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "group flex items-end gap-1.5",
                              isUser ? "justify-end" : "justify-start"
                            )}
                          >
                            {/* Copy button on the LEFT for user bubbles (which
                                right-align) — sits outside the bubble so the
                                accent bg stays clean. Always rendered, fades in
                                on hover/tap; on touch devices it's permanently
                                at ~50% opacity so it's discoverable without a
                                hover. Hidden when there's no text to copy. */}
                            {isUser && copyableText && !pending && (
                              <CopyButton
                                copied={copiedIdx === idx}
                                onClick={() => void onCopy(idx, copyableText)}
                                t={t}
                              />
                            )}
                            <div
                              className={cn(
                                "max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm sm:max-w-[85%]",
                                isUser
                                  ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
                                  : "bg-muted text-foreground",
                                pending && "opacity-60"
                              )}
                            >
                              {hasImage && !generatedImageId && (
                                <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5 text-[10px]">
                                  <ImagePlus className="size-3" />
                                  image
                                </div>
                              )}
                              {generatedImageId && (
                                <div className="mb-2 overflow-hidden rounded-xl bg-black/10">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={`/api/ai/chat/image/${generatedImageId}`}
                                    alt={content || "Generated image"}
                                    className="block max-h-96 w-full object-contain"
                                  />
                                  {/* Always shows the Saathi AI brand credit — the underlying provider
                                      (NVIDIA / Gemini / old POLLINATIONS rows) lives in the DB for
                                      analytics but doesn't surface to the seller. */}
                                  <div className="flex items-center justify-between gap-2 bg-black/20 px-2 py-1 text-[10px] text-muted-foreground">
                                    <span>{t("chat.image.generatedBy")}</span>
                                    <button
                                      type="button"
                                      onClick={() => void downloadGeneratedImage(generatedImageId, "imageMime" in m ? m.imageMime ?? null : null)}
                                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 hover:bg-black/30 hover:text-foreground"
                                      aria-label={t("chat.image.download")}
                                    >
                                      <Download className="size-3" />
                                      {t("chat.image.download")}
                                    </button>
                                  </div>
                                </div>
                              )}
                              {content || (isUser ? "(image)" : "")}
                              {chatProviderUsed && (
                                <div className="mt-1.5 border-t border-foreground/10 pt-1 text-[10px] text-muted-foreground">
                                  {t("chat.viaProvider", {
                                    p: PROVIDER_LABEL[chatProviderUsed] ?? chatProviderUsed,
                                  })}
                                </div>
                              )}
                            </div>
                            {/* Copy button on the RIGHT for assistant bubbles. */}
                            {!isUser && copyableText && !pending && (
                              <CopyButton
                                copied={copiedIdx === idx}
                                onClick={() => void onCopy(idx, copyableText)}
                                t={t}
                              />
                            )}
                          </div>
                        );
                      })}
                      {sending && (
                        <div className="flex justify-start">
                          <div className="rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="border-t border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive sm:px-4">
                    {error}
                  </div>
                )}

                {/* Composer */}
                <div className="border-t bg-card/60 p-2 sm:p-4">
                  {pendingImage && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg border bg-muted/40 p-2 text-xs">
                      <img
                        src={pendingImage.dataUrl}
                        alt="attachment preview"
                        className="size-12 rounded object-cover"
                      />
                      <span className="flex-1 text-muted-foreground">
                        {t("chat.composer.imageHint")}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingImage(null)}
                        className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={t("chat.composer.removeImage")}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => void onPickFile(e)}
                    />
                    {/* The upload button is now allowed in image-gen mode too —
                        adding a source image turns the next send into an
                        image-to-image edit (separate `ai_image_edit` counter).
                        In chat mode it still gates on the upload (vision) counter. */}
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending}
                      title={
                        imageGenMode
                          ? t("chat.composer.attachForEdit")
                          : t("chat.composer.attach")
                      }
                    >
                      <ImagePlus className="size-4" />
                    </Button>
                    {/* Image-generation mode toggle (Wand). With no upload it's
                        text-to-image; with an upload it becomes image-to-image edit. */}
                    <Button
                      size="sm"
                      variant={imageGenMode ? "default" : "outline"}
                      type="button"
                      onClick={() => {
                        setImageGenMode((v) => !v);
                        // Clear any attached upload when leaving gen mode so
                        // we don't accidentally edit-when-meaning-to-chat.
                        if (imageGenMode) setPendingImage(null);
                      }}
                      disabled={sending}
                      title={t("chat.composer.imageGen")}
                    >
                      <Wand2 className="size-4" />
                    </Button>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={onKeyDown}
                      rows={2}
                      placeholder={
                        imageGenMode
                          ? pendingImage
                            ? t("chat.composer.imageEditPlaceholder")
                            : t("chat.composer.imageGenPlaceholder")
                          : t("chat.composer.placeholder")
                      }
                      className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/40"
                    />
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => void send()}
                      disabled={
                        sending ||
                        (imageGenMode ? !draft.trim() : (!draft.trim() && !pendingImage))
                      }
                    >
                      {sending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : imageGenMode ? (
                        <Palette className="size-3.5" />
                      ) : (
                        <Send className="size-3.5" />
                      )}
                      {sending
                        ? t("chat.composer.sending")
                        : imageGenMode
                          ? pendingImage
                            ? t("chat.composer.edit")
                            : t("chat.composer.generate")
                          : t("chat.composer.send")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}

function EmptyState({
  t,
  idea,
}: {
  t: ReturnType<typeof useT>;
  idea: (key: "caption" | "hashtags" | "reel" | "whatsapp") => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
        <Sparkles className="size-5" />
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium">{t("chat.empty.title")}</div>
        <div className="max-w-md text-xs text-muted-foreground">{t("chat.empty.desc")}</div>
      </div>
      <div className="flex flex-col items-stretch gap-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {t("chat.ideas.title")}
        </span>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <IdeaChip onClick={() => idea("caption")}>{t("chat.ideas.caption")}</IdeaChip>
          <IdeaChip onClick={() => idea("hashtags")}>{t("chat.ideas.hashtags")}</IdeaChip>
          <IdeaChip onClick={() => idea("reel")}>{t("chat.ideas.reel")}</IdeaChip>
          <IdeaChip onClick={() => idea("whatsapp")}>{t("chat.ideas.whatsapp")}</IdeaChip>
        </div>
      </div>
    </div>
  );
}

/**
 * Tiny clipboard button shown alongside each chat bubble. Always rendered
 * but at low opacity until hover (desktop) / tap (mobile via group-focus).
 * Flips to a green check for ~1.5s after a successful copy.
 */
function CopyButton({
  copied,
  onClick,
  t,
}: {
  copied: boolean;
  onClick: () => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t(copied ? "chat.copied" : "chat.copy")}
      title={t(copied ? "chat.copied" : "chat.copy")}
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-md transition-opacity",
        // Visible at 40% on touch (no hover), full opacity on hover-capable devices.
        "opacity-40 hover:bg-muted hover:text-foreground group-hover:opacity-100",
        copied ? "text-emerald-500" : "text-muted-foreground"
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function IdeaChip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

/**
 * Shown when the seller hasn't added a key for any provider. Links straight
 * to Settings + the Help topic so they have a clear path forward.
 */
function NoProvidersEmptyState({ t }: { t: ReturnType<typeof useT> }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-amber-500/15 text-amber-500">
        <KeyRound className="size-5" />
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium">{t("chat.noProvider.title")}</div>
        <div className="max-w-md text-xs text-muted-foreground">
          {t("chat.noProvider.desc")}
        </div>
      </div>
      <ul className="grid w-full max-w-md grid-cols-1 gap-1.5 text-left text-xs text-muted-foreground sm:grid-cols-3">
        <li className="rounded-md border bg-card/60 px-2 py-1.5">
          <span className="font-medium text-foreground">Gemini</span> · {t("chat.noProvider.gemini")}
        </li>
        <li className="rounded-md border bg-card/60 px-2 py-1.5">
          <span className="font-medium text-foreground">OpenRouter</span> · {t("chat.noProvider.openrouter")}
        </li>
        <li className="rounded-md border bg-card/60 px-2 py-1.5">
          <span className="font-medium text-foreground">NVIDIA NIM</span> · {t("chat.noProvider.nvidia")}
        </li>
      </ul>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <a href="/settings#ai-keys" className={buttonVariants({ size: "sm" })}>
          {t("chat.noProvider.configureCta")}
          <ArrowRight className="size-3.5" />
        </a>
        <a
          href="/help?topic=ai-keys-overview"
          className={buttonVariants({ size: "sm", variant: "outline" })}
        >
          {t("chat.noProvider.helpCta")}
        </a>
      </div>
    </div>
  );
}
