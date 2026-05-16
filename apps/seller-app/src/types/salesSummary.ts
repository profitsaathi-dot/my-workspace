/**
 * Wire type for Spring's {@code DashboardSummaryDTO}. Note: the backend
 * aggregates from persisted {@code SalesSummary} rows; if no monthly cron
 * has populated them, every field comes back as zero.
 */
export interface SalesSummaryDashboard {
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  totalProducts: number;
}
