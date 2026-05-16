export interface PublicTracking {
  orderNo?: string;
  customerName?: string;
  orderStatus?: string;
  paymentStatus?: string;
  quantity?: number;
  createdAt?: string;
  shippingVendor?: string | null;
  trackingId?: string | null;
  trackingUrl?: string | null;
  product?: {
    id?: number;
    name?: string;
  };
  /** Customer-safe refund summary. Present only after a refund completes. */
  refund?: {
    refundId?: string | null;
    refundAmount?: number | null;
    refundedAt?: string | null;
    refundReason?: string | null;
    paymentType?: string | null;
    /** True when the seller uploaded a UPI/bank refund screenshot. */
    hasProof?: boolean;
  };
}
