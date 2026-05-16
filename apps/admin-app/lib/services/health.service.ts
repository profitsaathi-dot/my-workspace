/**
 * System-health aggregator. Server-side only — talks directly to the monolith:
 *   - GET /api/v1/system/metrics  -> CPU + RAM (Bearer-protected)
 *   - GET /actuator/health        -> db / disk / redis (public)
 *
 * Replaces the old Eureka-based discovery flow. Every fetch is wrapped so a
 * single dead component never breaks the whole dashboard — failures degrade
 * the relevant card, not the page.
 */
import { apiRoutes } from "@/lib/api/routes";
import { env } from "@/lib/env";

export type Status = "up" | "down" | "unknown";

export interface DbHealth {
  name: string;
  status: Status;
  detail?: string;
}

export interface CacheHealth {
  name: string;
  status: Status;
  /** e.g. Redis version reported by the actuator. */
  detail?: string;
}

export interface DiskSpaceHealth {
  status: Status;
  total: number;
  free: number;
  threshold: number;
  path?: string;
  exists?: boolean;
}

export interface PingHealth {
  status: Status;
}

export interface ResourceUsage {
  /** System-wide CPU 0..1, or null if metric unavailable. */
  cpuUsage: number | null;
  /** This JVM's CPU 0..1, or null if metric unavailable. */
  processCpuUsage: number | null;
  /** Host RAM used (bytes), or null. */
  systemMemoryUsedBytes: number | null;
  /** Host RAM total (bytes), or null. */
  systemMemoryTotalBytes: number | null;
  /** JVM heap used (bytes), or null. Kept as a fallback when host RAM is missing. */
  jvmMemoryUsedBytes: number | null;
  /** JVM heap max (bytes), or null. */
  jvmMemoryMaxBytes: number | null;
}

export interface SystemHealth {
  overall: "up" | "degraded" | "down" | "unknown";
  fetchedAt: string;
  databases: DbHealth[];
  caches: CacheHealth[];
  diskSpace: DiskSpaceHealth | null;
  ping: PingHealth;
  resources: ResourceUsage;
  errors: string[];
}

interface ActuatorComponent {
  status: string;
  details?: Record<string, unknown>;
  components?: Record<string, ActuatorComponent>;
}

interface ActuatorHealth {
  status: string;
  components?: Record<string, ActuatorComponent>;
}

interface SystemMetricsResponse {
  cpu?: {
    availableProcessors?: number;
    processCpuLoadPercent?: number;
    systemCpuLoadPercent?: number;
  };
  ram?: {
    totalSystemBytes?: number;
    freeSystemBytes?: number;
    usedSystemBytes?: number;
    systemUsedPercent?: number;
    jvmHeapMaxBytes?: number;
    jvmHeapUsedBytes?: number;
    jvmHeapUsedPercent?: number;
  };
}

