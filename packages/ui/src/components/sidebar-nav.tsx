"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface SidebarItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface SidebarNavProps {
  brand: React.ReactNode;
  items: SidebarItem[];
  activeHref?: string;
  footer?: React.ReactNode;
  className?: string;
}

export function SidebarNav({
  brand,
  items,
  activeHref,
  footer,
  className,
}: SidebarNavProps) {
  return (
    <aside
      className={cn(
        "hidden w-64 shrink-0 flex-col border-r bg-card lg:flex",
        className
      )}
    >
      <div className="flex h-14 items-center border-b px-4">{brand}</div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {items.map((item) => {
          const active = activeHref === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              data-active={active ? "true" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[color:var(--accent-soft)] font-medium text-[color:var(--accent)]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset"
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
            </a>
          );
        })}
      </nav>
      {footer && <div className="border-t p-3">{footer}</div>}
    </aside>
  );
}

/**
 * Bottom navigation bar for mobile/tablet (< lg). Pairs with `SidebarNav`
 * which is hidden below `lg` — together they give every viewport a way to
 * navigate. Picks the first 4 items by default; pass a curated subset for
 * a tighter mobile bar.
 */
export interface BottomNavProps {
  items: SidebarItem[];
  activeHref?: string;
  className?: string;
}

export function BottomNav({ items, activeHref, className }: BottomNavProps) {
  return (
    <nav
      className={cn(
        // Fixed to viewport, visible only below lg.
        "fixed inset-x-0 bottom-0 z-40 flex border-t bg-card/95 backdrop-blur lg:hidden",
        // iOS home-indicator safe area.
        "pb-[env(safe-area-inset-bottom)]",
        className
      )}
    >
      {items.map((item) => {
        const active = activeHref === item.href;
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
    </nav>
  );
}
