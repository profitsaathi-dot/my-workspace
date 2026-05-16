import { useState, useEffect } from "react";
import { Product, Offer } from "../types";

export const useProduct = (productToken: string, isCheckingAuth: boolean) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [festivalOffer, setFestivalOffer] = useState<Offer | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);

  useEffect(() => {
    // Don't fetch product until auth check is done (matches your original logic)
    if (isCheckingAuth || !productToken) return;

    const fetchProductData = async () => {
      try {
        // 1. Fetch Product
        const res = await fetch(`/user/api/products/public?token=${productToken}`);
        if (!res.ok) throw new Error("Product fetch failed");
        const data: Product = await res.json();
        setProduct(data);

        // 2. Fetch Offers
        try {
          const offerRes = await fetch(`/user/api/offers/product?id=${data.id}`);
          if (offerRes.ok) {
            const offerData = await offerRes.json();
            const validOffer = Array.isArray(offerData) 
              ? offerData.find((o: Offer) => o.stockLimit - o.sold > 0) 
              : offerData;
            
            if (validOffer && validOffer.stockLimit - validOffer.sold > 0) {
              setFestivalOffer(validOffer);
            }
          }
        } catch (e) {
          // Offer fetch failed, silently ignore
        }
      } catch (err) {
        console.error(err);
        setProduct(null);
      } finally {
        setLoadingProduct(false);
      }
    };

    fetchProductData();
  }, [productToken, isCheckingAuth]);

  return { product, festivalOffer, loadingProduct };
};