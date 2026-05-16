export interface Offer {
  id: number;
  productId: number;
  title: string;
  description?: string;
  discountPercent?: number;
  validFrom?: string;
  validTo?: string;
}
