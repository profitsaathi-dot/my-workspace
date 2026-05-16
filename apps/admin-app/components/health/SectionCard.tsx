import { cn } from "@workspace/ui";

/**
 * Big section card that hosts the System Status panels. Matches the visual
 * spec: rounded surface, an iconified header on the left, content below.
 */
export function SectionCard({
  icon,
  title,
  iconBg = "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  action,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  iconBg?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "grid size-7 place-items-center rounded-md ring-1 ring-inset",
              iconBg,
            )}
          >
            {icon}
          </span>
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        </div>
        {action}
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
