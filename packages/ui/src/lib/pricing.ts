export interface PricingInputs {
  costPrice: number;
  shippingCost: number;
  packagingCost: number;
  competitorPrice?: number;
}

export interface PricingResult {
  totalCost: number;
  breakEven: number;
  safePrice: number;
  aggressivePrice: number;
  premiumPrice: number;
  suggested: number;
  margin: { breakEven: number; safe: number; aggressive: number; premium: number };
  strategy: string;
  warning?: string;
}

export function calculatePricing(inputs: PricingInputs): PricingResult {
  const totalCost =
    Math.max(0, inputs.costPrice) +
    Math.max(0, inputs.shippingCost) +
    Math.max(0, inputs.packagingCost);

  const breakEven = totalCost;
  const aggressivePrice = totalCost * 1.2;
  const safePrice = totalCost * 1.3;
  const premiumPrice = totalCost * 1.5;

  const competitor = inputs.competitorPrice ?? 0;
  let suggested = safePrice;
  let strategy = "Use the safe price for steady, healthy margins.";
  let warning: string | undefined;

  if (competitor > 0) {
    if (competitor < breakEven) {
      suggested = breakEven;
      strategy =
        "Competitor is below your cost. Don't undercut — match break-even and compete on quality, packaging, or speed.";
      warning = "Competitor pricing is unsustainable for your cost base.";
    } else if (competitor < aggressivePrice) {
      suggested = Math.max(breakEven * 1.05, competitor - 5);
      strategy =
        "Competitor is aggressive. Stay 5–10 below them but never below break-even +5%.";
    } else if (competitor < safePrice) {
      suggested = aggressivePrice;
      strategy =
        "Use aggressive pricing to win volume — your margin is still positive.";
    } else if (competitor < premiumPrice) {
      suggested = safePrice;
      strategy =
        "You can sit at safe price and still feel cheaper than competitor.";
    } else {
      suggested = premiumPrice;
      strategy =
        "Competitor is premium-priced. Position as a quality alternative at premium tier.";
    }
  }

  const margin = (price: number) =>
    price > 0 ? ((price - totalCost) / price) * 100 : 0;

  return {
    totalCost,
    breakEven,
    safePrice,
    aggressivePrice,
    premiumPrice,
    suggested,
    margin: {
      breakEven: margin(breakEven),
      safe: margin(safePrice),
      aggressive: margin(aggressivePrice),
      premium: margin(premiumPrice),
    },
    strategy,
    warning,
  };
}

export interface ProfitInputs {
  totalSales: number;
  totalExpenses: number;
}

export interface ProfitResult {
  netProfit: number;
  margin: number;
  healthScore: number;
  rating: "Critical" | "Needs work" | "Healthy" | "Excellent";
  suggestions: string[];
}

export function calculateProfitHealth(inputs: ProfitInputs): ProfitResult {
  const sales = Math.max(0, inputs.totalSales);
  const expenses = Math.max(0, inputs.totalExpenses);
  const netProfit = sales - expenses;
  const margin = sales > 0 ? (netProfit / sales) * 100 : 0;

  // Health score: combines margin (0–60 pts) and revenue scale (0–40 pts)
  const marginPts = Math.max(0, Math.min(60, margin * 1.5));
  const scalePts = sales >= 100000 ? 40 : (sales / 100000) * 40;
  const healthScore = Math.round(marginPts + scalePts);

  let rating: ProfitResult["rating"] = "Critical";
  if (healthScore >= 80) rating = "Excellent";
  else if (healthScore >= 60) rating = "Healthy";
  else if (healthScore >= 40) rating = "Needs work";

  const suggestions: string[] = [];
  if (margin < 15)
    suggestions.push(
      "Margin is below 15% — review pricing on top sellers and cut a low-margin SKU."
    );
  if (margin >= 15 && margin < 25)
    suggestions.push(
      "Healthy margin. Try a 5% price test on your top 3 SKUs next month."
    );
  if (sales < 50000)
    suggestions.push(
      "Push monthly revenue past ₹50,000 — bundle 2 slow products with a hero item."
    );
  if (expenses > sales * 0.85)
    suggestions.push(
      "Expenses are eating 85%+ of sales. Audit packaging and shipping costs first."
    );
  if (suggestions.length === 0)
    suggestions.push("Strong month — consider running a festival promo for a 20% lift.");

  return { netProfit, margin, healthScore, rating, suggestions };
}
