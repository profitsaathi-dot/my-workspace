import { cn } from "@workspace/ui";

/**
 * Compact tile used in the System Status 4-column grid. Smaller padding
 * and tighter typography than `SectionCard` so four fit comfortably on a
 * standard desktop width.
 */
export function TileCard({
  title,
  icon,
  iconClass,
  className,
  children,
  tone = "default",
}: {
  title: string;
  icon?: React.ReactNode;
  iconClass?: string;
  className?: string;
  children: React.ReactNode;
  /** "danger" wraps the tile in a red-tinted surface (used for Disk Space when low). */
  tone?: "default" | "danger" | "warning";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-500/40 bg-red-500/5"
      : tone === "warning"
        ? "border-amber-500/40 bg-amber-500/5"
        : "bg-card";

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border p-4 shadow-sm",
        toneClass,
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {icon && (
          <span className={cn("grid size-7 place-items-center", iconClass)}>
            {icon}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2">{children}</div>
    </div>
  );
}

/**
 * The repeating "label … UP" row used inside Service Discovery + Databases
 * tiles. Pure presentational — pass any pill via `right`.
 */
export function TileRow({
  label,
  right,
  className,
}: {
  label: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border bg-background/60 px-3 py-2.5",
        className,
      )}
    >
      <span className="line-clamp-2 text-sm font-medium leading-tight">
        {label}
      </span>
      {right}
    </div>
  );
}
