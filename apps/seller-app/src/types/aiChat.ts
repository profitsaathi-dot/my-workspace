/**
 * Wire shape for the seller-facing AI chat. Mirrors
 * {@code com.profitsaathi.seller.aichat.AiChatDtos} on the Spring side.
 */

export const AI_PROVIDERS = ["GEMINI", "OPENROUTER", "NVIDIA"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export interface AiChatProviderStatus {
  geminiKeySet: boolean;
  openrouterKeySet: boolean;
  nvidiaKeySet: boolean;
  /** Provider the router tries first. Null if seller hasn't picked yet. */
  primaryProvider: AiProvider | null;
  /** Names of providers that have keys on file, in display order. */
  configured: AiProvider[];
}

/**
 * Image-gen provider tag returned by the backend. Only NVIDIA and Gemini
 * back image generation today — OpenRouter is omitted from the image-gen
 * chain (unreliable free tier) and Pollinations was dropped after it moved
 * to a paid Pollen-credits model in 2026.
 */
export type ImageGenProviderUsed = Extract<AiProvider, "GEMINI" | "NVIDIA">;

export interface AiChatSendRequest {
  /** Omit to start a new session. */
  sessionId?: number | null;
  message: string;
  /** Raw base64, no `data:` prefix. */
  imageBase64?: string | null;
  imageMime?: string | null;
}

export interface AiChatSendResponse {
  sessionId: number;
  reply: string;
  /** Which provider actually answered. Useful when fallback kicked in. */
  providerUsed: AiProvider;
}

export interface AiChatSessionSummary {
  id: number;
  title: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export type AiChatRole = "USER" | "ASSISTANT";

export interface AiChatMessageView {
  id: number;
  role: AiChatRole;
  content: string;
  hasImage: boolean;
  /** Non-null on Saathi-generated assistant turns; fetch via `/api/ai/chat/image/<id>`. */
  imagePath?: string | null;
  imageMime?: string | null;
  imageProvider?: ImageGenProviderUsed | null;
  /**
   * Provider that produced this assistant text turn. Null on user turns and
   * on old rows from before the backend column existed. Surfaced as a tiny
   * "via X" line below the bubble.
   */
  chatProvider?: AiProvider | null;
  createdAt: string;
}

export interface AiChatSessionDetail {
  session: AiChatSessionSummary;
  messages: AiChatMessageView[];
}

export interface AiGenerateImageRequest {
  /** Omit to start a new session for this image. */
  sessionId?: number | null;
  prompt: string;
  /**
   * Optional source image — when set, the request is treated as an edit
   * (image-to-image) instead of a fresh text-to-image generation.
   */
  imageBase64?: string | null;
  imageMime?: string | null;
}

export interface AiGenerateImageResponse {
  sessionId: number;
  /** Id of the newly-saved assistant message; the rendered URL is `/api/ai/chat/image/<messageId>`. */
  messageId: number;
  providerUsed: ImageGenProviderUsed;
  mimeType: string;
}
