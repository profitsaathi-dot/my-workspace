export interface PriceAdviserRequest {
  costPrice: string;

  shippingCost: string;

  packagingCost: string;

  competitorPrice: string;

  productName: string;

  sellingmethoid: string;

  description: string;

  lat: number | null;
  lng: number | null;
}
export interface PriceAdviserResponse {

  totalCost: number;

  breakEven: number;

  aggressivePrice: number;

  safePrice: number;

  premiumPrice: number;

  margin: {
    breakEven: number;
    aggressive: number;
    safe: number;
    premium: number;
  };

  suggested: number;

  strategy: string;

  warning: string;

  orderId?: string;

  message?: string;

  // Base location
  location?: string;

  // AI market intelligence
  localMarket?: string;

  demandLevel?: string;

  festivalPotential?: string;

  competitorDensity?: string;

  locationSummary?: string;

  city?: string;

  state?: string;
}