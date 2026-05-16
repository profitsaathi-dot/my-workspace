"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Loader2,
  RefreshCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
  StatCard,
  Topbar,
  formatINR,
} from "@workspace/ui";
import { BASE_PATH } from "@/lib/env";

interface UsageStats {
  windowDays: number;
  calls: number;
  cost: number | string;
}

interface AiChatLog {
  id: number;
  principalEmail?: string | null;
  principalRole?: string | null;
  model: string;
  prompt: string;
  response?: string | null;
  cost: number | string;
  responseType?: string | null;
  createdAt: string;
}

interface LogPage {
  content: AiChatLog[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

const WINDOWS = [7, 30, 90] as const;

export default function AiAdminPage() {
  const [windowDays, setWindowDays] = useState<(typeof WINDOWS)[number]>(30);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [logs, setLogs] = useState<LogPage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [emailFilter, setEmailFilter] = useState("");
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState<AiChatLog | null>(null);

  const loadUsage = useCallback(async () => {
    setLoadingUsage(true);
    try {
      const url = new URL(
        `${BASE_PATH}/api/admin/ai/usage`,
        window.location.origin,
      );
      url.searchParams.set("days", String(windowDays));
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUsage((await res.json()) as UsageStats);
    } catch (e) {
      setError((e as Error).message || "Failed to load usage");
    } finally {
      setLoadingUsage(false);
    }
  }, [windowDays]);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const url = new URL(
        `${BASE_PATH}/api/admin/ai/logs`,
        window.location.origin,
      );
      url.searchParams.set("page", String(page));
      url.searchParams.set("size", "25");
      if (emailFilter) url.searchParams.set("principalEmail", emailFilter);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLogs((await res.json()) as LogPage);
    } catch (e) {
      setError((e as Error).message || "Failed to load logs");
    } finally {
      setLoadingLogs(false);
    }
  }, [page, emailFilter]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const refresh = () => {
    setError(null);
    loadUsage();
    loadLogs();
  };

  const applyFilter = () => {
    setPage(0);
    setEmailFilter(draft.trim());
  };

  const clearFilter = () => {
    setDraft("");
    setEmailFilter("");
    setPage(0);
  };

  return (
    <>
      <Topbar
        title="AI usage"
        subtitle="Calls, cost, and audit log for the AI module"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loadingUsage || loadingLogs}
          >
            {loadingUsage || loadingLogs ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="size-3.5" />
            )}
            Refresh
          </Button>
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-3 sm:p-4 sm:gap-6 lg:p-6">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ── Usage stats ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-[color:var(--accent)]" />
                Usage
              </CardTitle>
              <CardDescription>
                Aggregate calls + cost over the selected window.
              </CardDescription>
            </div>
            <div className="flex gap-1 text-xs">
              {WINDOWS.map((p) => (
                <button
                  key={p}
                  onClick={() => setWindowDays(p)}
                  className={`rounded-md px-2.5 py-1 transition ${
                    windowDays === p
                      ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/30"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {p}d
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsage && !usage ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border bg-card p-5 shadow-sm">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="mt-4 h-7 w-24" />
                    <Skeleton className="mt-2 h-3 w-32" />
                  </div>
                ))}
              </div>
            ) : usage ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  title={`AI calls (${usage.windowDays}d)`}
                  value={Number(usage.calls).toLocaleString()}
                  icon={
                    <Activity className="size-4 text-[color:var(--accent)]" />
                  }
                  hint="Includes text + image flows"
                />
                <StatCard
                  title="Cost"
                  value={formatINR(Number(usage.cost ?? 0))}
                  icon={
                    <CircleDollarSign className="size-4 text-[color:var(--accent)]" />
                  }
                  hint="Per-token, computed at call time"
                  highlight="text-[color:var(--accent)]"
                />
                <StatCard
                  title="Window"
                  value={`${usage.windowDays} days`}
                  icon={<Sparkles className="size-4 text-[color:var(--accent)]" />}
                  hint="Switch above"
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* ── Audit log ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between space-y-0">
            <div>
              <CardTitle>Audit log</CardTitle>
              <CardDescription>
                Recent AI requests with who triggered them, model, cost, and
                response type. Click a row for the full prompt + response.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilter()}
                  placeholder="Filter by email"
                  className="h-8 w-56 pl-9 text-sm"
                />
              </div>
              <Button size="sm" variant="outline" onClick={applyFilter}>
                Apply
              </Button>
              {emailFilter && (
                <Button size="sm" variant="outline" onClick={clearFilter}>
                  <X className="size-3.5" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingLogs && !logs ? (
              <ul className="divide-y">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-4 px-5 py-3">
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </li>
                ))}
              </ul>
            ) : logs && logs.content.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">When</th>
                        <th className="px-4 py-3 font-medium">User</th>
                        <th className="px-4 py-3 font-medium">Model</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Prompt</th>
                        <th className="px-4 py-3 text-right font-medium tabular-nums">
                          Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--border)]">
                      {logs.content.map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => setOpen(row)}
                          className="cursor-pointer transition hover:bg-muted/40"
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {formatDateTime(row.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              {row.principalEmail ?? "—"}
                            </div>
                            {row.principalRole && (
                              <div className="text-xs text-muted-foreground">
                                {row.principalRole}
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                            {row.model}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                row.responseType === "payment_verification"
                                  ? "info"
                                  : "default"
                              }
                            >
                              {row.responseType ?? "text"}
                            </Badge>
                          </td>
                          <td className="max-w-md truncate px-4 py-3 text-muted-foreground">
                            {row.prompt}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatINR(Number(row.cost ?? 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={logs.number}
                  totalPages={logs.totalPages}
                  totalElements={logs.totalElements}
                  onPrev={() => setPage((p) => Math.max(0, p - 1))}
                  onNext={() => setPage((p) => p + 1)}
                />
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Sparkles className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {emailFilter
                    ? `No AI requests from ${emailFilter} yet.`
                    : "No AI requests recorded yet."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {open && (
        <LogDetailDialog log={open} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

function Pagination({
  page,
  totalPages,
  totalElements,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalElements: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) {
    return (
      <div className="flex justify-end px-5 py-3 text-xs text-muted-foreground">
        {totalElements} {totalElements === 1 ? "row" : "rows"}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-xs text-muted-foreground">
      <span>
        Page {page + 1} of {totalPages} · {totalElements.toLocaleString()} total
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page === 0} onClick={onPrev}>
          <ChevronLeft className="size-3.5" />
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page + 1 >= totalPages}
          onClick={onNext}
        >
          Next
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function LogDetailDialog({
  log,
  onClose,
}: {
  log: AiChatLog;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            AI request #{log.id}
            <Badge
              variant={
                log.responseType === "payment_verification" ? "info" : "default"
              }
            >
              {log.responseType ?? "text"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {log.principalEmail ?? "anonymous"} ·{" "}
            <span className="font-mono text-xs">{log.model}</span> ·{" "}
            {formatDateTime(log.createdAt)} · {formatINR(Number(log.cost ?? 0))}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Section title="Prompt">{log.prompt}</Section>
          <Section title="Response">{log.response ?? "—"}</Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <pre className="mt-1 max-h-72 overflow-auto rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap break-words">
        {children}
      </pre>
    </div>
  );
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
