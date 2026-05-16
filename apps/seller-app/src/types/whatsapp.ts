export type WhatsAppStatus =
  | "DISCONNECTED"
  | "STARTING"
  | "SCAN_QR_CODE"
  | "WORKING"
  | "FAILED"
  | "STOPPED";

export interface WhatsAppSessionStatus {
  sessionName?: string;
  status: WhatsAppStatus;
  connected: boolean;
  phoneNumber?: string | null;
  pushName?: string | null;
  qrBase64?: string;
  qrMimetype?: string;
}

export interface SendWhatsAppMessageRequest {
  to: string;
  text: string;
}
