export type DynamicPriceStatus = "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";

export interface DynamicPriceProductRef {
  id: number;
  name: string;
  description?: string;
  mainImageUrl?: string | null;
  imageCount?: number;
  mainImageIndex?: number;
}

export interface DynamicPriceListing {
  id?: number;
  publicToken: string;
  price: number;
  customerName?: string | null;
  note?: string | null;
  status: DynamicPriceStatus;
  expiresAt: string;
  createdAt?: string;
  usedAt?: string | null;
  product?: DynamicPriceProductRef;
}

export interface DynamicPriceCreateRequest {
  productId: number;
  price: number;
  customerName?: string;
  note?: string;
  expiryHours?: number;
}
