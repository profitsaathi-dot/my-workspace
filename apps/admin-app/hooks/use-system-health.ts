"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SystemHealth } from "@/lib/services/health.service";
import { BASE_PATH } from "@/lib/env";

interface UseSystemHealthOptions {
  /** Polling interval in ms. Default: 10s. Pass 0 to disable polling. */
  intervalMs?: number;
}

interface UseSystemHealthResult {
  data: SystemHealth | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Polls /api/system-health on a fixed cadence. Pauses when the tab is hidden
 * so a background admin tab doesn't burn cycles in Eureka.
 */
export function useSystemHealth(
  { intervalMs = 10_000 }: UseSystemHealthOptions = {},
): UseSystemHealthResult {
  const [data, setData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Avoid setState-after-unmount when the timer fires mid-fetch.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchOnce = useCallback(async () => {
    try {
      // basePath isn't auto-applied to fetch() — prepend manually.
      const res = await fetch(`${BASE_PATH}/api/system-health`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as SystemHealth;
      if (!mountedRef.current) return;
      setData(json);
      setError(null);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to load system health");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnce();
    if (intervalMs <= 0) return;

    let timerId: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timerId !== null) return;
      timerId = setInterval(fetchOnce, intervalMs);
    };
    const stop = () => {
      if (timerId === null) return;
      clearInterval(timerId);
      timerId = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchOnce();
        start();
      } else {
        stop();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchOnce, intervalMs]);

  return { data, loading, error, refresh: fetchOnce };
}
