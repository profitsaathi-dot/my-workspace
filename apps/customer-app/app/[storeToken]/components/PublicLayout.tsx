"use client";

import React, { useCallback } from "react";
import { useAuth } from "@/app/lib/useAuth";
import { useSearch } from "../context/search-context";
import { useStoreInfo } from "../context/store-info-context";
import { signOut, useSession } from "next-auth/react";
import ThemeLayout from "./ThemeLayout";
import {
  Search,
  ShoppingCart,
  FileText,
  Settings,
  LayoutDashboard,
  LogOut,
  User,
  Moon,
  Sun,
  Truck,
} from "lucide-react";
import { useRouter, useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/app/lib/LanguageSwitcher";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { storeToken } = useParams<{ storeToken: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const isProductPage = pathname.includes("/product/") && pathname.split("/").length >= 4;
  // Checkout has a sticky review/pay bar that takes the buyer through a
  // confirmation flow — collapsing the nav avoids two stacked bars there.
  // Cart keeps the nav visible (its own pay bar sits above it on mobile).
  const hideBottomNav =
    pathname.endsWith("/checkout") || pathname.endsWith("/login");

  const { search, setSearch } = useSearch();
  const { data: session } = useSession();

  const { isRegisteredUser, userData } = useAuth();
  const { info: storeInfo, isSocial } = useStoreInfo();

  // Prefer the store name returned by /api/v1/store/info; fall back to
  // a tidied-up URL slug only while the request is in flight.
  const fallbackName = storeToken
    ? storeToken.charAt(0).toUpperCase() + storeToken.slice(1)
    : "";
  const shopName = storeInfo?.storeName?.trim() || fallbackName;
  const t = useTranslations("customer.nav");

  const base = `/${storeToken}`;

  const isLoggedIn = !!session || isRegisteredUser;

  // Social-seller stores skip cart + order history — they're discovery-only
  // surfaces driven from a single product link, so those tabs would dead-end.
  const menuItems = [
    { icon: <LayoutDashboard className="size-[18px]" />, label: t("home"), href: `${base}/store` },
    ...(isSocial
      ? []
      : [
          { icon: <ShoppingCart className="size-[18px]" />, label: t("cart"), href: `${base}/cart` },
          { icon: <FileText className="size-[18px]" />, label: t("myOrders"), href: `${base}/orders` },
        ]),
    { icon: <Truck className="size-[18px]" />, label: t("track"), href: `${base}/track` },
    { icon: <Settings className="size-[18px]" />, label: t("settings"), href: `${base}/settings` },
  ];

  const handleLogout = useCallback(async () => {
    // /user/api/auth/logout invalidates the refresh token on the backend,
    // clears NextAuth's session cookie, and redirects to "/".
    await signOut({ redirect: false });
    window.location.href = "/user/api/auth/logout";
  }, []);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    router.push(`/${storeToken}/login`);
  };

  return (
    <ThemeLayout>
      {({ darkMode, setDarkMode }: any) => (
        <div className="h-[100dvh] overflow-hidden bg-background text-foreground flex">
          {/* DESKTOP SIDEBAR — always-visible at xl+, hidden below */}
          <aside
            className="hidden xl:flex xl:relative xl:w-72 xl:shrink-0
                       bg-card text-foreground border-r border-themed"
          >
            <div className="h-full w-full flex flex-col safe-pt">
              {/* HEADER */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-themed">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-[color:var(--accent)] text-[color:var(--accent-foreground)] flex items-center justify-center font-semibold shadow-sm">
                    {isLoggedIn && userData?.name ? userData.name.charAt(0).toUpperCase() : shopName?.charAt(0) || "S"}
                  </div>

                  <div className="leading-tight min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {isLoggedIn && userData?.name ? t("welcomeBack") : t("welcomeTo")}
                    </p>
                    <p className="text-sm font-semibold text-foreground truncate max-w-[140px]">
                      {isLoggedIn && userData?.name ? userData.name : `${shopName} ${t("platformSuffix")}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* MENU */}
              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                  const active = pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg
                        transition-all duration-150
                        ${
                          active
                            ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)] font-medium ring-1 ring-[color:var(--accent)]/20"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }
                      `}
                    >
                      {item.icon}
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* FOOTER */}
              <div className="p-3 border-t border-themed space-y-2">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
                >
                  {darkMode ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
                  <span className="text-sm">{darkMode ? t("lightMode") : t("darkMode")}</span>
                </button>

                {isSocial ? null : isLoggedIn ? (
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-500/10 transition"
                    onClick={handleLogout}
                  >
                    <LogOut className="size-[18px]" />
                    <span className="text-sm">{t("logout")}</span>
                  </button>
                ) : (
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] transition"
                    onClick={handleLogin}
                  >
                    <User className="size-[18px]" />
                    <span className="text-sm">{t("login")}</span>
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* MAIN AREA — fills remaining viewport, internal scroll */}
          <div className="flex-1 flex flex-col min-w-0 relative">
            {/* iOS notch / Android status-bar spacer — picks up
                env(safe-area-inset-top); resolves to 0 on the desktop browser. */}
            <div
              aria-hidden
              className="shrink-0 safe-pt bg-background/95 supports-[backdrop-filter]:bg-background/85 [-webkit-backdrop-filter:blur(12px)] backdrop-blur-md"
            />
            {/* TOP BAR */}
            <header className="shrink-0 z-30 h-16 flex items-center justify-between gap-3 px-4 md:px-6 w-full bg-background/95 supports-[backdrop-filter]:bg-background/85 [-webkit-backdrop-filter:blur(12px)] backdrop-blur-md border-b border-themed transition-colors">
              {/* LEFT: Logo (no hamburger — bottom nav replaces the sidebar on mobile) */}
              <div className="flex items-center gap-2 md:gap-4 shrink-0">
                <button
                  onClick={() => router.push(`${base}/store`)}
                  className="font-semibold text-lg cursor-pointer whitespace-nowrap hover:text-[color:var(--accent)] transition"
                >
                  {shopName}
                </button>
              </div>

              {/* MIDDLE: SEARCH */}
              {!isProductPage && (
                <div className="flex-1 max-w-2xl relative mx-2 sm:mx-4">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-[18px]"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("searchProducts")}
                    className="w-full pl-10 pr-3 py-2 rounded-lg bg-[color:var(--input)] border border-themed text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] transition"
                  />
                </div>
              )}

              {/* RIGHT: LANGUAGE + (desktop-only) CART */}
              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <LanguageSwitcher />
                {!isSocial && (
                  <button
                    onClick={() => router.push(`${base}/cart`)}
                    className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted hover:text-[color:var(--accent)] transition"
                  >
                    <ShoppingCart className="size-5" />
                    <span className="hidden sm:block text-sm font-medium">{t("cart")}</span>
                  </button>
                )}
              </div>
            </header>

            {/* CONTENT — main is the scroll container; the page itself flows inside.
                Extra bottom padding only when the mobile bottom nav is shown. */}
            <main
              className={`flex-1 min-h-0 overflow-y-auto bg-background xl:pb-0 ${
                hideBottomNav ? "" : "pb-[calc(4rem+env(safe-area-inset-bottom))] xl:pb-0"
              }`}
            >
              {children}
            </main>
          </div>

          {/* MOBILE / TABLET BOTTOM NAVIGATION — Safari-friendly: solid background fallback,
              -webkit-backdrop-filter prefix, and safe-area padding for iPhone home indicator. */}
          {!hideBottomNav && (
          <nav
            className="
              fixed bottom-0 left-0 right-0 z-40 xl:hidden
              border-t border-themed
              bg-card/95 supports-[backdrop-filter]:bg-card/80
              [-webkit-backdrop-filter:blur(12px)] backdrop-blur-md
              pb-[env(safe-area-inset-bottom)]
            "
            aria-label="Primary"
          >
            <ul
              className="grid"
              style={{ gridTemplateColumns: `repeat(${menuItems.length}, minmax(0, 1fr))` }}
            >
              {menuItems.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <li key={item.label} className="flex">
                    <Link
                      href={item.href}
                      className={`
                        flex flex-col items-center justify-center gap-0.5 w-full py-2.5
                        text-[11px] font-medium transition
                        ${
                          active
                            ? "text-[color:var(--accent)]"
                            : "text-muted-foreground hover:text-foreground"
                        }
                      `}
                    >
                      <span
                        className={`grid place-items-center size-9 rounded-xl transition ${
                          active
                            ? "bg-[color:var(--accent-soft)] ring-1 ring-[color:var(--accent)]/20"
                            : ""
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate max-w-[80px]">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          )}
        </div>
      )}
    </ThemeLayout>
  );
}
