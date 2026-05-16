/**
 * Payment service — Razorpay order creation + Spring-side verification.
 */
import type { NextRequest } from "next/server";
import { apiClient } from "@/src/lib/http/client";
import { apiRoutes } from "@/src/config/api-routes";
import { createServerClient } from "@/src/lib/payments/razorpay";
import type {
  PaymentRecord,
  PaymentVerifyRequest,
  PaymentVerifyResponse,
  RazorpayOrder,
  RefundInitiateResponse,
} from "@/src/types/payment";

export const paymentService = {
  async createRazorpayOrder(amountInRupees: number): Promise<RazorpayOrder> {
    const client = createServerClient();
    const order = await client.orders.create({
      amount: Math.round(amountInRupees * 100), // paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });
    return order as RazorpayOrder;
  },

  verify(body: PaymentVerifyRequest): Promise<PaymentVerifyResponse> {
    const { token, ...rest } = body;
    return apiClient.post<PaymentVerifyResponse>(
      apiRoutes.payments.verify,
      {
        razorpayPaymentId: rest.razorpay_payment_id,
        razorpayOrderId: rest.razorpay_order_id,
        razorpaySignature: rest.razorpay_signature,
        orderId: rest.orderId,
        amount: rest.amount,
      },
      { bearerToken: token }
    );
  },

  qrStream(amount: string | number): Promise<Response> {
    return apiClient.fetch(apiRoutes.payments.qr(amount), { method: "GET" });
  },

  byOrderId(req: NextRequest, orderId: string | number): Promise<PaymentRecord> {
    return apiClient.get<PaymentRecord>(apiRoutes.payments.byOrderId(orderId), {
      authFromRequest: req,
    });
  },

  /**
   * Kick off a refund for the order's latest payment. Server decides path:
   *   - ONLINE                  → calls Razorpay refund (returns refundId)
   *   - UPI_QR / BANK_ACCOUNT   → returns requiresProof=true (caller uploads)
   *   - no payment / not paid   → returns noPayment=true (caller just cancels)
   */
  async refund(
    req: NextRequest,
    orderId: string | number,
    body: { amount?: number; reason?: string; finalOrderStatus?: string }
  ): Promise<RefundInitiateResponse> {
    const res = await apiClient.fetch(apiRoutes.payments.refund(orderId), {
      method: "POST",
      body: body as object,
      authFromRequest: req,
      raw: true,
    });
    // Read once as text so non-JSON error pages (nginx, Spring whitelabel)
    // still surface in the error message instead of disappearing.
    const text = await res.text();
    let json: RefundInitiateResponse = {};
    try {
      json = text ? (JSON.parse(text) as RefundInitiateResponse) : {};
    } catch {
      json = {};
    }
    if (!res.ok && !(res.status === 409 && json.alreadyRefunded)) {
      throw new Error(
        json.message ?? text?.slice(0, 300) ?? `Refund failed (${res.status})`
      );
    }
    return { ...json, status: json.status ?? String(res.status) };
  },

  /**
   * Upload the seller's refund-proof screenshot for a UPI/bank refund. The
   * Spring endpoint marks the payment REFUNDED and the order CANCELLED.
   */
  async uploadRefundProof(
    req: NextRequest,
    orderId: string | number,
    form: FormData
  ): Promise<RefundInitiateResponse> {
    const res = await apiClient.fetch(apiRoutes.payments.refundProof(orderId), {
      method: "POST",
      body: form,
      authFromRequest: req,
      raw: true,
    });
    const text = await res.text();
    let json: RefundInitiateResponse = {};
    try {
      json = text ? (JSON.parse(text) as RefundInitiateResponse) : {};
    } catch {
      json = {};
    }
    if (!res.ok) {
      throw new Error(
        json.message ?? text?.slice(0, 300) ?? `Refund proof upload failed (${res.status})`
      );
    }
    return json;
  },
};
