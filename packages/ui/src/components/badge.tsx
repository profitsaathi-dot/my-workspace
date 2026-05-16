import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground ring-[color:var(--border)]",
        success:
          "bg-[color:var(--accent-soft)] text-[color:var(--accent)] ring-[color:var(--accent)]/30",
        warning:
          "bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-400",
        danger:
          "bg-red-500/10 text-red-700 ring-red-500/30 dark:text-red-400",
        info: "bg-sky-500/10 text-sky-700 ring-sky-500/30 dark:text-sky-400",
        outline: "bg-transparent text-foreground ring-[color:var(--border)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
