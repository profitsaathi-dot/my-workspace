"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Package, TrendingUp, LayoutGrid } from "lucide-react";
import { useSearch } from "../context/search-context";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { DynamicHero } from "./components/DynamicHero";
import ProductCard, { type Product } from "./components/ProductCard";

export default function HomeClient({
  products,
  storeToken,
}: {
  products: Product[];
  storeToken: string;
}) {
  const router = useRouter();
  const t = useTranslations("customer.home");
  const { search } = useSearch();
  const { data: session } = useSession();
  const productsRef = useRef<HTMLDivElement>(null);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Surface the first few items as "trending" — only when there's enough to
  // make a separate strip worthwhile and we're not in search mode.
  const trending = filteredProducts.slice(0, 5);
  const rest = filteredProducts.slice(5);
  const hasTrending = !search.trim() && trending.length >= 3;

  // What goes in the "All products" section. If trending consumed everything,
  // there's nothing left to show in the second section.
  const allItems = hasTrending ? rest : filteredProducts;
  const showAllSection = allItems.length > 0 || filteredProducts.length === 0;

  const scrollToProducts = () => {
    productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex-1 pb-12">
      <div className="mx-auto max-w-7xl space-y-6 p-4">
        {/* Dynamic rotating offers */}
        <DynamicHero onCta={scrollToProducts} />

        {/* Products area — wraps both trending and all-products so the hero
            CTA can scroll into view regardless of which section renders. */}
        <div ref={productsRef} className="space-y-6 scroll-mt-20">
          {hasTrending && (
            <section className="space-y-3">
              <SectionHeader
                icon={<TrendingUp className="size-4" />}
                title={t("sectionTrending")}
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {trending.map((p) => (
                  <ProductCard key={p.id} product={p} storeToken={storeToken} />
                ))}
              </div>
            </section>
          )}

          {showAllSection && (
            <section className="space-y-3">
              {allItems.length > 0 && (
                <SectionHeader
                  icon={<LayoutGrid className="size-4" />}
                  title={t("sectionAll")}
                  count={allItems.length}
                />
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {allItems.map((p) => (
                  <ProductCard key={p.id} product={p} storeToken={storeToken} />
                ))}

                {filteredProducts.length === 0 && (
                  <div className="text-center col-span-full text-muted-foreground py-16">
                    <Package className="mx-auto size-10 opacity-40 mb-2" />
                    {t("noProducts")}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="grid size-7 place-items-center rounded-md bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
          {icon}
        </div>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      </div>
      {typeof count === "number" && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </div>
  );
}
