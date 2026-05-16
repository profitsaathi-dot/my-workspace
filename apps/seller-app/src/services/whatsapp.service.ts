/**
 * WhatsApp/WAHA service — proxies seller's session lifecycle to Spring,
 * which in turn talks to the WAHA HTTP API.
 */
import type { NextRequest } from "next/server";
import { apiClient } from "@/src/lib/http/client";
import { apiRoutes } from "@/src/config/api-routes";
import type {
  SendWhatsAppMessageRequest,
  WhatsAppSessionStatus,
} from "@/src/types/whatsapp";

export const whatsAppService = {
  connect(req: NextRequest): Promise<WhatsAppSessionStatus> {
    return apiClient.post<WhatsAppSessionStatus>(apiRoutes.whatsapp.connect, undefined, {
      authFromRequest: req,
    });
  },

  status(req: NextRequest): Promise<WhatsAppSessionStatus> {
    return apiClient.get<WhatsAppSessionStatus>(apiRoutes.whatsapp.status, {
      authFromRequest: req,
    });
  },

  disconnect(req: NextRequest): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(apiRoutes.whatsapp.disconnect, undefined, {
      authFromRequest: req,
    });
  },

  restart(req: NextRequest): Promise<WhatsAppSessionStatus> {
    return apiClient.post<WhatsAppSessionStatus>(apiRoutes.whatsapp.restart, undefined, {
      authFromRequest: req,
    });
  },

  send(req: NextRequest, body: SendWhatsAppMessageRequest): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(apiRoutes.whatsapp.send, body, {
      authFromRequest: req,
    });
  },
};
