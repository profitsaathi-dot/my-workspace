export type ProductStatus = "ACTIVE" | "INACTIVE";

export interface Product {
  id: number;
  name: string;
  description?: string;
  status: ProductStatus;
  costPrice: number;
  shippingCost: number;
  packagingCost: number;
  competitorPrice: number;
  sellingPrice?: number;
  offerPrice?: number;
  publicToken?: string;
  imageCount?: number;
  mainImageIndex?: number;
}

export interface ProductCreateRequest {
  name: string;
  description?: string;
  status: ProductStatus;
  costPrice: number;
  shippingCost: number;
  packagingCost: number;
  competitorPrice: number;
  sellingPrice?: number;
}

export interface ProductSimple {
  id: number;
  name: string;
  sellingPrice: number;
  publicToken?: string;
  status?: ProductStatus;
  mainImageindex?: number;
}
