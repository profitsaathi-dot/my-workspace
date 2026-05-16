"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  Globe,
  Loader2,
  Mail,
  Pencil,
  RefreshCcw,
  Search,
  ShoppingBag,
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

type CustomerStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BLOCKED";

interface Customer {
  id: number;
  name: string;
  email: string;
  status: CustomerStatus;
  language?: string | null;
  notifications?: boolean;
  createdAt?: string;
}

const STATUS_OPTIONS: CustomerStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "BLOCKED",
];
const STATUS_VARIANT: Record<
  CustomerStatus,
  "success" | "default" | "warning" | "danger"
> = {
  ACTIVE: "success",
  INACTIVE: "default",
  SUSPENDED: "warning",
  BLOCKED: "danger",
};
const LANGUAGES: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "mr", label: "Marathi" },
  { value: "ta", label: "Tamil" },
  { value: "te", label: "Telugu" },
  { value: "bn", label: "Bengali" },
  { value: "kn", label: "Kannada" },
  { value: "gu", label: "Gujarati" },
  { value: "ml", label: "Malayalam" },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | CustomerStatus>("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
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
        `${BASE_PATH}/api/admin/customers`,
        window.location.origin,
      );
      if (statusFilter) url.searchParams.set("status", statusFilter);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Customer[];
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.email].some((v) => v.toLowerCase().includes(q)),
    );
  }, [customers, search]);

  return (
    <>
      <Topbar
        title="Customers"
        subtitle="Browse and manage customer profiles"
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
                setStatusFilter(e.target.value as "" | CustomerStatus)
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
          <CustomersListSkeleton />
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
              {filtered.map((c) => (
                <CustomerRow
                  key={c.id}
                  customer={c}
                  onEdit={() => setEditing(c)}
                />
              ))}
            </ul>
          </Card>
        )}
      </main>

      {editing && (
        <CustomerEditDialog
          customer={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setCustomers((prev) =>
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

function CustomerRow({
  customer,
  onEdit,
}: {
  customer: Customer;
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
        {initials(customer.name)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-foreground">
            {customer.name}
          </span>
          <Badge variant={STATUS_VARIANT[customer.status]}>
            {customer.status[0] + customer.status.slice(1).toLowerCase()}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Mail className="size-3" />
            {customer.email}
          </span>
          {customer.language && (
            <span className="flex items-center gap-1">
              <Globe className="size-3" />
              {customer.language.toUpperCase()}
            </span>
          )}
          <span className="flex items-center gap-1">
            {customer.notifications ? (
              <>
                <Bell className="size-3" />
                Notifications on
              </>
            ) : (
              <>
                <BellOff className="size-3" />
                Notifications off
              </>
            )}
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
        <ShoppingBag className="size-8 text-muted-foreground" />
        <div className="text-sm font-medium">
          {hasFilter
            ? "No customers match the current filter"
            : "No customers yet"}
        </div>
        <p className="max-w-sm text-xs text-muted-foreground">
          {hasFilter
            ? "Try clearing the search or switching to a different status."
            : "Customers self-register from the storefront — none have signed up so far."}
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

function CustomersListSkeleton() {
  return (
    <Card>
      <ul className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
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

function CustomerEditDialog({
  customer,
  onClose,
  onSaved,
}: {
  customer: Customer;
  onClose: () => void;
  onSaved: (saved: Customer) => void;
}) {
  const [form, setForm] = useState({
    name: customer.name,
    language: customer.language ?? "en",
    notifications: Boolean(customer.notifications),
    status: customer.status,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/admin/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || null,
          language: form.language || null,
          notifications: form.notifications,
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
      onSaved((await res.json()) as Customer);
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
          <DialogTitle>Edit customer</DialogTitle>
          <DialogDescription>
            Profile fields. Email and addresses live with the customer and
            aren&apos;t editable here.
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
          <div className="grid grid-cols-2 gap-3">
            <Field id="language" label="Language">
              <Select
                id="language"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="status" label="Status">
              <Select
                id="status"
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as CustomerStatus,
                  })
                }
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s[0] + s.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
            <div>
              <div className="font-medium">Notifications</div>
              <div className="text-xs text-muted-foreground">
                When off, the customer won&apos;t receive transactional alerts.
              </div>
            </div>
            <input
              type="checkbox"
              checked={form.notifications}
              onChange={(e) =>
                setForm({ ...form, notifications: e.target.checked })
              }
              className="size-4 accent-[color:var(--accent)]"
            />
          </label>

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
