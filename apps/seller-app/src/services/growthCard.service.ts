/**
 * Growth Adviser cards service — proxies the seller's card-driven flows
 * to Spring's {@code /api/v1/ai/growth-adviser/*}, forwarding their
 * NextAuth bearer.
 */
import type { NextRequest } from "next/server";
import { apiClient } from "@/src/lib/http/client";
import { apiRoutes } from "@/src/config/api-routes";
import type {
  GrowthCard,
  GrowthCardClientStatus,
  GrowthCardStatus,
  GrowthSyncResult,
  GrowthSyncStatus,
} from "@/src/types/growthCard";

export const growthCardService = {
  list(req: NextRequest, status: GrowthCardStatus = "ACTIVE"): Promise<GrowthCard[]> {
    return apiClient.get<GrowthCard[]>(
      `${apiRoutes.ai.growthAdviserCards}?status=${encodeURIComponent(status)}`,
      { authFromRequest: req }
    );
  },

  /** Manual sync — server enforces tier-aware cooldown and returns 429 inside. */
  async sync(req: NextRequest): Promise<{ ok: true; data: GrowthSyncResult } | { ok: false; status: number; body: unknown }> {
    const res = await apiClient.fetch(apiRoutes.ai.growthAdviserSync, {
      method: "POST",
      authFromRequest: req,
    });
    if (res.ok) {
      return { ok: true, data: (await res.json()) as GrowthSyncResult };
    }
    let body: unknown;
    try { body = await res.json(); } catch { body = undefined; }
    return { ok: false, status: res.status, body };
  },

  status(req: NextRequest): Promise<GrowthSyncStatus> {
    return apiClient.get<GrowthSyncStatus>(apiRoutes.ai.growthAdviserStatus, {
      authFromRequest: req,
    });
  },

  patch(req: NextRequest, id: number, status: GrowthCardClientStatus): Promise<GrowthCard> {
    return apiClient.fetch(apiRoutes.ai.growthAdviserCard(id), {
      method: "PATCH",
      authFromRequest: req,
      body: { status },
    }).then(async (r) => {
      if (!r.ok) throw new Error(`Patch failed: ${r.status}`);
      return r.json() as Promise<GrowthCard>;
    });
  },
};
