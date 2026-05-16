/**
 * AI chat service — proxies Spring's `/api/v1/ai/chat/*` endpoints,
 * forwarding the seller's NextAuth bearer.
 *
 * Server-side only (uses the auth-aware HTTP client). The browser hits
 * `/api/ai/chat/*` route handlers which delegate here.
 */
import type { NextRequest } from "next/server";
import { apiClient } from "@/src/lib/http/client";
import { apiRoutes } from "@/src/config/api-routes";
import type {
  AiChatProviderStatus,
  AiChatSendRequest,
  AiChatSendResponse,
  AiChatSessionDetail,
  AiChatSessionSummary,
  AiGenerateImageRequest,
  AiGenerateImageResponse,
  AiProvider,
} from "@/src/types/aiChat";

export const aiChatService = {
  /** Send a turn. Returns `{ ok: false, status, body }` on 4xx/5xx so callers can render quota/no-provider/upstream errors. */
  async send(
    req: NextRequest,
    body: AiChatSendRequest
  ): Promise<{ ok: true; data: AiChatSendResponse } | { ok: false; status: number; body: unknown }> {
    const res = await apiClient.fetch(apiRoutes.ai.chat.send, {
      method: "POST",
      authFromRequest: req,
      body,
    });
    if (res.ok) return { ok: true, data: (await res.json()) as AiChatSendResponse };
    let upstream: unknown;
    try { upstream = await res.json(); } catch { upstream = undefined; }
    return { ok: false, status: res.status, body: upstream };
  },

  listSessions(req: NextRequest): Promise<AiChatSessionSummary[]> {
    return apiClient.get<AiChatSessionSummary[]>(apiRoutes.ai.chat.sessions, {
      authFromRequest: req,
    });
  },

  getSession(req: NextRequest, id: number): Promise<AiChatSessionDetail> {
    return apiClient.get<AiChatSessionDetail>(apiRoutes.ai.chat.session(id), {
      authFromRequest: req,
    });
  },

  async deleteSession(req: NextRequest, id: number): Promise<void> {
    const res = await apiClient.fetch(apiRoutes.ai.chat.session(id), {
      method: "DELETE",
      authFromRequest: req,
    });
    if (!res.ok) throw new Error(`Delete session failed: ${res.status}`);
  },

  /** Snapshot of which provider keys are on file + which is primary. */
  providers(req: NextRequest): Promise<AiChatProviderStatus> {
    return apiClient.get<AiChatProviderStatus>(apiRoutes.ai.chat.providers, {
      authFromRequest: req,
    });
  },

  /**
   * Save (or clear) the key for one provider. Pass an empty string to clear.
   * Returns the refreshed provider status so the UI can reconcile in one round trip.
   */
  async saveProviderKey(
    req: NextRequest,
    provider: AiProvider,
    apiKey: string
  ): Promise<AiChatProviderStatus> {
    const res = await apiClient.fetch(apiRoutes.ai.chat.providersKey, {
      method: "PUT",
      authFromRequest: req,
      body: { provider, apiKey },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Failed to save key (${res.status})`);
    }
    return (await res.json()) as AiChatProviderStatus;
  },

  async setPrimaryProvider(
    req: NextRequest,
    provider: AiProvider
  ): Promise<AiChatProviderStatus> {
    const res = await apiClient.fetch(apiRoutes.ai.chat.providersPrimary, {
      method: "PUT",
      authFromRequest: req,
      body: { provider },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Failed to set primary (${res.status})`);
    }
    return (await res.json()) as AiChatProviderStatus;
  },

  /**
   * Generate an image. Same shape as `send`: `{ ok }` discriminated for
   * 429 (quota), 502 (all providers failed) and other 4xx so the UI can
   * render targeted messaging.
   */
  async generateImage(
    req: NextRequest,
    body: AiGenerateImageRequest
  ): Promise<{ ok: true; data: AiGenerateImageResponse } | { ok: false; status: number; body: unknown }> {
    const res = await apiClient.fetch(apiRoutes.ai.chat.image, {
      method: "POST",
      authFromRequest: req,
      body,
    });
    if (res.ok) return { ok: true, data: (await res.json()) as AiGenerateImageResponse };
    let upstream: unknown;
    try { upstream = await res.json(); } catch { upstream = undefined; }
    return { ok: false, status: res.status, body: upstream };
  },

  /** Streams a stored image's bytes — caller forwards `Content-Type` from upstream. */
  fetchImage(req: NextRequest, messageId: number): Promise<Response> {
    return apiClient.fetch(apiRoutes.ai.chat.imageById(messageId), {
      method: "GET",
      authFromRequest: req,
    });
  },
};
