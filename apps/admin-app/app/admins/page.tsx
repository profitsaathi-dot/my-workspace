"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Mail,
  Pencil,
  RefreshCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  Skeleton,
  Topbar,
} from "@workspace/ui";
import { BASE_PATH } from "@/lib/env";

type AdminStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

interface AdminRow {
  id: number;
  name: string;
  email: string;
  status: AdminStatus;
  createdAt?: string;
}

const STATUS_OPTIONS: AdminStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED"];
const STATUS_VARIANT: Record<
  AdminStatus,
  "success" | "default" | "warning"
> = {
  ACTIVE: "success",
  INACTIVE: "default",
  SUSPENDED: "warning",
};

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | AdminStatus>("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(
        `${BASE_PATH}/api/admin/admins`,
        window.location.origin,
      );
      if (statusFilter) url.searchParams.set("status", statusFilter);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AdminRow[];
      setAdmins(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message || "Failed to load admins");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((a) =>
      [a.name, a.email].some((v) => v.toLowerCase().includes(q)),
    );
  }, [admins, search]);

  return (
    <>
      <Topbar
        title="Admins"
        subtitle="Manage other admin accounts. Provisioning a new admin needs the registration secret."
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw
              className={`size-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-[color:var(--accent-soft)] px-4 py-3 text-sm font-medium text-[color:var(--accent)] ring-1 ring-inset ring-[color:var(--accent)]/30">
          {toast}
        </div>
      )}

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-3 sm:p-4 sm:gap-6 lg:p-6">
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email"
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "" | AdminStatus)
              }
              className="sm:w-44"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s[0] + s.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <AdminsListSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            hasFilter={Boolean(search || statusFilter)}
            onClear={() => {
              setSearch("");
              setStatusFilter("");
            }}
          />
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y">
              {filtered.map((a) => (
                <AdminRowItem
                  key={a.id}
                  admin={a}
                  onEdit={() => setEditing(a)}
                />
              ))}
            </ul>
          </Card>
        )}
      </main>

      {editing && (
        <AdminEditDialog
          admin={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setAdmins((prev) =>
              prev.map((p) => (p.id === saved.id ? saved : p)),
            );
            setEditing(null);
            setToast(`Updated ${saved.name}`);
          }}
        />
      )}
    </>
  );
}

function AdminRowItem({
  admin,
  onEdit,
}: {
  admin: AdminRow;
  onEdit: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-muted/30">
      <div
        className="grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold ring-1 ring-inset"
        style={{
          background: "var(--accent-soft)",
          color: "var(--accent)",
          boxShadow:
            "inset 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent)",
        }}
      >
        {initials(admin.name)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-foreground">
            {admin.name}
          </span>
          <Badge variant={STATUS_VARIANT[admin.status]}>
            {admin.status[0] + admin.status.slice(1).toLowerCase()}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Mail className="size-3" />
            {admin.email}
          </span>
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={onEdit}>
        <Pencil className="size-3.5" />
        Edit
      </Button>
    </li>
  );
}

function EmptyState({
  hasFilter,
  onClear,
}: {
  hasFilter: boolean;
  onClear: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <ShieldCheck className="size-8 text-muted-foreground" />
        <div className="text-sm font-medium">
          {hasFilter
            ? "No admins match the current filter"
            : "No admins found"}
        </div>
        <p className="max-w-sm text-xs text-muted-foreground">
          {hasFilter
            ? "Try clearing the search or switching to a different status."
            : "Provision a new admin via POST api/v1/auth/signup/admin (requires the registration secret)."}
        </p>
        {hasFilter && (
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function AdminsListSkeleton() {
  return (
    <Card>
      <ul className="divide-y">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-8 w-20" />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AdminEditDialog({
  admin,
  onClose,
  onSaved,
}: {
  admin: AdminRow;
  onClose: () => void;
  onSaved: (saved: AdminRow) => void;
}) {
  const [form, setForm] = useState({
    name: admin.name,
    status: admin.status,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/admin/admins/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || null,
          status: form.status,
        }),
      });
      if (!res.ok) {
        let detail = res.statusText;
        try {
          const body = await res.json();
          if (body?.message) detail = body.message;
        } catch {
          /* ignore */
        }
        throw new Error(detail);
      }
      onSaved((await res.json()) as AdminRow);
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit admin</DialogTitle>
          <DialogDescription>
            You can&apos;t change your own status — the backend will block that
            with a 403 to prevent admins locking themselves out.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field id="name" label="Name">
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field id="status" label="Status">
            <Select
              id="status"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as AdminStatus })
              }
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s[0] + s.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>

          {err && (
            <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {err}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
