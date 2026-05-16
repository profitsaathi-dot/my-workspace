/**
 * Dynamic-price listings — one-time public links with a seller-set price.
 * Authenticated owner endpoints + a no-auth public lookup for the customer
 * page under /(public)/dp/[token].
 */
import type { NextRequest } from "next/server";
import { apiClient } from "@/src/lib/http/client";
import { apiRoutes } from "@/src/config/api-routes";
import type {
  DynamicPriceCreateRequest,
  DynamicPriceListing,
} from "@/src/types/dynamicPrice";

export const dynamicPriceService = {
  create(
    req: NextRequest,
    body: DynamicPriceCreateRequest
  ): Promise<DynamicPriceListing> {
    return apiClient.post<DynamicPriceListing>(apiRoutes.dynamicPrices.base, body, {
      authFromRequest: req,
    });
  },

  mine(req: NextRequest): Promise<DynamicPriceListing[]> {
    return apiClient.get<DynamicPriceListing[]>(apiRoutes.dynamicPrices.mine, {
      authFromRequest: req,
    });
  },

  /** No auth — used by the public /dp/[token] page. */
  public(token: string): Promise<DynamicPriceListing> {
    return apiClient.get<DynamicPriceListing>(apiRoutes.dynamicPrices.public(token));
  },

  cancel(req: NextRequest, id: string | number): Promise<DynamicPriceListing> {
    return apiClient.post<DynamicPriceListing>(
      apiRoutes.dynamicPrices.cancel(id),
      undefined,
      { authFromRequest: req }
    );
  },
};
