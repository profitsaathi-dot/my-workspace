"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import {
  Bell,
  Globe,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Palette,
  Save,
  Shield,
  Store,
  User,
  Wand2,
  Moon,
  Smartphone
} from "lucide-react";
import {
  AccentPicker,
  ACCENTS,
  Badge,
  Button,
  ThemeToggle,
  Topbar,
  type AccentChoice,
  type ThemeChoice,
  useAccent,
} from "@workspace/ui";
import { useUserStore } from "@/src/stores/user.store";
import { useT } from "@/src/i18n/useT";
import { env } from "@/src/config/env";
import {
  SUPPORTED_LANGUAGES,
  type AccentPreference,
  type LanguagePreference,
  type ThemePreference,
} from "@/src/types/user";
import { PaymentSection } from "./_components/PaymentSection";
import { AiKeySection } from "./_components/AiKeySection";
import { PasskeySection } from "./_components/PasskeySection";

const LANG_KEY = "ps_lang";

async function savePreferences(patch: {
  language?: LanguagePreference;
  theme?: ThemePreference;
  accent?: AccentPreference;
  weeklyReportOptIn?: boolean;
  monthlyReportOptIn?: boolean;
}) {
  const res = await fetch("/api/user/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as { language: string | null; theme: string | null };
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = useUserStore((s) => s.user);
  const patchUser = useUserStore((s) => s.patchUser);
  const t = useT();

  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<LanguagePreference>("en");
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [monthlyReport, setMonthlyReport] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const fallback = user?.publicToken
      ? user.publicToken.charAt(0).toUpperCase() + user.publicToken.slice(1)
      : "";
    setStoreName(user?.storeName ?? fallback);
  }, [user?.storeName, user?.publicToken]);

  useEffect(() => {
    if (user?.mobile) setPhone(user.mobile);
  }, [user?.mobile]);

  useEffect(() => {
    if (user?.language) {
      setLanguage(user.language);
      return;
    }
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved && (SUPPORTED_LANGUAGES as readonly string[]).includes(saved)) {
      setLanguage(saved as LanguagePreference);
    }
  }, [user?.language]);

  useEffect(() => {
    if (user?.weeklyReportOptIn !== undefined) setWeeklyReport(user.weeklyReportOptIn);
    if (user?.monthlyReportOptIn !== undefined) setMonthlyReport(user.monthlyReportOptIn);
  }, [user?.weeklyReportOptIn, user?.monthlyReportOptIn]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      patchUser({
        storeName: storeName.trim(),
        mobile: phone || null,
      });

      await savePreferences({ language });
      patchUser({ language });
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LANG_KEY, language);
        document.documentElement.lang = language;
      }
      setToast(t("settings.saved"));
    } catch (err) {
      console.error("[settings] save profile failed:", err);
      setToast(t("settings.saveFailed"));
    } finally {
      setSavingProfile(false);
    }
  };

  const saveNotifs = async () => {
    setSavingNotifs(true);
    try {
      await savePreferences({
        weeklyReportOptIn: weeklyReport,
        monthlyReportOptIn: monthlyReport,
      });
      patchUser({
        weeklyReportOptIn: weeklyReport,
        monthlyReportOptIn: monthlyReport,
      });
      setToast(t("settings.saved"));
    } catch (err) {
      console.error("[settings] save notifications failed:", err);
      setToast(t("settings.saveFailed"));
    } finally {
      setSavingNotifs(false);
    }
  };

  const signOutClick = async () => {
    window.location.href = "/api/auth/logout";
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <Topbar title={t("settings.title")} subtitle={t("settings.subtitle")} />

      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-[color:var(--accent-soft)] px-4 py-3 text-sm font-medium text-[color:var(--accent)] ring-1 ring-inset ring-[color:var(--accent)]/30 shadow-lg animate-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
        
        {/* PROFILE SECTION */}
        <SettingsGroup title={t("settings.profile")} footer={t("settings.profileDesc")}>
          <SettingsRow icon={<Mail />} iconColor="bg-blue-500" label={t("common.email")}>
            <span className="text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
              {user?.email ?? session?.user?.email ?? "—"}
            </span>
          </SettingsRow>
          <SettingsRow icon={<KeyRound />} iconColor="bg-zinc-500" label={t("common.storeToken")}>
            <span className="font-mono text-muted-foreground">
              {user?.publicToken ?? "—"}
            </span>
          </SettingsRow>
          <SettingsRow icon={<Shield />} iconColor="bg-emerald-500" label={t("common.authProvider")} isLast>
            <Badge variant="success" className="ml-auto">{t("settings.authPasswordLabel")}</Badge>
          </SettingsRow>
        </SettingsGroup>

        {/* SECURITY SECTIONS */}
        <div className="flex flex-col gap-6 [&>*]:mb-0">
          <PasskeySection onToast={(message) => setToast(message)} />
        </div>

        {/* STORE SETTINGS */}
        <SettingsGroup 
          title={t("settings.store")} 
          footer={storeName.trim() ? `Public Link: ${(env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "")}/user/${storeName.trim().replace(/\s+/g, "_").replace(/^_+|_+$/g, "")}/store` : ""}
        >
          <SettingsRow icon={<Store />} iconColor="bg-orange-500" label={t("settings.storeName")}>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder={user?.publicToken ?? "Hearth & Form"}
              className="w-full bg-transparent text-right text-[15px] outline-none placeholder:text-muted-foreground"
            />
          </SettingsRow>
          <SettingsRow icon={<Smartphone />} iconColor="bg-indigo-500" label={t("settings.contactPhone")}>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="9876543210"
              className="w-full bg-transparent text-right text-[15px] outline-none placeholder:text-muted-foreground"
            />
          </SettingsRow>
          <SettingsRow icon={<Globe />} iconColor="bg-cyan-500" label={t("settings.language")}>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguagePreference)}
              className="appearance-none bg-transparent text-right text-[15px] outline-none pl-4 pr-2 text-muted-foreground"
              dir="rtl"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="bn">বাংলা (Bengali)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
              <option value="gu">ગુજરાતી (Gujarati)</option>
              <option value="ml">മലയാളം (Malayalam)</option>
            </select>
          </SettingsRow>
          <SettingsActionRow isLast onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? (
              <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> {t("settings.saving")}</span>
            ) : (
              <span className="text-blue-600 dark:text-blue-500 font-medium">{t("settings.saveStore")}</span>
            )}
          </SettingsActionRow>
        </SettingsGroup>

        {/* PAYMENT & AI KEYS */}
        <div className="flex flex-col gap-6 [&>*]:mb-0" id="ai-keys">
          <PaymentSection />
          <AiKeySection />
        </div>

        {/* APPEARANCE */}
        <ThemeSection
          onSaved={(label) => setToast(label)}
          onError={() => setToast(t("settings.saveFailed"))}
        />

        {/* NOTIFICATIONS */}
        <SettingsGroup title={t("settings.notifications")} footer={t("settings.notificationsDesc")}>
          <SettingsToggleRow
            icon={<Bell />}
            iconColor="bg-rose-500"
            title={t("settings.weeklyReport")}
            checked={weeklyReport}
            onChange={setWeeklyReport}
          />
          <SettingsToggleRow
            icon={<Bell />}
            iconColor="bg-rose-500"
            title={t("settings.monthlyReport")}
            checked={monthlyReport}
            onChange={setMonthlyReport}
          />
          <SettingsActionRow isLast onClick={saveNotifs} disabled={savingNotifs}>
            {savingNotifs ? (
              <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> {t("settings.saving")}</span>
            ) : (
              <span className="text-blue-600 dark:text-blue-500 font-medium">{t("settings.savePreferences")}</span>
            )}
          </SettingsActionRow>
        </SettingsGroup>

        {/* DANGER ZONE */}
        <SettingsGroup title={t("settings.account")} footer="Sign out of all devices on this browser">
          <SettingsActionRow isLast onClick={signOutClick} className="text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
            <span className="flex items-center gap-2 font-medium justify-center w-full">
              <LogOut className="size-4" />
              {t("settings.signOut")}
            </span>
          </SettingsActionRow>
        </SettingsGroup>
      </main>
    </div>
  );
}

