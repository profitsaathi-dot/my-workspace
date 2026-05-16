"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Activity,
  BookOpen,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  SidebarNav,
  type SidebarItem,
  cn,
  useAccent,
} from "@workspace/ui";
import { BASE_PATH } from "@/lib/env";

const PUBLIC_PATHS = new Set<string>(["/login"]);

/**
 * SidebarNav uses raw <a> tags so basePath isn't auto-prepended. Build the
 * full href for each route and compare against the basePath-prefixed
 * pathname so the active state still highlights correctly.
 */
function fullHref(path: string): string {
  return path === "/" ? BASE_PATH || "/" : `${BASE_PATH}${path}`;
}

/**
 * Application shell for the admin app — mirrors the seller-app pattern
 * (SidebarNav on desktop, bottom nav + overflow sheet on mobile) so the
 * two surfaces feel like the same product.
 *
 * On public routes (e.g. /login) the chrome is skipped so login renders as
 * a full-screen page.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const [moreOpen, setMoreOpen] = useState(false);
  const { data: session } = useSession();

  // Apply the saved accent color from localStorage. Mounting once at the
  // shell level means the accent applies app-wide.
  useAccent();

  const handleSignOut = useCallback(() => {
    // The /api/auth/sign-out route hits the backend's /api/v1/auth/logout
    // (so the server-side refresh token is cleared), expires NextAuth's
    // cookies, and redirects to /admin/login. basePath: window.location.href
    // bypasses the Next router so we have to prepend it manually.
    window.location.href = `${BASE_PATH}/api/auth/sign-out`;
  }, []);

  // Login + future public routes: just render the page.
  if (PUBLIC_PATHS.has(pathname)) {
    return <>{children}</>;
  }

  const displayName = session?.user?.name ?? session?.user?.email ?? "Admin";
  const displayEmail = session?.user?.email ?? "";
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const items: SidebarItem[] = useMemo(
    () => [
      { label: "Overview", href: fullHref("/"), icon: <LayoutDashboard className="size-4" /> },
      { label: "Users", href: fullHref("/users"), icon: <Users className="size-4" /> },
      { label: "Sellers", href: fullHref("/sellers"), icon: <Store className="size-4" /> },
      { label: "Customers", href: fullHref("/customers"), icon: <ShoppingBag className="size-4" /> },
      { label: "Admins", href: fullHref("/admins"), icon: <ShieldCheck className="size-4" /> },
      { label: "WhatsApp (WAHA)", href: fullHref("/whatsapp"), icon: <MessageSquare className="size-4" /> },
      { label: "AI usage", href: fullHref("/ai"), icon: <Sparkles className="size-4" /> },
      {
        label: "System status",
        href: fullHref("/system-status"),
        icon: <HeartPulse className="size-4" />,
        badge: "Live",
      },
      {
        label: "API explorer",
        href: fullHref("/api-docs"),
        icon: <BookOpen className="size-4" />,
      },
      { label: "Settings", href: fullHref("/settings"), icon: <Settings className="size-4" /> },
    ],
    [],
  );

  // Mobile primary tabs: 4 most-used routes; everything else lives behind
  // a "More" overflow sheet.
  const primaryHrefs = useMemo(
    () => ["/", "/sellers", "/system-status", "/settings"].map(fullHref),
    [],
  );
  const primaryItems = useMemo(
    () =>
      primaryHrefs
        .map((h) => items.find((i) => i.href === h))
        .filter((i): i is SidebarItem => Boolean(i)),
    [items, primaryHrefs],
  );
  const overflowItems = useMemo(
    () => items.filter((i) => !primaryHrefs.includes(i.href)),
    [items, primaryHrefs],
  );

  // Close the overflow sheet on navigation so a tap on a link inside it
  // doesn't leave the sheet open over the new page.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <div className="flex flex-1 bg-background">
      <SidebarNav
        brand={
          <a href={fullHref("/")} className="flex items-center gap-2 font-semibold tracking-tight">
            <span
              className="grid size-7 place-items-center rounded-lg text-[color:var(--accent-foreground)]"
              style={{ background: "var(--accent)" }}
            >
              <Store className="size-4" />
            </span>
            ProfitSaathi
            <Badge variant="success" className="ml-1">
              Admin
            </Badge>
          </a>
        }
        items={items}
        activeHref={fullHref(pathname)}
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
                {initials || <Activity className="size-4" />}
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-medium text-foreground">
                  {displayName}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {displayEmail || "v1.0.0 · India"}
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
              Sign out
            </Button>
          </div>
        }
      />

      <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">{children}</div>

      {/* Mobile/tablet bottom nav — 4 primary tabs + a "More" overflow that
          slides up a sheet so the remaining routes are still reachable. */}
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex border-t bg-card/95 backdrop-blur lg:hidden",
          "pb-[env(safe-area-inset-bottom)]",
        )}
      >
        {primaryItems.map((item) => {
          const active = fullHref(pathname) === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              data-active={active ? "true" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors",
                active
                  ? "text-[color:var(--accent)]"
                  : "text-muted-foreground hover:text-foreground",
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
            moreOpen || overflowItems.some((i) => i.href === fullHref(pathname))
              ? "text-[color:var(--accent)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="grid size-5 place-items-center">
            <MoreHorizontal className="size-4" />
          </span>
          <span className="truncate">More</span>
        </button>
      </nav>

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
              "max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]",
            )}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="text-sm font-semibold">More</span>
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
                const active = fullHref(pathname) === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    data-active={active ? "true" : undefined}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs font-medium transition-colors",
                      active
                        ? "border-[color:var(--accent)]/40 bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                        : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span className="grid size-8 place-items-center">{item.icon}</span>
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
          </div>
        </div>
      )}
    </div>
  );
}
