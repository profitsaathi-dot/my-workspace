/**
 * Wire types for the Growth Adviser card surface. Mirrors
 * {@code GrowthCardDto}, {@code SyncResult} and {@code SyncStatus} on the
 * Spring side — keep both in sync.
 */
export type GrowthCardType =
  | "PRICING"
  | "INVENTORY"
  | "MARKETING"
  | "CRM"
  | "FESTIVAL"
  | "FINANCE"
  | "OPERATIONS";

export type GrowthCardPriority = "HIGH" | "MEDIUM" | "LOW";

export type GrowthCardStatus =
  | "ACTIVE"
  | "READ"
  | "DONE"
  | "DISMISSED"
  | "STALE";

export interface GrowthCard {
  id: number;
  type: GrowthCardType;
  title: string;
  description: string;
  priority: GrowthCardPriority;
  impact?: string | null;
  cta?: string | null;
  actionUrl?: string | null;
  confidenceScore?: number | null;
  status: GrowthCardStatus;
  syncRunAt: string;
  createdAt: string;
}

/** Server response from POST /sync. */
export interface GrowthSyncResult {
  cardsGenerated: number;
  premium: boolean;
  model: string;
  syncedAt: string;
  syncsToday: number;
}

/** Server response from GET /status. */
export interface GrowthSyncStatus {
  lastSyncAt: string | null;
  lastSource: string | null;
  syncsToday: number;
  cooldownSecondsRemaining: number;
  cooldownHours: number;
}

export type GrowthCardClientStatus = "READ" | "DONE" | "DISMISSED";
