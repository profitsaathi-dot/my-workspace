import * as React from "react";
import { cn } from "../lib/utils";

/**
 * Inline placeholder block for loading states. Use it instead of writing
 * `animate-pulse rounded bg-muted` by hand on every page.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
