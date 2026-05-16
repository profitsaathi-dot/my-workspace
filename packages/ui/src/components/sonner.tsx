"use client";

import { Toaster as SonnerToaster, toast } from "sonner";
import type { ComponentProps } from "react";

/**
 * App-wide toast surface (built on sonner). Mount once at the root layout
 * via `<Toaster />`, then call `toast(...)` / `toast.success(...)` /
 * `toast.error(...)` from anywhere — server actions and client components.
 *
 * Theme tokens are mapped onto sonner's CSS variables so toasts inherit our
 * card / accent / border colours instead of sonner's defaults.
 */
type ToasterProps = ComponentProps<typeof SonnerToaster>;

export function Toaster({ position = "top-right", richColors = true, closeButton = true, ...props }: ToasterProps) {
  return (
    <SonnerToaster
      position={position}
      richColors={richColors}
      closeButton={closeButton}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-[color:var(--accent)] group-[.toast]:text-[color:var(--accent-foreground)]",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

export { toast };
