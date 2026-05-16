export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
}

export interface PaymentVerifyRequest {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  orderId: string | number;
  amount: number;
  token?: string;
}

export interface PaymentVerifyResponse {
  verified: boolean;
  paymentId?: string;
  orderId?: string;
  message?: string;
}

/** Buyer-uploaded payment record. Mirrors the Spring `Payment` entity. */
export interface PaymentRecord {
  id: number;
  orderId?: string | null;
  amount?: number | null;
  status?: string | null;
  paymentType?: "ONLINE" | "UPI_QR" | "BANK_ACCOUNT" | string | null;
  proofImageUrl?: string | null;
  createdAt?: string | null;
  refundId?: string | null;
  refundAmount?: number | null;
  refundProofUrl?: string | null;
  refundReason?: string | null;
  refundedAt?: string | null;
}

/**
 * Three-way response from POST /api/orders/{id}/refund:
 *  - noPayment: no payment row at all (or never collected) — cancel proceeds without refund
 *  - requiresProof: seller must upload a screenshot via /refund/proof
 *  - otherwise: Razorpay refund succeeded — refundId + refundAmount populated
 */
export interface RefundInitiateResponse {
  requiresProof?: boolean;
  noPayment?: boolean;
  alreadyRefunded?: boolean;
  paymentId?: number;
  paymentType?: string;
  amount?: number;
  refundId?: string;
  refundAmount?: number;
  status?: string;
  message?: string;
  refundedAt?: string;
}
