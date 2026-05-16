"use client";

import { use, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  Globe,
  Loader2,
  Mail,
  Package,
  Phone,
  RefreshCcw,
  ShoppingBag,
  Store,
  Tag,
  Wallet,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  StatCard,
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
  paymentType?: string | null;
  publicToken?: string;
  createdAt?: string;
  onboardedAt?: string | null;
  emailVerifiedAt?: string | null;
}

interface OrderStats {
  total: number;
  totalRevenue: number;
  averageOrderValue: number;
  lastOrderAt?: string | null;
  byOrderStatus: Record<string, number>;
  byPaymentStatus: Record<string, number>;
}

interface ProductStats {
  total: number;
  active: number;
  inactive: number;
}

interface SellerReport {
  seller: Seller;
  orders: OrderStats;
  products: ProductStats;
}

const STATUS_VARIANT: Record<
  SellerStatus,
  "success" | "default" | "warning" | "danger"
> = {
  ACTIVE: "success",
  INACTIVE: "default",
  SUSPENDED: "warning",
  BLOCKED: "danger",
};

export default function SellerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [report, setReport] = useState<SellerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/admin/sellers/${id}/report`, {
        cache: "no-store",
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
      setReport((await res.json()) as SellerReport);
    } catch (e) {
      setError((e as Error).message || "Failed to load seller report");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const seller = report?.seller;

  return (
    <>
      <Topbar
        title={seller?.name ?? "Seller details"}
        subtitle={
          seller?.email
            ? `${seller.email}${seller.storeName ? ` · ${seller.storeName}` : ""}`
            : "Consolidated profile + sales report"
        }
        actions={
          <div className="flex items-center gap-2">
            <a href={`${BASE_PATH}/sellers`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="size-3.5" />
                Back
              </Button>
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="size-3.5" />
              )}
              Refresh
            </Button>
          </div>
        }
      />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-3 sm:p-4 sm:gap-6 lg:p-6">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loading || !report ? (
          <ReportSkeleton />
        ) : (
          <>
            <ProfileCard seller={report.seller} />

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total orders"
                value={report.orders.total.toLocaleString()}
                icon={<ShoppingBag className="size-4 text-[color:var(--accent)]" />}
                hint={
                  report.orders.lastOrderAt
                    ? `Last: ${formatDateTime(report.orders.lastOrderAt)}`
                    : "No orders yet"
                }
              />
              <StatCard
                title="Total revenue"
                value={formatMoney(report.orders.totalRevenue)}
                icon={
                  <CircleDollarSign className="size-4 text-[color:var(--accent)]" />
                }
                hint="Sum of order totalCost"
              />
              <StatCard
                title="Avg order value"
                value={formatMoney(report.orders.averageOrderValue)}
                icon={<Wallet className="size-4 text-[color:var(--accent)]" />}
                hint={
                  report.orders.total > 0 ? "Across all orders" : "—"
                }
              />
              <StatCard
                title="Products"
                value={report.products.total.toLocaleString()}
                icon={<Package className="size-4 text-[color:var(--accent)]" />}
                hint={`${report.products.active} active · ${report.products.inactive} inactive`}
              />
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <BreakdownCard
                title="Orders by status"
                description="Distribution of orderStatus across this seller's orders"
                buckets={report.orders.byOrderStatus}
              />
              <BreakdownCard
                title="Payments by status"
                description="Distribution of paymentStatus (PENDING / PAID / REFUNDED…)"
                buckets={report.orders.byPaymentStatus}
              />
            </section>
          </>
        )}
      </main>
    </>
  );
}

function ProfileCard({ seller }: { seller: Seller }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Store className="size-4 text-[color:var(--accent)]" />
              {seller.name}
            </CardTitle>
            <CardDescription>
              {seller.storeName || "No store name set"}
            </CardDescription>
          </div>
          <Badge variant={STATUS_VARIANT[seller.status]}>
            {seller.status[0] + seller.status.slice(1).toLowerCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ProfileRow icon={<Mail className="size-3.5" />} label="Email" value={seller.email} />
        <ProfileRow
          icon={<Phone className="size-3.5" />}
          label="Mobile"
          value={seller.mobile || "—"}
        />
        <ProfileRow
          icon={<Tag className="size-3.5" />}
          label="Account type"
          value={seller.sellerType || "Not set"}
        />
        <ProfileRow
          icon={<Globe className="size-3.5" />}
          label="Language"
          value={seller.language ? seller.language.toUpperCase() : "Default"}
        />
        <ProfileRow
          icon={<Wallet className="size-3.5" />}
          label="Payment type"
          value={seller.paymentType || "Not configured"}
        />
        <ProfileRow
          icon={<CalendarDays className="size-3.5" />}
          label="Onboarded"
          value={seller.onboardedAt ? formatDate(seller.onboardedAt) : "Not onboarded"}
        />
        <ProfileRow
          icon={<CalendarDays className="size-3.5" />}
          label="Joined"
          value={seller.createdAt ? formatDate(seller.createdAt) : "—"}
        />
        <ProfileRow
          icon={<Mail className="size-3.5" />}
          label="Email verified"
          value={
            seller.emailVerifiedAt
              ? formatDate(seller.emailVerifiedAt)
              : "Not verified"
          }
        />
        <ProfileRow
          icon={<Tag className="size-3.5" />}
          label="Public token"
          value={seller.publicToken ?? "—"}
          mono
        />
      </CardContent>
    </Card>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={`mt-1 truncate text-sm text-foreground ${mono ? "font-mono text-xs" : ""}`}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  description,
  buckets,
}: {
  title: string;
  description: string;
  buckets: Record<string, number>;
}) {
  const entries = Object.entries(buckets);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => {
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <li key={status} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-foreground">
                        {status}
                      </span>
                      <span className="text-muted-foreground">
                        {count.toLocaleString()} ·{" "}
                        {pct.toFixed(pct < 10 ? 1 : 0)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[color:var(--accent)]"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ReportSkeleton() {
  return (
    <>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-2 h-3 w-32" />
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 shadow-sm">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-4 h-7 w-16" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </section>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-64" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function formatMoney(n: number | string | undefined | null): string {
  if (n == null) return "—";
  const num = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(num)) return "—";
  return INR.format(num);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
