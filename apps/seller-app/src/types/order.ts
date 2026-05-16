export type OrderStatus = string;

export interface OrderItem {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface OrderCreateRequest {
  items: OrderItem[];
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: string;
  storeToken?: string;
}

export interface OrderProductRef {
  Id?: string;
  Name?: string;
  CostPrice?: number;
}

export interface OrderUserRef {
  Id?: string;
  Name?: string;
}

export interface Order {
  id: number;
  orderNo?: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  quantity: number;
  status: string;
  orderStatus: string;
  paymentStatus: string;
  comments?: string;
  unitPrice: number;
  costPrice: number;
  totalCost: number;
  profit: number;
  offerApplied?: boolean;
  publicToken?: string;
  createdAt: string;
  product?: OrderProductRef;
  user?: OrderUserRef;
  shippingVendor?: string | null;
  trackingId?: string | null;
}

export interface OrderListResponse {
  content: Order[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
}

export interface OrderListParams {
  page?: number;
  size?: number;
  status?: string;
  productId?: number | string;
  search?: string;
}

export interface OrderUpdate {
  customerName?: string;
  phoneNumber?: string;
  address?: string;
  comments?: string;
  orderStatus?: string;
  paymentStatus?: string;
  shippingVendor?: string;
  trackingId?: string;
}
