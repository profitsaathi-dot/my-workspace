"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  Store,
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

type SellerStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BLOCKED";

interface Seller {
  id: number;
  name: string;
  email: string;
  status: SellerStatus;
  storeName?: string | null;
  sellerType?: string | null;
  mobile?: string | null;
  language?: string | null;
  publicToken?: string;
  createdAt?: string;
}

const STATUS_OPTIONS: SellerStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED", "BLOCKED"];

const STATUS_VARIANT: Record<
  SellerStatus,
  "success" | "default" | "warning" | "danger"
> = {
  ACTIVE: "success",
  INACTIVE: "default",
  SUSPENDED: "warning",
  BLOCKED: "danger",
};

export default function SellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | SellerStatus>("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Seller | null>(null);
  const [creating, setCreating] = useState(false);
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
        `${BASE_PATH}/api/admin/sellers`,
        window.location.origin,
      );
      if (statusFilter) url.searchParams.set("status", statusFilter);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Seller[];
      setSellers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message || "Failed to load sellers");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sellers;
    return sellers.filter((s) =>
      [s.name, s.email, s.storeName, s.mobile]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [sellers, search]);

  return (
    <>
      <Topbar
        title="Sellers"
        subtitle="Manage seller profiles, status, and onboarding"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCcw
                className={`size-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              Add seller
            </Button>
          </div>
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
                placeholder="Search by name, email, store, or mobile"
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "" | SellerStatus)
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
          <SellersListSkeleton />
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
              {filtered.map((s) => (
                <SellerRow
                  key={s.id}
                  seller={s}
                  onEdit={() => setEditing(s)}
                />
              ))}
            </ul>
          </Card>
        )}
      </main>

      {editing && (
        <SellerEditDialog
          seller={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setSellers((prev) =>
              prev.map((p) => (p.id === saved.id ? saved : p)),
            );
            setEditing(null);
            setToast(`Updated ${saved.name}`);
          }}
        />
      )}

      {creating && (
        <SellerCreateDialog
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setToast("Seller created — welcome email sent");
            load();
          }}
        />
      )}
    </>
  );
}

function SellerRow({
  seller,
  onEdit,
}: {
  seller: Seller;
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
        {initials(seller.name)}
      </div>

      <a
        href={`${BASE_PATH}/sellers/${seller.id}`}
        className="min-w-0 flex-1 cursor-pointer"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-foreground hover:underline">
            {seller.name}
          </span>
          <Badge variant={STATUS_VARIANT[seller.status]}>
            {seller.status[0] + seller.status.slice(1).toLowerCase()}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Mail className="size-3" />
            {seller.email}
          </span>
          {seller.storeName && (
            <span className="flex items-center gap-1">
              <Store className="size-3" />
              {seller.storeName}
            </span>
          )}
          {seller.mobile && (
            <span className="flex items-center gap-1">
              <Phone className="size-3" />
              {seller.mobile}
            </span>
          )}
        </div>
      </a>

      <Button variant="outline" size="sm" onClick={onEdit}>
        <Pencil className="size-3.5" />
        Edit
      </Button>
      <a href={`${BASE_PATH}/sellers/${seller.id}`}>
        <Button variant="outline" size="sm">
          View
          <ChevronRight className="size-3.5" />
        </Button>
      </a>
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
        <Store className="size-8 text-muted-foreground" />
        <div className="text-sm font-medium">
          {hasFilter ? "No sellers match the current filter" : "No sellers yet"}
        </div>
        <p className="max-w-sm text-xs text-muted-foreground">
          {hasFilter
            ? "Try clearing the search or switching to a different status."
            : "Click \"Add seller\" to provision the first account."}
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

function SellersListSkeleton() {
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

function SellerEditDialog({
  seller,
  onClose,
  onSaved,
}: {
  seller: Seller;
  onClose: () => void;
  onSaved: (saved: Seller) => void;
}) {
  const [form, setForm] = useState({
    name: seller.name,
    storeName: seller.storeName ?? "",
    sellerType: seller.sellerType ?? "",
    mobile: seller.mobile ?? "",
    status: seller.status,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/admin/sellers/${seller.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || null,
          storeName: form.storeName.trim() || null,
          sellerType: form.sellerType.trim() || null,
          mobile: form.mobile.trim() || null,
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
      onSaved((await res.json()) as Seller);
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
          <DialogTitle>Edit seller</DialogTitle>
          <DialogDescription>
            Profile fields. Email and credentials aren&apos;t editable here —
            those live on the auth row.
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
          <Field id="storeName" label="Store name">
            <Input
              id="storeName"
              value={form.storeName}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="sellerType" label="Seller type">
              <Input
                id="sellerType"
                value={form.sellerType}
                onChange={(e) => setForm({ ...form, sellerType: e.target.value })}
                placeholder="e.g. baker, tailor"
              />
            </Field>
            <Field id="mobile" label="Mobile">
              <Input
                id="mobile"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                placeholder="+91…"
              />
            </Field>
          </div>
          <Field id="status" label="Status">
            <Select
              id="status"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as SellerStatus })
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
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
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

function SellerCreateDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    storeName: "",
    language: "en",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/admin/sellers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          name: form.name.trim(),
          storeName: form.storeName.trim() || null,
          language: form.language || null,
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
      onCreated();
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
          <DialogTitle>Add seller</DialogTitle>
          <DialogDescription>
            Provisions an auth credential + seller row in one step. The seller
            receives a welcome email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field id="email" label="Email">
            <Input
              id="email"
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </Field>
          <Field
            id="password"
            label="Initial password"
            hint="Share with the seller out-of-band; they should change it on first sign-in."
          >
            <Input
              id="password"
              type="text"
              autoComplete="off"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </Field>
          <Field id="name" label="Name">
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field id="storeName" label="Store name (optional)">
            <Input
              id="storeName"
              value={form.storeName}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
            />
          </Field>
          <Field id="language" label="Language">
            <Select
              id="language"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="mr">Marathi</option>
              <option value="ta">Tamil</option>
              <option value="te">Telugu</option>
              <option value="bn">Bengali</option>
              <option value="kn">Kannada</option>
              <option value="gu">Gujarati</option>
              <option value="ml">Malayalam</option>
            </Select>
          </Field>

          {err && (
            <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {err}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Create seller
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
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
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
