"use client";

import PublicLayout from "../[storeToken]/components/PublicLayout";
import { SearchProvider } from "../[storeToken]/context/search-context";
import { StoreInfoProvider } from "../[storeToken]/context/store-info-context";

export default function PLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreInfoProvider>
      <SearchProvider>
        <PublicLayout>{children}</PublicLayout>
      </SearchProvider>
    </StoreInfoProvider>
  );
}