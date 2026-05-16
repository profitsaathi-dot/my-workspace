/**
 * Single source of truth for Spring backend route paths.
 * All services build URLs from these — never inline the path elsewhere.
 *

 * `/*` to the Spring monolith on port 9097. Inside the monolith
 * the controllers are mounted at `/api/v1/...` directly.
 */
export const apiRoutes = {
  auth: {
    login: "/api/v1/auth/login",
    signupSeller: "/api/v1/auth/signup/seller",
    refresh: "/api/v1/auth/refresh",
    logout: "/api/v1/auth/logout",
    me: "/api/v1/auth/me",
  },
  seller: {
    me: "/api/v1/seller/me",
    onboard: "/api/v1/seller/onboard",
    preferences: "/api/v1/seller/preferences",
    payment: "/api/v1/seller/payment",
    paymentQr: "/api/v1/seller/payment/qr",
  },
  products: {
    base: "/api/v1/products",
    byId: (id: string | number) => `/api/v1/products/id/${id}`,
    image: (id: string | number, index: number | string) =>
      `/api/v1/products/${id}/image?index=${index}`,
    ownerSimple: "/api/v1/products/user/simple",
    ownerAll: "/api/v1/products/user/all",
    public: (token: string) =>
      `/api/v1/products/public?token=${encodeURIComponent(token)}`,
    publicByStore: (token: string) =>
      `/api/v1/products/user/public-products?token=${encodeURIComponent(token)}`,
  },
  orders: {
    create: "/api/v1/order",
    createOwner: "/api/v1/order/owner",
    list: "/api/v1/order",
    byId: (id: string | number) => `/api/v1/order/${id}`,
    update: (id: string | number) => `/api/v1/order/${id}`,
    publicTrack: (token: string) =>
      `/api/v1/order/track/${encodeURIComponent(token)}`,
  },
  salesSummary: {
    // Spring aggregates persisted SalesSummary rows. Returns zeros until the
    // monthly summary cron/admin has populated rows for the seller.
    dashboard: "/api/v1/sales-summary/dashboard",
  },
  shippingVendors: {
    base: "/api/v1/shipping-vendors",
    byCode: (code: string) =>
      `/api/v1/shipping-vendors/${encodeURIComponent(code)}`,
    resolveUrl: (code: string, trackingId: string) =>
      `/api/v1/shipping-vendors/${encodeURIComponent(code)}/url?trackingId=${encodeURIComponent(trackingId)}`,
  },
  payments: {
    verify: "/api/v1/payment/verify",
    qr: (amount: number | string) =>
      `/api/v1/payment/qr?amount=${encodeURIComponent(String(amount))}`,
    byOrderId: (orderId: string | number) =>
      `/api/v1/payment/order-id/${orderId}`,
    refund: (orderId: string | number) =>
      `/api/v1/payment/order/${orderId}/refund`,
    refundProof: (orderId: string | number) =>
      `/api/v1/payment/order/${orderId}/refund/proof`,
  },
  offers: {
    byProduct: (id: string | number) => `/api/v1/offers/product/${id}`,
  },
  dynamicPrices: {
    base: "/api/v1/dynamic-prices",
    mine: "/api/v1/dynamic-prices/mine",
    public: (token: string) =>
      `/api/v1/dynamic-prices/public?token=${encodeURIComponent(token)}`,
    cancel: (id: string | number) => `/api/v1/dynamic-prices/${id}/cancel`,
  },
  whatsapp: {
    connect: "/api/v1/whatsapp/connect",
    status: "/api/v1/whatsapp/status",
    disconnect: "/api/v1/whatsapp/disconnect",
    restart: "/api/v1/whatsapp/restart",
    send: "/api/v1/whatsapp/send",
  },
  otp: {
    sendEmail: "/api/v1/otp/send/email",
    verifyEmail: "/api/v1/otp/verify/email",
    sendWhatsapp: "/api/v1/otp/send/whatsapp",
    verifyWhatsapp: "/api/v1/otp/verify/whatsapp",
  },
  ai: {
    growthAdviserCards: "/api/v1/ai/growth-adviser/cards",
    growthAdviserCard: (id: string | number) =>
      `/api/v1/ai/growth-adviser/cards/${id}`,
    growthAdviserSync: "/api/v1/ai/growth-adviser/sync",
    growthAdviserStatus: "/api/v1/ai/growth-adviser/status",
    priceAdviserSync:"/api/v1/ai/price-adviser/sync",
    // Saathi AI lives at /api/v1/ai/saathi to avoid colliding with the
    // monolith's older /api/v1/ai/chat gateway endpoint.
    chat: {
      send: "/api/v1/ai/saathi",
      sessions: "/api/v1/ai/saathi/sessions",
      session: (id: string | number) => `/api/v1/ai/saathi/sessions/${id}`,
      providers: "/api/v1/ai/saathi/providers",
      providersKey: "/api/v1/ai/saathi/providers/key",
      providersPrimary: "/api/v1/ai/saathi/providers/primary",
      image: "/api/v1/ai/saathi/image",
      imageById: (id: string | number) => `/api/v1/ai/saathi/image/${id}`,
    },
  },
} as const;