function ThemeSection({
  onSaved,
  onError,
}: {
  onSaved: (label: string) => void;
  onError: (err: unknown) => void;
}) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [accent, setAccent] = useAccent();
  const [mounted, setMounted] = useState(false);
  const patchUser = useUserStore((s) => s.patchUser);
  const userAccent = useUserStore((s) => s.user?.accent);
  const t = useT();
  
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (userAccent && userAccent !== accent) {
      setAccent(userAccent as AccentChoice);
    }
  }, [userAccent]);

  const value: ThemeChoice = mounted ? ((theme ?? "system") as ThemeChoice) : "system";

  const handleThemeChange = async (next: ThemeChoice) => {
    setTheme(next);
    try {
      await savePreferences({ theme: next as ThemePreference });
      patchUser({ theme: next as ThemePreference });
      onSaved(t("settings.themeSaved"));
    } catch (err) {
      onError(err);
    }
  };

  const handleAccentChange = async (next: AccentChoice) => {
    setAccent(next);
    try {
      await savePreferences({ accent: next as AccentPreference });
      patchUser({ accent: next as AccentPreference });
      onSaved(t("settings.saved"));
    } catch (err) {
      onError(err);
    }
  };

  return (
    <SettingsGroup title={t("settings.appearance")}>
      <SettingsRow icon={<Moon />} iconColor="bg-violet-500" label={t("settings.theme")}>
        <div className="flex justify-end ml-4">
          <ThemeToggle value={value} onChange={handleThemeChange} />
        </div>
      </SettingsRow>
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex size-7 items-center justify-center rounded-[10px] text-white bg-fuchsia-500">
            <Palette className="size-4" />
          </div>
          <span className="text-[15px] font-medium">{t("settings.accent")}</span>
        </div>
        {mounted && (
          <div className="mb-6">
            <AccentPicker value={accent as AccentChoice} onChange={handleAccentChange} />
          </div>
        )}
        {mounted && (
          <div className="grid grid-cols-2 gap-4">
            <ThemePreview kind="light" active={resolvedTheme === "light"} />
            <ThemePreview kind="dark" active={resolvedTheme === "dark"} />
          </div>
        )}
      </div>
    </SettingsGroup>
  );
}

