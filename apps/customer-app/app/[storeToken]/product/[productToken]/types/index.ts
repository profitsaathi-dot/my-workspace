export interface Product {
  id: number;
  name: string;
  description?: string;
  status: string;
  costPrice: number;
  shippingCost: number;
  packagingCost: number;
  competitorPrice: number;
  sellingPrice: number;
  public_token?: string;
  mainImageUrl?: string;
  image?: string;
}

export interface Offer {
  offerId: string;
  name: string;
  icon: string;
  price: number;
  stockLimit: number;
  sold: number;
}

export interface PricingDetails {
  finalPrice: number;
  displayOriginalPrice: number;
  isDiscount: boolean;
  discountPercent: number;
  appliedOffer: Offer | null;
}