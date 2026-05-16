"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  Bell,
  Cog,
  Globe,
  Loader2,
  LogOut,
  Mail,
  Palette,
  Save,
  Shield,
  Wand2,
} from "lucide-react";
import {
  ACCENTS,
  AccentPicker,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  Separator,
  Skeleton,
  ThemeToggle,
  Topbar,
  type AccentChoice,
  type ThemeChoice,
  useAccent,
} from "@workspace/ui";
import { BASE_PATH } from "@/lib/env";

interface AdminMe {
  email?: string;
  name?: string;
  theme?: string | null;
  accent?: string | null;
  region?: string | null;
  notifyEmail?: boolean;
  notifyWhatsapp?: boolean;
}

interface PreferencesPatch {
  theme?: string;
  accent?: string;
  region?: string;
  notifyEmail?: boolean;
  notifyWhatsapp?: boolean;
}

/**
 * PATCH /admin/preferences via the Next route handler (which attaches the JWT
 * server-side). Throws on non-2xx so callers can surface a toast.
 */
async function patchPreferences(patch: PreferencesPatch): Promise<void> {
  const res = await fetch(`${BASE_PATH}/api/admin/preferences`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.message) detail = body.message;
    } catch {
      // ignore
    }
    throw new Error(detail || `PATCH /admin/preferences failed (${res.status})`);
  }
}

