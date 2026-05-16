/**
 * Order service — owner orders go to /order/owner, guest orders to /order.
 */
import type { NextRequest } from "next/server";
import { apiClient } from "@/src/lib/http/client";
import { apiRoutes } from "@/src/config/api-routes";
import type {
  Order,
  OrderCreateRequest,
  OrderListParams,
  OrderListResponse,
  OrderUpdate,
} from "@/src/types/order";
import { getToken } from "next-auth/jwt";
import { env } from "@/src/config/env";

function buildListUrl(base: string, params: OrderListParams): string {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? 0));
  qs.set("size", String(params.size ?? 10));
  if (params.status) qs.set("status", params.status);
  if (params.productId !== undefined && params.productId !== "")
    qs.set("productId", String(params.productId));
  if (params.search) qs.set("search", params.search);
  return `${base}?${qs.toString()}`;
}

export const orderService = {
  async create(req: NextRequest, body: OrderCreateRequest): Promise<Order> {
    const jwt = await getToken({ req, secret: env.NEXTAUTH_SECRET });
    const isOwner = !!jwt?.accessToken;

    const path = isOwner ? apiRoutes.orders.createOwner : apiRoutes.orders.create;
    return apiClient.post<Order>(path, body, {
      authFromRequest: isOwner ? req : undefined,
    });
  },

  list(req: NextRequest, params: OrderListParams = {}): Promise<OrderListResponse> {
    return apiClient.get<OrderListResponse>(
      buildListUrl(apiRoutes.orders.list, params),
      { authFromRequest: req }
    );
  },

  byId(req: NextRequest, id: string | number): Promise<Order> {
    return apiClient.get<Order>(apiRoutes.orders.byId(id), {
      authFromRequest: req,
    });
  },

  async update(
    req: NextRequest,
    id: string | number,
    patch: OrderUpdate
  ): Promise<Order> {
    const res = await apiClient.fetch(apiRoutes.orders.update(id), {
      method: "PATCH",
      body: patch,
      authFromRequest: req,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Spring rejected order update (${res.status})`);
    }
    return (await res.json()) as Order;
  },
};
