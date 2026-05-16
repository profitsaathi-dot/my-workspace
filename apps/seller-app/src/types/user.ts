export type SellerType = "individual" | "social";
export type Subscription = "Free" | "Premium";
export type ThemePreference = "light" | "dark" | "system";
export type PaymentType = "ONLINE" | "UPI_QR" | "BANK_ACCOUNT";

export const SUPPORTED_LANGUAGES = [
  "en",
  "hi",
  "mr",
  "ta",
  "te",
  "bn",
  "kn",
  "gu",
  "ml",
] as const;
export type LanguagePreference = (typeof SUPPORTED_LANGUAGES)[number];

export const SUPPORTED_ACCENTS = [
  "emerald",
  "sky",
  "violet",
  "rose",
  "amber",
] as const;
export type AccentPreference = (typeof SUPPORTED_ACCENTS)[number];

export interface User {
  id?: number;
  name: string;
  email: string;
  publicToken: string;
  storeName?: string;
  sellerType?: SellerType;
  /** 10-digit Indian mobile, captured during onboarding. */
  mobile?: string | null;
  subscription?: Subscription;
  /** ISO timestamp set when the user finishes the onboarding form. */
  onboardedAt?: string | null;
  /** ISO timestamp set when the user verifies their email via OTP. */
  emailVerifiedAt?: string | null;
  language?: LanguagePreference;
  theme?: ThemePreference;
  accent?: AccentPreference;
  paymentType?: PaymentType | null;
  /** Stored filename of the uploaded UPI QR image — relative to the upload dir. */
  paymentQRCode?: string | null;
  /** IFSC of the linked bank account. The account number itself is write-only and never echoed by /me. */
  bankAccountIfsc?: string | null;
  /** Masked tail of the saved account number, e.g. "•••• 1234". Render-only — null when nothing saved. */
  bankAccountMasked?: string | null;
  /** True when the seller has a personal Gemini API key on file. The key itself is never sent to the browser. */
  geminiApiKeySet?: boolean;
  /** True when an OpenRouter API key is on file. */
  openrouterApiKeySet?: boolean;
  /** True when an NVIDIA NIM API key is on file. */
  nvidiaApiKeySet?: boolean;
  /** Which provider the router tries first; null when nothing's configured. */
  aiPrimaryProvider?: "GEMINI" | "OPENROUTER" | "NVIDIA" | null;
  /** Whether the seller wants the Monday-morning business pulse email. */
  weeklyReportOptIn?: boolean;
  /** Whether the seller wants the monthly business report email. */
  monthlyReportOptIn?: boolean;
}
