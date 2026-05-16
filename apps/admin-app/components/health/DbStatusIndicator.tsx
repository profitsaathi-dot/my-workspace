"use client";

import { Database } from "lucide-react";
import type { CacheHealth, DbHealth, Status } from "@/lib/services/health.service";
import { StatusPill } from "./StatusDot";
import { TileCard, TileRow } from "./TileCard";

function clusterStatus(
  entries: { status: Status }[],
): Status {
  if (entries.length === 0) return "unknown";
  const upCount = entries.filter((e) => e.status === "up").length;
  if (upCount === entries.length) return "up";
  if (upCount === 0) return "down";
  return "down";
}

export function DbStatusIndicator({
  databases,
  caches = [],
}: {
  databases: DbHealth[];
  caches?: CacheHealth[];
}) {
  const pgStatus = clusterStatus(databases);
  const redisStatus = clusterStatus(caches);

  return (
    <TileCard
      title="Databases"
      icon={<Database className="size-4" />}
      iconClass="text-[color:var(--accent)]"
    >
      <TileRow
        label={
          <span title={databases.map((d) => d.name).join(", ")}>
            Postgres Cluster
            {databases.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({databases.length})
              </span>
            )}
          </span>
        }
        right={<StatusPill status={pgStatus} />}
      />
      <TileRow
        label={
          <span title={caches.map((c) => c.name).join(", ")}>
            Redis Cache
          </span>
        }
        right={<StatusPill status={redisStatus} />}
      />
    </TileCard>
  );
}