// --- NATIVE MOBILE UI COMPONENTS ---

function SettingsGroup({ title, footer, children }: { title?: string; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col">
      {title && (
        <h2 className="mb-2 ml-4 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      )}
      <div className="overflow-hidden rounded-xl bg-card shadow-sm border">
        {children}
      </div>
      {footer && (
        <p className="mt-2 ml-4 text-[13px] text-muted-foreground leading-relaxed">
          {footer}
        </p>
      )}
    </section>
  );
}

function SettingsRow({
  icon,
  iconColor,
  label,
  children,
  isLast = false,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className="relative flex items-center bg-card hover:bg-muted/30 transition-colors">
      <div className="flex w-full items-center justify-between gap-4 py-2.5 pl-4 pr-4 sm:pl-5">
        <div className="flex items-center gap-3 shrink-0">
          <div className={`flex size-[30px] items-center justify-center rounded-[8px] text-white ${iconColor}`}>
            <div className="[&>svg]:size-[18px]">{icon}</div>
          </div>
          <span className="text-[15px] font-medium">{label}</span>
        </div>
        <div className="flex-1 flex justify-end text-[15px] text-muted-foreground overflow-hidden">
          {children}
        </div>
      </div>
      {!isLast && <div className="absolute bottom-0 left-[56px] right-0 h-[1px] bg-border" />}
    </div>
  );
}

function SettingsToggleRow({
  icon,
  iconColor,
  title,
  checked,
  onChange,
  isLast = false,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <div className="relative flex items-center bg-card hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onChange(!checked)}>
      <div className="flex w-full items-center justify-between gap-4 py-2.5 pl-4 pr-4 sm:pl-5">
        <div className="flex items-center gap-3">
          <div className={`flex size-[30px] items-center justify-center rounded-[8px] text-white ${iconColor}`}>
            <div className="[&>svg]:size-[18px]">{icon}</div>
          </div>
          <span className="text-[15px] font-medium">{title}</span>
        </div>
        <span
          aria-checked={checked}
          role="switch"
          className="relative inline-flex h-[28px] w-[50px] shrink-0 items-center rounded-full transition-colors duration-200"
          style={{ background: checked ? "var(--accent)" : "var(--muted-foreground)" }}
        >
          <span
            className={`inline-block size-[24px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
              checked ? "translate-x-[24px]" : "translate-x-[2px]"
            }`}
          />
        </span>
      </div>
      {!isLast && <div className="absolute bottom-0 left-[56px] right-0 h-[1px] bg-border" />}
    </div>
  );
}

function SettingsActionRow({
  children,
  onClick,
  disabled,
  isLast = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  isLast?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative w-full flex items-center justify-center bg-card py-3.5 px-4 hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
      {!isLast && <div className="absolute bottom-0 left-4 right-0 h-[1px] bg-border" />}
    </button>
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
      className={`overflow-hidden rounded-xl border-2 transition ${
        active ? "border-[color:var(--accent)]" : "border-border"
      }`}
    >
      <div
        className="flex flex-col gap-2.5 p-3.5"
        style={{
          background: isDark ? "#09090b" : "#ffffff",
          color: isDark ? "#ffffff" : "#18181b",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="size-3.5 rounded-full" style={{ background: accentHex }} />
          <span className="text-xs font-semibold">{isDark ? "Dark Theme" : "Light Theme"}</span>
          {active && (
            <span
              className="ml-auto rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide"
              style={{ background: accentHex, color: "#ffffff" }}
            >
              ACTIVE
            </span>
          )}
        </div>
        <div
          className="h-2 w-3/4 rounded-full mt-1"
          style={{ background: isDark ? "#27272a" : "#f4f4f5" }}
        />
        <div
          className="h-2 w-1/2 rounded-full"
          style={{ background: isDark ? "#27272a" : "#f4f4f5" }}
        />
        <div className="mt-2 h-7 w-full rounded-md opacity-80" style={{ background: accentHex }} />
      </div>
    </div>
  );
}