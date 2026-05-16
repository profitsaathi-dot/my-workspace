import * as React from "react";
import { cn } from "../lib/utils";

export interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function Topbar({ title, subtitle, actions, className }: TopbarProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b bg-card px-3 py-3 sm:px-4 sm:py-4 lg:px-6",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg lg:text-xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground sm:text-sm">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
