"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type StoreInfo = {
  sellerType: string | null;
  paymentType: string | null;
  storeName: string | null;
};

type StoreInfoContextType = {
  info: StoreInfo | null;
  isSocial: boolean;
  loading: boolean;
};

const StoreInfoContext = createContext<StoreInfoContextType | null>(null);

export function StoreInfoProvider({ children }: { children: React.ReactNode }) {
  const { storeToken } = useParams<{ storeToken: string }>();
  const [info, setInfo] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Conservative whitelist — store tokens are slugs/UUIDs, never URL chars.
    // Skip the lookup for anything outside that shape so a tampered URL
    // can't drive arbitrary downstream requests.
    const safeToken =
      storeToken && /^[a-zA-Z0-9_-]+$/.test(storeToken) ? storeToken : null;
    if (!safeToken) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(`/user/api/store/info?token=${encodeURIComponent(safeToken)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setInfo({
          sellerType: data?.sellerType ?? null,
          paymentType: data?.paymentType ?? null,
          storeName: data?.storeName ?? data?.name ?? null,
        });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storeToken]);

  const isSocial = (info?.sellerType ?? "").toLowerCase() === "social";

  return (
    <StoreInfoContext.Provider value={{ info, isSocial, loading }}>
      {children}
    </StoreInfoContext.Provider>
  );
}

export function useStoreInfo() {
  const ctx = useContext(StoreInfoContext);
  if (!ctx) {
    throw new Error("useStoreInfo must be used inside StoreInfoProvider");
  }
  return ctx;
}
