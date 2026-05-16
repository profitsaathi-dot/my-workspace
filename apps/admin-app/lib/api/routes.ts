/**
 * Single source of truth for Spring backend route paths.
 * All services build URLs from these — never inline the path elsewhere.
 *
 * 
 * `*` to the Spring monolith on port 9097. Inside the monolith
 * the controllers are mounted at `/api/v1/...` directly.
 */
export const apiRoutes = {
  auth: {
    login: "/api/v1/auth/login",
    logout: "/api/v1/auth/logout",
  },
  admin: {
    me: "/api/v1/admin/me",
    preferences: "/api/v1/admin/preferences",
    sellers: "/api/v1/admin/sellers",
    sellerById: (id: string | number) => `/api/v1/admin/sellers/${id}`,
    sellerReport: (id: string | number) => `/api/v1/admin/sellers/${id}/report`,
    signupSeller: "/api/v1/auth/signup/seller",
    customers: "/api/v1/admin/customers",
    customerById: (id: string | number) => `/api/v1/admin/customers/${id}`,
    admins: "/api/v1/admin/admins",
    adminById: (id: string | number) => `/api/v1/admin/admins/${id}`,
    statsUsers: "/api/v1/admin/stats/users",
    statsDashboard: "/api/v1/admin/stats/dashboard",
    whatsappStatus: "/api/v1/admin/whatsapp/status",
    aiLogs: "/api/v1/ai/admin/logs",
    aiUsage: "/api/v1/ai/admin/usage",
  },
  system: {
    metrics: "/api/v1/system/metrics",
    health: "/api/v1/system/health",
  },
} as const;
