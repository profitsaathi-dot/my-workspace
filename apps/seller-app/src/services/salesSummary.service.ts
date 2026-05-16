/**
 * Sales summary service — proxies the seller's aggregate dashboard totals
 * from Spring's {@code /api/v1/sales-summary/dashboard}.
 */
import type { NextRequest } from "next/server";
import { apiClient } from "@/src/lib/http/client";
import { apiRoutes } from "@/src/config/api-routes";
import type { SalesSummaryDashboard } from "@/src/types/salesSummary";

export const salesSummaryService = {
  dashboard(req: NextRequest): Promise<SalesSummaryDashboard> {
    return apiClient.get<SalesSummaryDashboard>(apiRoutes.salesSummary.dashboard, {
      authFromRequest: req,
    });
  },
};
