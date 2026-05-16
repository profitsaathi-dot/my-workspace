import { Product, Offer } from "../types"; // Create a types file or keep in components

export const calculatePricing = (selectedProduct: Product | null, festivalOffer: Offer | null) => {
  const costPrice = selectedProduct?.costPrice ?? 0;
  const sellerCurrentPrice = selectedProduct?.sellingPrice ?? costPrice;
  const festivalOfferPrice = festivalOffer?.price ?? 0;

  let displayOriginalPrice = sellerCurrentPrice;
  let finalPrice = sellerCurrentPrice;
  let appliedOffer: Offer | null = null;

  if (festivalOfferPrice > 0 && festivalOfferPrice < sellerCurrentPrice) {
    finalPrice = festivalOfferPrice;
    appliedOffer = festivalOffer;
    displayOriginalPrice = sellerCurrentPrice;
  } else if (sellerCurrentPrice < costPrice) {
    finalPrice = sellerCurrentPrice;
    displayOriginalPrice = costPrice;
  } else {
    finalPrice = sellerCurrentPrice;
    displayOriginalPrice = costPrice;
  }

  const isDiscount = finalPrice < displayOriginalPrice;
  const discountPercent = isDiscount && displayOriginalPrice > 0
      ? ((displayOriginalPrice - finalPrice) / displayOriginalPrice) * 100
      : 0;

  return { finalPrice, displayOriginalPrice, isDiscount, discountPercent, appliedOffer };
};