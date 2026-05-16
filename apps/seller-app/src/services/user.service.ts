/**
 * Seller account service — wraps Spring's `/api/v1/seller` endpoints.
 *
 * Server-side only (uses the auth-aware HTTP client). Named `userService`
 * for backwards-compatibility with existing route handlers; the underlying
 * controller in Spring is `SellerController`.
 *
 * The seller row is provisioned atomically by `POST /api/v1/auth/signup/seller`,
 * so there is no longer a separate `create()` step here — the JWT principal's
 * `subjectId` already points at a valid `sellers` row by the time the user
 * lands on `/dashboard`.
 */
import type { NextRequest } from "next/server";
import { apiClient } from "@/src/lib/http/client";
import { apiRoutes } from "@/src/config/api-routes";
import type {
  AccentPreference,
  LanguagePreference,
  ThemePreference,
  User,
} from "@/src/types/user";

export interface PreferencesPatch {
  language?: LanguagePreference;
  theme?: ThemePreference;
  accent?: AccentPreference;
  weeklyReportOptIn?: boolean;
  monthlyReportOptIn?: boolean;
}

export const userService = {
  getMe(req: NextRequest): Promise<User> {
    return apiClient.get<User>(apiRoutes.seller.me, { authFromRequest: req });
  },

  /** Persists language/theme via Spring's PATCH /seller/preferences. */
  async updatePreferences(
    req: NextRequest,
    patch: PreferencesPatch
  ): Promise<User> {
    const res = await apiClient.fetch(apiRoutes.seller.preferences, {
      method: "PATCH",
      body: patch,
      authFromRequest: req,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Spring rejected preferences update (${res.status})`);
    }
    return (await res.json()) as User;
  },
};
