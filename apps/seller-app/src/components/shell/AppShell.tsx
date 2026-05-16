"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calculator,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Package,
  Receipt,
  Settings,
  Sparkles,
  Store,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  Badge,
  Button,
  SidebarNav,
  type SidebarItem,
  cn,
  useAccent,
} from "@workspace/ui";
import { useUserStore } from "@/src/stores/user.store";
import { useSyncUser } from "@/src/hooks/useSyncUser";
import { useApplyPreferences } from "@/src/hooks/useApplyPreferences";
import { useT } from "@/src/i18n/useT";
import { OnboardingGate } from "./OnboardingGate";
import { PasskeyEnrollmentPrompt } from "@/src/components/auth/PasskeyEnrollmentPrompt";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const { data: session } = useSession();
  const user = useUserStore((s) => s.user);
  const t = useT();
  const [moreOpen, setMoreOpen] = useState(false);

  const items: SidebarItem[] = useMemo(
    () => [
      { label: t("nav.dashboard"), href: "/dashboard", icon: <LayoutDashboard className="size-4" /> },
      { label: t("nav.pricing"), href: "/pricing", icon: <Calculator className="size-4" /> },
      { label: t("nav.profit"), href: "/profit", icon: <TrendingUp className="size-4" /> },
      {
        label: t("nav.suggestions"),
        href: "/suggestions",
        icon: <Lightbulb className="size-4" />,
        badge: "AI",
      },
      { label: t("nav.products"), href: "/products", icon: <Package className="size-4" /> },
      { label: t("nav.dynamicPrice"), href: "/products/dynamic", icon: <Zap className="size-4" /> },
      { label: t("nav.orders"), href: "/orders", icon: <Receipt className="size-4" /> },
      { label: t("nav.whatsapp"), href: "/whatsapp", icon: <MessageCircle className="size-4" /> },
      {
        label: t("nav.chat"),
        href: "/chat",
        icon: <Sparkles className="size-4" />,
        badge: "AI",
      },
      { label: t("nav.settings"), href: "/settings", icon: <Settings className="size-4" /> },
      { label: t("nav.help"), href: "/help", icon: <HelpCircle className="size-4" /> },
    ],
    [t]
  );

  // Mobile bar shows the 4 most-used routes; everything else lives behind
  // a "More" overflow so the buyer can still reach them on phones. The
  // remainder is whatever the primary tabs leave behind.
  const primaryHrefs = useMemo(
    () => ["/dashboard", "/products", "/orders", "/settings"],
    []
  );
  const primaryItems = useMemo(
    () =>
      primaryHrefs
        .map((h) => items.find((i) => i.href === h))
        .filter((i): i is SidebarItem => Boolean(i)),
    [items, primaryHrefs]
  );
  const overflowItems = useMemo(
    () => items.filter((i) => !primaryHrefs.includes(i.href)),
    [items, primaryHrefs]
  );

  // Close the overflow sheet whenever the user navigates — a tap on a link
  // inside it would otherwise leave the sheet open over the new page.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Hydrate user store from /api/user once authenticated
  useSyncUser();

  // Apply persisted language/theme/accent as soon as the user record is hydrated.
  useApplyPreferences();

  // Apply the saved accent color from localStorage (no-op if none).
  // Mounting once at the shell level means the accent applies app-wide.
  useAccent();

  const handleSignOut = useCallback(async () => {
    // /api/auth/logout calls Spring's /api/v1/auth/logout to invalidate the
    // refresh-token JTI, clears NextAuth's cookies, and redirects to the
    // marketing page.
    window.location.href = "/api/auth/logout";
  }, []);

  const displayName =
    user?.name ?? session?.user?.name ?? session?.user?.email ?? "Guest";
  const displayEmail = user?.email ?? session?.user?.email ?? "";
  const storeLabel = user?.storeName ?? "ProfitSaathi seller";
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-1 bg-background pattern-grid">
      <OnboardingGate />
      <PasskeyEnrollmentPrompt />
      <SidebarNav
        brand={
          <a href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <span
              className="grid size-7 place-items-center rounded-lg text-[color:var(--accent-foreground)]"
              style={{ background: "var(--accent)" }}
            >
              <Store className="size-4" />
            </span>
            ProfitSaathi
            <Badge variant="success" className="ml-1">Seller</Badge>
          </a>
        }
        items={items}
        activeHref={pathname}
        footer={
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold ring-1 ring-inset"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  boxShadow:
                    "inset 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent)",
                }}
              >
                {initials || "PS"}
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-medium text-foreground">
                  {displayName}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {displayEmail || storeLabel}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-center"
            >
              <LogOut className="size-3.5" />
              {t("nav.signOut")}
            </Button>
          </div>
        }
      />
      <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
        {children}
      </div>

      {/* Mobile/tablet bottom nav — 4 primary tabs + a "More" overflow that
          slides up a sheet so the remaining routes are still reachable. */}
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex border-t bg-card/95 backdrop-blur lg:hidden",
          "pb-[env(safe-area-inset-bottom)]"
        )}
      >
        {primaryItems.map((item) => {
          const active = pathname === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              data-active={active ? "true" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors",
                active
                  ? "text-[color:var(--accent)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="grid size-5 place-items-center">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </a>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="More menu"
          aria-expanded={moreOpen}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors",
            moreOpen || overflowItems.some((i) => i.href === pathname)
              ? "text-[color:var(--accent)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="grid size-5 place-items-center">
            <MoreHorizontal className="size-4" />
          </span>
          <span className="truncate">More</span>
        </button>
      </nav>

      {/* Bottom sheet — shows the routes that didn't fit in the primary
          tabs, plus a sign-out at the foot. Visible only below `lg` because
          desktop already has the full sidebar. */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 rounded-t-2xl border-t bg-card shadow-xl",
              "max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]"
            )}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="text-sm font-semibold">
                More
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setMoreOpen(false)}
                className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <nav className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
              {overflowItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    data-active={active ? "true" : undefined}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs font-medium transition-colors",
                      active
                        ? "border-[color:var(--accent)]/40 bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                        : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className="grid size-8 place-items-center">
                      {item.icon}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {item.label}
                      {item.badge !== undefined && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset"
                          style={{
                            background: "var(--accent-soft)",
                            color: "var(--accent)",
                            boxShadow:
                              "inset 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent)",
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </span>
                  </a>
                );
              })}
            </nav>
            <div className="border-t p-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-center"
              >
                <LogOut className="size-3.5" />
                {t("nav.signOut")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
