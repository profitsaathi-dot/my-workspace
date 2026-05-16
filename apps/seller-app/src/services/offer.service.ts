import { apiClient } from "@/src/lib/http/client";
import { apiRoutes } from "@/src/config/api-routes";
import type { Offer } from "@/src/types/offer";

export const offerService = {
  byProduct(id: string | number): Promise<Offer[]> {
    return apiClient.get<Offer[]>(apiRoutes.offers.byProduct(id));
  },
};
