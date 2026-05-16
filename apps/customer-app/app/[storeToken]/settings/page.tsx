"use client";

import React, { useEffect, useState,useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import {
  Settings,
  User,
  Lock,
  Moon,
  Sun,
  Globe,
  ChevronRight,
  ArrowLeft,
  Info,
  MapPin,
  Trash2,
  Edit2,
  Palette,
} from "lucide-react";
import { notificationManager } from "@/app/lib/notificationManager";
import { LANGUAGES, type Locale } from "@/i18n";
import { useTranslations } from "next-intl";
import {
  AccentPicker,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  toast,
} from "@workspace/ui";
import { useAccentCookie } from "@/app/lib/useAccentCookie";
import { useStoreInfo } from "../context/store-info-context";

type Section =
  | "main"
  | "profile"
  | "security"
  | "app"
  | "address"
  | "notifications"
  | "preferences";

type Address = {
  id: number | null;
  street: string;
  city: string;
  state: string;
  zip: string;
  contactNumber: number | string | null;
  alternativeContactNumber: number | string | null;
  isDefault?: boolean;
};

export default function SettingsPage() {
  const router = useRouter();
  const { storeToken } = useParams<{ storeToken: string }>();
  const { theme, setTheme } = useTheme();
  const { data: session, status } = useSession();
  const [accent, setAccent] = useAccentCookie();
  const t = useTranslations("customer.settings");
  const { isSocial } = useStoreInfo();

  const isLoggedIn = !!session;

  const [active, setActive] = useState<Section>("main");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const pincodeAbortRef = useRef<AbortController | null>(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeValid, setPincodeValid] = useState<boolean | null>(null);
  

  const [form, setForm] = useState<{
    name: string;
    email: string;
    password: string;
    notifications: boolean;
    darkMode: boolean;
    language: Locale;
  }>({
    name: "",
    email: "",
    password: "",
    notifications: true,
    darkMode: false,
    language: "en",
  });

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

const [newAddress, setNewAddress] = useState<Address>({
  id: null,
  street: "",
  city: "",
  state: "",
  zip: "",
  contactNumber: "",
  alternativeContactNumber: "",
});

  const isAddressValid =
  !!newAddress.street &&
  !!newAddress.city &&
  !!newAddress.state &&
  !!newAddress.zip &&
  pincodeValid === true;

  // Social-seller stores skip address/profile/security since there's no
  // login or saved-address flow on these stores.
  const menuItems = [
    { label: t("profile"), icon: <User size={18} />, section: "profile", protected: true, hideForSocial: true },
    { label: t("security"), icon: <Lock size={18} />, section: "security", protected: true, hideForSocial: true },
    { label: t("address"), icon: <MapPin size={18} />, section: "address", protected: false, hideForSocial: true },
    { label: t("notifications"), icon: <Info size={18} />, section: "notifications", protected: false, hideForSocial: false },
    { label: t("preferences"), icon: <Settings size={18} />, section: "preferences", protected: false, hideForSocial: false },
    { label: t("appInfo"), icon: <Info size={18} />, section: "app", protected: false, hideForSocial: false },
  ].filter((item) => !(isSocial && item.hideForSocial));

  const canAccess = (section: Section) => {
    const protectedSections = ["profile", "security"];
    return !protectedSections.includes(section) || isLoggedIn;
  };

  const [searchLang, setSearchLang] = useState("");

  const filteredLanguages = LANGUAGES.filter((l) => {
    const q = searchLang.toLowerCase();
    return (
      l.label.toLowerCase().includes(q) ||
      l.native.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q)
    );
  });

  // Map any persisted value (locale code OR English label) onto a known code.
  const toLocale = (v: string | undefined | null): Locale | null => {
    if (!v) return null;
    const lower = v.toLowerCase();
    const byCode = LANGUAGES.find((l) => l.code === lower);
    if (byCode) return byCode.code;
    const byLabel = LANGUAGES.find((l) => l.label.toLowerCase() === lower);
    return byLabel ? byLabel.code : null;
  };

  useEffect(() => {
    const match = document.cookie.match(/locale=([^;]+)/);
    const initial = toLocale(match?.[1] ? decodeURIComponent(match[1]) : null);
    if (initial) {
      setForm((prev) => ({ ...prev, language: initial }));
    }
  }, []);

  useEffect(() => {
    if (!form.notifications) return;
    if (typeof notificationManager?.enable === 'function') {
      notificationManager.enable();
    }
  }, [form.notifications]);

  const fetchAddresses = async () => {
    try {
      const res = await fetch("/user/api/address");
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
      }
    } catch (err) {
      console.error("Failed to load addresses", err);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/user/api/user");
        if (!res.ok) return;

        const data = await res.json();

        setForm((prev) => ({
          ...prev,
          name: data.name || "",
          email: data.email || "",
          notifications: data.notifications ?? true,
          language: toLocale(data.language) ?? prev.language,
        }));

        if (data.addresses) {
          setAddresses(
            data.addresses.map((a: any) => ({
              ...a,
              id: a.id ?? Date.now() + Math.random(),
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load user", err);
      }
    };

    if (status === "authenticated") {
      fetchUser();
      fetchAddresses();
    }
  }, [status]);

  const addAddress = async () => {
    if (!newAddress.street || !newAddress.city) return;
    setSaving(true);

    try {
      const res = await fetch("/user/api/address/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddress),
      });

      if (!res.ok) throw new Error("Failed to add");

      const addedAddress = await res.json();
      setAddresses([...addresses, addedAddress]);

      setNewAddress({ id: Date.now(), street: "", city: "", state: "", zip: "", contactNumber: "", alternativeContactNumber: "", isDefault: false });
      toast.success("Address added");
    } catch (err) {
      toast.error("Failed to add address");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    try {
      const res = await fetch(`/user/api/address/delete?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      setAddresses(addresses.filter((a) => a.id !== id));
      toast.success("Address removed");
    } catch (err) {
      toast.error("Failed to delete address");
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);

    try {
      const res = await fetch(`/user/api/address/update?id=${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddress),
      });

      if (!res.ok) throw new Error("Failed to update");

      const updatedAddress = await res.json();

      setAddresses(addresses.map((a) => (a.id === editingId ? updatedAddress : a)));

      setEditingId(null);
      setNewAddress({ id: Date.now(), street: "", city: "", state: "", zip: "", contactNumber: "", alternativeContactNumber: "", isDefault: false });
      toast.success("Address updated");
    } catch (err) {
      toast.error("Failed to update address");
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (id: number) => {
    const targetAddress = addresses.find((a) => a.id === id);
    if (!targetAddress) return;

    try {
      const res = await fetch(`/user/api/address/update?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...targetAddress, isDefault: true }),
      });

      if (!res.ok) throw new Error("Failed to set default");

      fetchAddresses();
      toast.success("Default address updated");
    } catch (err) {
      toast.error("Failed to set default address");
    }
  };

  const save = async () => {
    setSaving(true);

    try {
      const payload: any = {
        name: form.name,
        email: form.email,
        notifications: form.notifications,
        language: form.language,
        addresses,
      };

      if (form.password) payload.password = form.password;

      const res = await fetch(`/user/api/user/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed");

      // Persist for next-intl (read in i18n/request.ts on the next request).
      document.cookie = `locale=${form.language}; path=/; max-age=${60 * 60 * 24 * 365}`;
      toast.success(t("saved"));
    } catch (err) {
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (addr: Address) => {
  setEditingId(addr.id);
  setNewAddress(addr);

  // Existing saved address already has a valid pincode
  setPincodeValid(true);
};

  const lookupPincode = async (pin: string) => {
  if (!/^\d{6}$/.test(pin)) return;

  pincodeAbortRef.current?.abort();

  const ctrl = new AbortController();
  pincodeAbortRef.current = ctrl;

  setPincodeLoading(true);

  try {
    const res = await fetch(
      `https://api.postalpincode.in/pincode/${pin}`,
      { signal: ctrl.signal }
    );

    if (!res.ok) {
      setPincodeValid(false);
      return;
    }

    const data = await res.json();

    const entry = data?.[0];
    const po = entry?.PostOffice?.[0];

    if (entry?.Status === "Success" && po) {
      setNewAddress((prev) => ({
        ...prev,
        city: po.District || "",
        state: po.State || "",
      }));

      setPincodeValid(true);
    } else {
      setPincodeValid(false);
      toast.error("Invalid pincode");
    }
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      setPincodeValid(false);
      toast.error("Failed to fetch pincode");
    }
  } finally {
    setPincodeLoading(false);
  }
};
  

 
  const changeLanguage = (next: Locale) => {
    if (next === form.language) return;
    setForm((prev) => ({ ...prev, language: next }));
    // Persist for next-intl, then reload so the request-scoped messages refresh.
    document.cookie = `locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  };

  const inputClassName =
    "w-full px-3 py-2.5 rounded-lg bg-[color:var(--input)] border border-themed focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] text-sm transition";

  return (
    <div className="flex-1 pb-10 min-h-full bg-background">
      {status === "loading" ? (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse text-sm text-muted-foreground">
            {t("loading")}
          </div>
        </div>
      ) : (
        <>
          {/* HEADER */}
          <div className="p-4 max-w-2xl mx-auto">
            <div className="bg-card border border-themed rounded-xl p-6 flex items-center gap-4">
              <div className="grid size-12 place-items-center rounded-lg bg-[color:var(--accent-soft)] text-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/20">
                <Settings size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
                <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
              </div>
            </div>
          </div>

          <div className="p-4 max-w-2xl mx-auto">
            {/* MAIN MENU */}
            {active === "main" && (
              <div className="space-y-3">
                {!isLoggedIn && !isSocial && (
                  <div className="p-5 rounded-xl border border-[color:var(--accent)]/30 bg-[color:var(--accent-soft)] mb-6">
                    <p className="text-base font-semibold text-[color:var(--accent)]">
                      {t("pleaseLoginCard")}
                    </p>
                    <p className="text-sm text-foreground/70 mt-1 mb-4">
                      {t("profileSecurityLocked")}
                    </p>
                    <Button onClick={() => router.push(`/${storeToken}/login`)}>
                      {t("loginSignIn")}
                    </Button>
                  </div>
                )}

                <div className="bg-card rounded-xl border border-themed overflow-hidden">
                  {menuItems
                    .filter((item) => !(item.protected && !isLoggedIn))
                    .map((item, index, array) => (
                      <MenuItem
                        key={item.section}
                        label={item.label}
                        icon={item.icon}
                        isLast={index === array.length - 1}
                        onClick={() => {
                          if (!canAccess(item.section as Section)) {
                            toast.error("Please login to access this section");
                            return;
                          }
                          setActive(item.section as Section);
                        }}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* PROFILE */}
            {active === "profile" && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <SectionHeader title="Profile Information" onBack={() => setActive("main")} />
                <div className="space-y-4 bg-card p-5 rounded-xl border border-themed">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 ml-1">Full Name</label>
                    <input
                      className={inputClassName}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 ml-1">Email Address</label>
                    <input
                      className={inputClassName}
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <SaveButton onClick={save} saving={saving} />
              </div>
            )}

            {/* SECURITY */}
            {active === "security" && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <SectionHeader title="Security" onBack={() => setActive("main")} />
                <div className="space-y-4 bg-card p-5 rounded-xl border border-themed">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 ml-1">New Password</label>
                    <input
                      type="password"
                      className={inputClassName}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Leave blank to keep current"
                    />
                  </div>
                </div>
                <SaveButton onClick={save} saving={saving} />
              </div>
            )}

            {/* ADDRESS */}
            {active === "address" && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <SectionHeader title="Saved Addresses" onBack={() => setActive("main")} />

                {/* Address List */}
                <div className="space-y-3">
                  {addresses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-card rounded-xl border border-themed">No addresses saved yet.</p>
                  ) : (
                    addresses.map((addr) => (
                      <div key={addr.id} className="p-4 bg-card border border-themed rounded-xl flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{addr.street}</p>
                          <p className="text-xs text-muted-foreground mt-1">{addr.city}, {addr.state} {addr.zip}</p>
                          {addr.isDefault && (
                            <span className="inline-block mt-2 px-2 py-0.5 bg-[color:var(--accent-soft)] text-[color:var(--accent)] text-[10px] rounded-full font-semibold">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex gap-3 text-muted-foreground items-center">
                          <button onClick={() => startEdit(addr)} disabled={saving} className="hover:text-[color:var(--accent)] transition" aria-label="Edit"><Edit2 size={16} /></button>
                          <button onClick={() => setDeleteId(addr.id!)} disabled={saving} className="hover:text-red-500 transition" aria-label="Delete"><Trash2 size={16} /></button>
                          {!addr.isDefault && (
                            <button onClick={() => setDefault(addr.id!)} disabled={saving} className="text-xs hover:text-[color:var(--accent)] transition underline">Set Default</button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add / Edit Form */}
                <div className="p-5 bg-card border border-themed rounded-xl space-y-4">
                  <h3 className="text-sm font-semibold">{editingId ? "Edit Address" : "Add New Address"}</h3>

                  <input
                    className={inputClassName}
                    value={newAddress.street || ""}
                    onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                    placeholder="Street Address"
                  />

                  <div className="flex gap-3">
                    <input
                      className={inputClassName}
                      value={newAddress.city || ""}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      placeholder="City"
                    />
                    <input
                      className={inputClassName}
                      value={newAddress.state || ""}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      placeholder="State"
                    />
                  </div>

                  <input
  type="text"
  inputMode="numeric"
  maxLength={6}
  className={inputClassName}
  value={newAddress.zip || ""}
  onChange={(e) => {
    const value = e.target.value.replace(/\D/g, "");

    setNewAddress((prev) => ({
      ...prev,
      zip: value,
    }));

    setPincodeValid(null);

    if (value.length === 6) {
      lookupPincode(value);
    }
  }}
  placeholder="Zip / Postal Code"
/>

{pincodeLoading && (
  <p className="text-xs text-muted-foreground">
    Fetching location...
  </p>
)}

{pincodeValid === true && (
  <p className="text-xs text-green-500">
    Pincode verified
  </p>
)}

{pincodeValid === false && (
  <p className="text-xs text-red-500">
    Invalid pincode
  </p>
)}

                  <input
                    type='number'
                    className={inputClassName}
                    value={newAddress.contactNumber || ""}
                    onChange={(e) => setNewAddress({ ...newAddress, contactNumber: e.target.value })}
                    placeholder="Contact number"
                  />

                  <input
                    type='number'
                    className={inputClassName}
                    value={newAddress.alternativeContactNumber || ""}
                    onChange={(e) => setNewAddress({ ...newAddress, alternativeContactNumber: e.target.value })}
                    placeholder="Alternate Contact number"
                  />

                  <div className="flex gap-3 pt-2">
                    
                    {editingId ? (
                     <Button
                        className="flex-1"
                        onClick={saveEdit}
                        disabled={saving || !isAddressValid || pincodeLoading}
                        >
                        {pincodeLoading
                          ? "Verifying..."
                          : saving
                          ? "Updating..."
                          : "Update"}
                      </Button>
                    ) : (
                      <Button
                        className="flex-1"
                        onClick={addAddress}
                          disabled={saving || !isAddressValid || pincodeLoading}
                            >
                          {pincodeLoading
                           ? "Verifying..."
                            : saving
                            ? "Adding..."
                           : "Add"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS */}
            {active === "notifications" && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <SectionHeader title="Notifications" onBack={() => setActive("main")} />
                <div className="bg-card p-5 rounded-xl border border-themed flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Push Notifications</h3>
                    <p className="text-xs text-muted-foreground mt-1">Receive updates and alerts on this device</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={form.notifications}
                      onChange={(e) => setForm({ ...form, notifications: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-themed after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[color:var(--accent)]" />
                  </label>
                </div>
                <SaveButton onClick={save} saving={saving} />
              </div>
            )}

            {/* PREFERENCES */}
            {active === "preferences" && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <SectionHeader title="Preferences" onBack={() => setActive("main")} />

                {/* Theme Toggle */}
                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="w-full bg-card p-5 rounded-xl border border-themed flex items-center justify-between cursor-pointer text-left hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-lg bg-muted">
                      {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">{t("appTheme")}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{t("tapToToggle")}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-3 py-1 bg-muted rounded-md capitalize">{theme || 'System'}</span>
                </button>

                {/* Accent Color */}
                <div className="bg-card p-5 rounded-xl border border-themed space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-lg bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                      <Palette size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">{t("accentColor")}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{t("accentDesc")}</p>
                    </div>
                  </div>
                  <AccentPicker value={accent} onChange={setAccent} />
                </div>

                {/* Language Selection */}
                <div className="bg-card p-5 rounded-xl border border-themed space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Globe size={18} className="text-muted-foreground" />
                    <h3 className="text-sm font-medium">{t("languageSelection")}</h3>
                  </div>
                  <input
                    className={inputClassName}
                    placeholder={t("searchLanguages")}
                    value={searchLang}
                    onChange={(e) => setSearchLang(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {filteredLanguages.map((lang) => {
                      const active = form.language === lang.code;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => changeLanguage(lang.code)}
                          className={`flex flex-col items-center gap-0.5 py-2 px-3 text-sm rounded-lg border text-center transition ${
                            active
                              ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                              : "border-themed hover:bg-muted"
                          }`}
                        >
                          <span className="font-medium">{lang.native}</span>
                          <span className="text-[11px] text-muted-foreground">{lang.label}</span>
                        </button>
                      );
                    })}
                    {filteredLanguages.length === 0 && (
                      <p className="col-span-2 text-center text-xs text-muted-foreground py-2">
                        {t("noMatches")}
                      </p>
                    )}
                  </div>
                </div>

                <SaveButton onClick={save} saving={saving} />
              </div>
            )}

            {/* APP INFO */}
            {active === "app" && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <SectionHeader title="App Info" onBack={() => setActive("main")} />
                <div className="bg-card p-8 rounded-xl border border-themed text-center space-y-4">
                  <div className="size-16 bg-[color:var(--accent-soft)] text-[color:var(--accent)] ring-1 ring-[color:var(--accent)]/20 rounded-2xl mx-auto flex items-center justify-center">
                    <Info size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">ProfitSaathi</h3>
                    <p className="text-sm text-muted-foreground mt-1">Version 1.0.0</p>
                  </div>
                  <div className="text-xs text-muted-foreground mt-6 pt-6 border-t border-themed">
                    © {new Date().getFullYear()} All rights reserved.
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Delete address confirm dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this address?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the address from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ===============================
 * SUBCOMPONENTS
 * =============================== */

function SectionHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-4 pb-2">
      <button
        onClick={onBack}
        className="p-2.5 bg-card border border-themed rounded-full hover:bg-muted transition shadow-sm"
        aria-label="Back"
      >
        <ArrowLeft size={18} />
      </button>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

function MenuItem({ label, icon, onClick, isLast }: { label: string; icon: React.ReactNode; onClick: () => void; isLast: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex justify-between items-center px-5 py-4 hover:bg-muted/50 transition text-sm ${!isLast ? "border-b border-themed" : ""}`}
    >
      <div className="flex items-center gap-3 font-medium">
        <div className="text-muted-foreground">{icon}</div>
        {label}
      </div>
      <ChevronRight size={18} className="text-muted-foreground" />
    </button>
  );
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  const t = useTranslations("customer.settings");
  return (
    <Button onClick={onClick} disabled={saving} className="w-full" size="lg">
      {saving ? t("saving") : t("save")}
    </Button>
  );
}