const FETCH_TIMEOUT_MS = 3000;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      throw new Error(`${url} -> ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function mapStatus(s: string | undefined): Status {
  const u = (s ?? "").toUpperCase();
  if (u === "UP") return "up";
  if (u === "DOWN" || u === "OUT_OF_SERVICE") return "down";
  return "unknown";
}

function deriveOverall(
  dbs: DbHealth[],
  caches: CacheHealth[],
  diskSpace: DiskSpaceHealth | null,
  ping: PingHealth,
): SystemHealth["overall"] {
  const checks: Status[] = [];
  dbs.forEach((d) => checks.push(d.status));
  caches.forEach((c) => checks.push(c.status));
  if (diskSpace) checks.push(diskSpace.status);
  checks.push(ping.status);
  if (checks.length === 0) return "unknown";

  if (checks.some((s) => s === "down")) return "down";
  if (checks.some((s) => s === "unknown")) return "degraded";
  return "up";
}

function pctToFraction(pct: number | undefined): number | null {
  if (typeof pct !== "number" || !Number.isFinite(pct)) return null;
  return pct / 100;
}

export async function getSystemHealth(accessToken?: string): Promise<SystemHealth> {
  const errors: string[] = [];

  const metricsHeaders: Record<string, string> = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};

  const [healthResult, metricsResult] = await Promise.allSettled([
    fetchJson<ActuatorHealth>(`${env.NEXT_PUBLIC_API_URL}${apiRoutes.system.health}`),
    fetchJson<SystemMetricsResponse>(
      `${env.NEXT_PUBLIC_API_URL}${apiRoutes.system.metrics}`,
      { headers: metricsHeaders },
    ),
  ]);

  // ── Components from actuator/health ────────────────────────────────────
  const databases: DbHealth[] = [];
  const caches: CacheHealth[] = [];
  let diskSpace: DiskSpaceHealth | null = null;
  let ping: PingHealth = { status: "unknown" };

  if (healthResult.status === "fulfilled") {
    const components = healthResult.value.components ?? {};

    // Postgres / generic db indicator. Spring boot's auto-configured DB health
    // surfaces as `db` (DataSourceHealthIndicator); a custom `postgres`
    // indicator was used previously — handle both for forward-compat.
    const dbComp = components.db ?? components.postgres;
    if (dbComp) {
      databases.push({
        name: components.postgres ? "postgres" : "db",
        status: mapStatus(dbComp.status),
        detail:
          typeof dbComp.details?.database === "string"
            ? (dbComp.details.database as string)
            : undefined,
      });
    }

    // Redis (auto-registered by spring-boot-starter-data-redis)
    const redis = components.redis;
    if (redis) {
      const v = redis.details?.version;
      caches.push({
        name: "redis",
        status: mapStatus(redis.status),
        detail: typeof v === "string" ? `v${v}` : undefined,
      });
    }

    // Disk space
    const ds = components.diskSpace;
    if (ds) {
      const d = ds.details ?? {};
      diskSpace = {
        status: mapStatus(ds.status),
        total: typeof d.total === "number" ? d.total : 0,
        free: typeof d.free === "number" ? d.free : 0,
        threshold: typeof d.threshold === "number" ? d.threshold : 0,
        path: typeof d.path === "string" ? d.path : undefined,
        exists: typeof d.exists === "boolean" ? d.exists : undefined,
      };
    }

    // Ping (auto-registered) — proxy for "actuator itself is reachable".
    const p = components.ping;
    ping = { status: mapStatus(p?.status ?? healthResult.value.status) };
  } else {
    errors.push(
      `actuator health: ${healthResult.reason?.message ?? "fetch failed"}`,
    );
    ping = { status: "down" };
  }

  // ── Resource usage from /system/metrics ────────────────────────────────
  let resources: ResourceUsage = {
    cpuUsage: null,
    processCpuUsage: null,
    systemMemoryUsedBytes: null,
    systemMemoryTotalBytes: null,
    jvmMemoryUsedBytes: null,
    jvmMemoryMaxBytes: null,
  };

  if (metricsResult.status === "fulfilled") {
    const m = metricsResult.value;
    resources = {
      cpuUsage: pctToFraction(m.cpu?.systemCpuLoadPercent),
      processCpuUsage: pctToFraction(m.cpu?.processCpuLoadPercent),
      systemMemoryUsedBytes: m.ram?.usedSystemBytes ?? null,
      systemMemoryTotalBytes: m.ram?.totalSystemBytes ?? null,
      jvmMemoryUsedBytes: m.ram?.jvmHeapUsedBytes ?? null,
      jvmMemoryMaxBytes: m.ram?.jvmHeapMaxBytes ?? null,
    };
  } else {
    errors.push(
      `system metrics: ${metricsResult.reason?.message ?? "fetch failed"}`,
    );
  }

  return {
    overall: deriveOverall(databases, caches, diskSpace, ping),
    fetchedAt: new Date().toISOString(),
    databases,
    caches,
    diskSpace,
    ping,
    resources,
    errors,
  };
}
