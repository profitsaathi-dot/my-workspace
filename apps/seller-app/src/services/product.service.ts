/**
 * Product service — wraps Spring product endpoints.
 * Mix of authenticated (owner) and public methods.
 */
import type { NextRequest } from "next/server";
import { apiClient } from "@/src/lib/http/client";
import { apiRoutes } from "@/src/config/api-routes";
import type { Product, ProductSimple } from "@/src/types/product";

export const productService = {
  byId(req: NextRequest, id: string | number): Promise<Product> {
    return apiClient.get<Product>(apiRoutes.products.byId(id), {
      authFromRequest: req,
    });
  },

  ownerSimple(req: NextRequest): Promise<ProductSimple[]> {
    return apiClient.get<ProductSimple[]>(apiRoutes.products.ownerSimple, {
      authFromRequest: req,
    });
  },

  /** All seller products (any status, including INACTIVE), newest first. */
  ownerAll(req: NextRequest): Promise<ProductSimple[]> {
    return apiClient.get<ProductSimple[]>(apiRoutes.products.ownerAll, {
      authFromRequest: req,
    });
  },

  /** Single public product by share token. Auth is forwarded if available. */
  public(req: NextRequest, token: string): Promise<Product> {
    return apiClient.get<Product>(apiRoutes.products.public(token), {
      authFromRequest: req,
    });
  },

  /** All public products for a seller's store (by store token). No auth. */
  publicByStore(token: string): Promise<Product[]> {
    return apiClient.get<Product[]>(apiRoutes.products.publicByStore(token));
  },

  /** Stream a product image. Returns the raw upstream response. */
  /** * Stream product media (Images or Videos). 
 * Returns the raw upstream response containing binary data and correct Content-Type.
 */
mediaStream(id: string | number, index: string | number): Promise<Response> {
  return apiClient.fetch(apiRoutes.products.image(id, index), {
    method: "GET",
  });
},

// Alias for backward compatibility if other parts of the app use .imageStream
imageStream(id: string | number, index: string | number): Promise<Response> {
  return this.mediaStream(id, index);
},

  /** Multipart create/update — caller passes a constructed FormData. */
  upsertMultipart(
    req: NextRequest,
    method: "POST" | "PUT",
    formData: FormData
  ): Promise<Response> {
    return apiClient.fetch(apiRoutes.products.base, {
      method,
      body: formData,
      authFromRequest: req,
    });
  },
};
