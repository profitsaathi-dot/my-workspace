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
  customerUrl?: string; // Customer-facing URL path (e.g., /annu_store/dynamic/dp_xxx)
  shareableLink?: string; // Alias for customerUrl
}

export interface DynamicPriceCreateRequest {
  productId: number;
  price: number;
  customerName?: string;
  note?: string;
  expiryHours?: number;
}