export default function SettingsPage() {
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [whatsappUpdates, setWhatsappUpdates] = useState(false);
  const [region, setRegion] = useState("india");
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [me, setMe] = useState<AdminMe | null>(null);
  const [hydrating, setHydrating] = useState(true);

  // Auto-dismiss toast.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Hydrate from backend on mount. Server is the source of truth — local
  // initial values above are only what we render until the fetch lands.
  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE_PATH}/api/admin/me`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AdminMe | null) => {
        if (cancelled || !data) return;
        setMe(data);
        if (data.region) setRegion(data.region);
        if (typeof data.notifyEmail === "boolean") setEmailUpdates(data.notifyEmail);
        if (typeof data.notifyWhatsapp === "boolean")
          setWhatsappUpdates(data.notifyWhatsapp);
      })
      .catch(() => {
        // Stay on local defaults — toast would be noisy on every load.
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRegionChange = useCallback(
    async (next: string) => {
      const prev = region;
      setRegion(next);
      try {
        await patchPreferences({ region: next });
        setToast("Region updated");
      } catch (err) {
        setRegion(prev);
        setToast((err as Error).message);
      }
    },
    [region],
  );

  const saveNotifs = async () => {
    setSavingNotifs(true);
    try {
      await patchPreferences({
        notifyEmail: emailUpdates,
        notifyWhatsapp: whatsappUpdates,
      });
      setToast("Notification preferences saved");
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setSavingNotifs(false);
    }
  };

  const handleSignOut = useCallback(() => {
    window.location.href = `${BASE_PATH}/api/auth/sign-out`;
  }, []);

  return (
    <>
      <Topbar
        title="Settings"
        subtitle="Operator preferences for this admin console"
        actions={
          hydrating ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Loading…
            </span>
          ) : undefined
        }
      />

      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-[color:var(--accent-soft)] px-4 py-3 text-sm font-medium text-[color:var(--accent)] ring-1 ring-inset ring-[color:var(--accent)]/30">
          {toast}
        </div>
      )}

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-3 sm:p-4 sm:gap-6 lg:p-6">
        {hydrating ? (
          <SettingsSkeleton />
        ) : (
          <SettingsCards
            me={me}
            region={region}
            handleRegionChange={handleRegionChange}
            emailUpdates={emailUpdates}
            setEmailUpdates={setEmailUpdates}
            whatsappUpdates={whatsappUpdates}
            setWhatsappUpdates={setWhatsappUpdates}
            saveNotifs={saveNotifs}
            savingNotifs={savingNotifs}
            handleSignOut={handleSignOut}
            setToast={setToast}
          />
        )}
      </main>
    </>
  );
}

interface SettingsCardsProps {
  me: AdminMe | null;
  region: string;
  handleRegionChange: (next: string) => void;
  emailUpdates: boolean;
  setEmailUpdates: (v: boolean) => void;
  whatsappUpdates: boolean;
  setWhatsappUpdates: (v: boolean) => void;
  saveNotifs: () => void;
  savingNotifs: boolean;
  handleSignOut: () => void;
  setToast: (s: string) => void;
}

function SettingsCards({
  me,
  region,
  handleRegionChange,
  emailUpdates,
  setEmailUpdates,
  whatsappUpdates,
  setWhatsappUpdates,
  saveNotifs,
  savingNotifs,
  handleSignOut,
  setToast,
}: SettingsCardsProps) {
  return (
    <>
        {/* OPERATOR */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cog className="size-4 text-[color:var(--accent)]" />
              Operator
            </CardTitle>
            <CardDescription>
              Identity and authentication for the admin console
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Row icon={<Mail className="size-3.5" />} label="Email">
              <span className="text-sm text-muted-foreground">
                {me?.email ?? "—"}
              </span>
            </Row>
            <Row icon={<Shield className="size-3.5" />} label="Role">
              <Badge variant="success">Platform Admin</Badge>
            </Row>
            <Row icon={<Globe className="size-3.5" />} label="Region">
              <Select
                id="region"
                value={region}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="h-8 w-40"
              >
                <option value="india">India</option>
                <option value="apac">APAC</option>
                <option value="emea">EMEA</option>
              </Select>
            </Row>
          </CardContent>
        </Card>

        {/* APPEARANCE */}
        <ThemeSection
          initialTheme={me?.theme ?? null}
          initialAccent={me?.accent ?? null}
          onSaved={(label) => setToast(label)}
          onError={(msg) => setToast(msg)}
        />

        {/* NOTIFICATIONS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-4 text-[color:var(--accent)]" />
              Notifications
            </CardTitle>
            <CardDescription>
              Where to send platform alerts and AI usage warnings
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ToggleRow
              title="Email updates"
              hint="Daily summary + critical alerts"
              checked={emailUpdates}
              onChange={setEmailUpdates}
            />
            <ToggleRow
              title="WhatsApp updates"
              hint="Real-time alerts via WAHA"
              checked={whatsappUpdates}
              onChange={setWhatsappUpdates}
            />
            <div className="flex justify-end pt-2">
              <Button onClick={saveNotifs} disabled={savingNotifs}>
                <Save className="size-4" />
                {savingNotifs ? "Saving…" : "Save preferences"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* DANGER ZONE */}
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Sign out of all devices on this browser
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              You&apos;ll be signed out and returned to the login screen.
            </div>
            <Button variant="destructive" onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </CardContent>
        </Card>
    </>
  );
}

function ThemeSection({
  initialTheme,
  initialAccent,
  onSaved,
  onError,
}: {
  initialTheme: string | null;
  initialAccent: string | null;
  onSaved: (label: string) => void;
  onError: (msg: string) => void;
}) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [accent, setAccent] = useAccent();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Hydrate theme/accent from backend exactly once after the values arrive.
  // Local (next-themes / useAccent) is the visible source until then; once
  // server prefs land, sync them in if they differ. Empty/null server values
  // mean "no preference yet" — leave the local default alone.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (hydrated || !mounted) return;
    if (initialTheme && initialTheme !== theme) setTheme(initialTheme);
    if (initialAccent && initialAccent !== accent)
      setAccent(initialAccent as AccentChoice);
    if (initialTheme !== null || initialAccent !== null) setHydrated(true);
  }, [initialTheme, initialAccent, hydrated, mounted, theme, accent, setTheme, setAccent]);

  const value: ThemeChoice = mounted
    ? ((theme ?? "system") as ThemeChoice)
    : "system";

  const handleThemeChange = async (next: ThemeChoice) => {
    const prev = theme;
    setTheme(next);
    try {
      await patchPreferences({ theme: next });
      onSaved("Theme updated");
    } catch (err) {
      if (prev) setTheme(prev);
      onError((err as Error).message);
    }
  };

  const handleAccentChange = async (next: AccentChoice) => {
    const prev = accent;
    setAccent(next);
    try {
      await patchPreferences({ accent: next });
      onSaved("Accent updated");
    } catch (err) {
      setAccent(prev);
      onError((err as Error).message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="size-4 text-[color:var(--accent)]" />
          Appearance
        </CardTitle>
        <CardDescription>
          Choose Light, Dark, or follow your operating system. Pick an accent color.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Theme</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {mounted
                ? `Active: ${resolvedTheme === "light" ? "Light" : "Dark"}${
                    value === "system" ? " (matching OS)" : ""
                  }`
                : "—"}
            </div>
          </div>
          <ThemeToggle value={value} onChange={handleThemeChange} />
        </div>

        <Separator />

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-[color:var(--accent)]" />
            <div className="text-sm font-medium">Accent</div>
          </div>
          {mounted && (
            <AccentPicker
              value={accent as AccentChoice}
              onChange={handleAccentChange}
            />
          )}
          <p className="text-xs text-muted-foreground">
            Affects primary buttons, sidebar badges, links, focus rings, and
            highlights. Change is instant — no reload required.
          </p>
        </div>

        {mounted && (
          <div className="grid grid-cols-2 gap-3">
            <ThemePreview kind="light" active={resolvedTheme === "light"} />
            <ThemePreview kind="dark" active={resolvedTheme === "dark"} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ThemePreview({
  kind,
  active,
}: {
  kind: "light" | "dark";
  active: boolean;
}) {
  const isDark = kind === "dark";
  const accentHex =
    typeof document !== "undefined"
      ? ACCENTS.find((a) => a.value === document.documentElement.dataset.accent)
          ?.color ?? "#10b981"
      : "#10b981";

  return (
    <div
      className={`overflow-hidden rounded-lg border-2 transition ${
        active ? "border-[color:var(--accent)]" : "border"
      }`}
    >
      <div
        className="flex flex-col gap-2 p-3"
        style={{
          background: isDark ? "#09090b" : "#fafafa",
          color: isDark ? "#fafafa" : "#18181b",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full" style={{ background: accentHex }} />
          <span className="text-xs font-medium">{isDark ? "Dark" : "Light"}</span>
          {active && (
            <span
              className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: accentHex, color: "#ffffff" }}
            >
              Active
            </span>
          )}
        </div>
        <div
          className="h-1.5 w-3/4 rounded"
          style={{ background: isDark ? "#27272a" : "#e4e4e7" }}
        />
        <div
          className="h-1.5 w-1/2 rounded"
          style={{ background: isDark ? "#27272a" : "#e4e4e7" }}
        />
        <div className="mt-1 h-5 w-16 rounded" style={{ background: accentHex }} />
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2.5 text-left transition hover:bg-muted"
    >
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <span
        aria-checked={checked}
        role="switch"
        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition"
        style={{
          background: checked ? "var(--accent)" : "#3f3f46",
        }}
      >
        <span
          className={`inline-block size-4 rounded-full bg-white transition ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

/**
 * Mirrors the four-card layout (operator + appearance + notifications +
 * account) so the page doesn't shift when /admin/me lands. Heights roughly
 * match each real card so scroll position stays put.
 */
function SettingsSkeleton() {
  return (
    <>
      <CardSkeleton rows={3} />
      <CardSkeleton rows={4} tall />
      <CardSkeleton rows={2} hasButton />
      <CardSkeleton rows={1} hasButton />
    </>
  );
}

function CardSkeleton({
  rows,
  tall,
  hasButton,
}: {
  rows: number;
  tall?: boolean;
  hasButton?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-2 h-3 w-64" />
      <div className={`mt-5 flex flex-col gap-3 ${tall ? "gap-5" : ""}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
      {hasButton && (
        <div className="mt-5 flex justify-end">
          <Skeleton className="h-9 w-36" />
        </div>
      )}
    </div>
  );
}
