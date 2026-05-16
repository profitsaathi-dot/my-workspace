/**
 * Help-page index. Holds the structural metadata for each topic — id,
 * category, video URL, route links — but every user-visible string is an
 * i18n key resolved by `useT()` at render time.
 *
 * Adding a new topic:
 *   1. Pick / add a category (id + labelKey) in {@link HELP_CATEGORIES}.
 *   2. Add an entry to {@link HELP_TOPICS} with stepCount / tipCount /
 *      linkCount matching the keys you'll add to en.json.
 *   3. Add the actual strings to messages/en.json under
 *      `help.t.<topicKey>.title` / `.summary` / `.s0` / `.tip0` /
 *      `.link0` etc. Other locales pick up translations as added —
 *      `useT` falls back to en.json when a key is missing in the active
 *      locale.
 *
 * `videoUrl` accepts any common share URL (youtu.be/<id>, watch URLs,
 * Vimeo, Loom share). The Help page rewrites them to embed form before
 * dropping into an iframe.
 */
import type { MessageKey } from "@/src/i18n/useT";

export interface HelpTopic {
  id: string;
  category: HelpCategoryId;
  /** i18n key for the topic title. */
  titleKey: MessageKey;
  /** i18n key for the one-line summary. */
  summaryKey: MessageKey;
  /** Number of step keys (`<topicKey>.s0`, `.s1`, …). */
  stepCount: number;
  /** Number of tip keys (`<topicKey>.tip0`, …); 0 means no tips. */
  tipCount: number;
  /** Common base for step / tip / link keys, e.g. `help.t.firstSignin`. */
  keyBase: string;
  /** Optional embeddable / share video URL. */
  videoUrl?: string;
  /** Related routes — labels resolved via `<keyBase>.linkN` keys. */
  links?: { labelKeyIndex: number; href: string }[];
}

export type HelpCategoryId =
  | "getting-started"
  | "products"
  | "orders"
  | "tracking"
  | "whatsapp"
  | "payments"
  | "pricing"
  | "settings"
  | "growth";

export const HELP_CATEGORIES: {
  id: HelpCategoryId;
  labelKey: MessageKey;
}[] = [
  { id: "getting-started", labelKey: "help.cat.gettingStarted" },
  { id: "products", labelKey: "help.cat.products" },
  { id: "orders", labelKey: "help.cat.orders" },
  { id: "tracking", labelKey: "help.cat.tracking" },
  { id: "whatsapp", labelKey: "help.cat.whatsapp" },
  { id: "payments", labelKey: "help.cat.payments" },
  { id: "pricing", labelKey: "help.cat.pricing" },
  { id: "settings", labelKey: "help.cat.settings" },
  { id: "growth", labelKey: "help.cat.growth" },
];

export const HELP_TOPICS: HelpTopic[] = [
  // ---------------- GETTING STARTED ----------------
  {
    id: "first-signin",
    category: "getting-started",
    keyBase: "help.t.firstSignin",
    titleKey: "help.t.firstSignin.title",
    summaryKey: "help.t.firstSignin.summary",
    stepCount: 5,
    tipCount: 1,
    links: [
      { labelKeyIndex: 0, href: "/onboarding" },
      { labelKeyIndex: 1, href: "/verify-email" },
    ],
  },
  {
    id: "onboarding-fields",
    category: "getting-started",
    keyBase: "help.t.onboardingFields",
    titleKey: "help.t.onboardingFields.title",
    summaryKey: "help.t.onboardingFields.summary",
    stepCount: 4,
    tipCount: 2,
    videoUrl: "https://youtu.be/TfOcbqjpRS8?si=nY_PSRDAX3Pq0z4W",
  },

  // ---------------- PRODUCTS ----------------
  {
    id: "add-product",
    category: "products",
    keyBase: "help.t.addProduct",
    titleKey: "help.t.addProduct.title",
    summaryKey: "help.t.addProduct.summary",
    stepCount: 5,
    tipCount: 2,
    links: [{ labelKeyIndex: 0, href: "/products/new" }],
  },
  {
    id: "edit-product",
    category: "products",
    keyBase: "help.t.editProduct",
    titleKey: "help.t.editProduct.title",
    summaryKey: "help.t.editProduct.summary",
    stepCount: 4,
    tipCount: 1,
  },
  {
    id: "dynamic-pricing",
    category: "products",
    keyBase: "help.t.dynamicPricing",
    titleKey: "help.t.dynamicPricing.title",
    summaryKey: "help.t.dynamicPricing.summary",
    stepCount: 6,
    tipCount: 2,
    links: [{ labelKeyIndex: 0, href: "/products/dynamic" }],
  },

  // ---------------- ORDERS ----------------
  {
    id: "create-order",
    category: "orders",
    keyBase: "help.t.createOrder",
    titleKey: "help.t.createOrder.title",
    summaryKey: "help.t.createOrder.summary",
    stepCount: 4,
    tipCount: 0,
  },
  {
    id: "order-status-flow",
    category: "orders",
    keyBase: "help.t.orderStatusFlow",
    titleKey: "help.t.orderStatusFlow.title",
    summaryKey: "help.t.orderStatusFlow.summary",
    stepCount: 6,
    tipCount: 2,
  },
  {
    id: "edit-order",
    category: "orders",
    keyBase: "help.t.editOrder",
    titleKey: "help.t.editOrder.title",
    summaryKey: "help.t.editOrder.summary",
    stepCount: 4,
    tipCount: 1,
  },

  // ---------------- TRACKING ----------------
  {
    id: "share-tracking-link",
    category: "tracking",
    keyBase: "help.t.shareTrackingLink",
    titleKey: "help.t.shareTrackingLink.title",
    summaryKey: "help.t.shareTrackingLink.summary",
    stepCount: 4,
    tipCount: 2,
    links: [{ labelKeyIndex: 0, href: "/track" }],
  },
  {
    id: "carrier-tracking-urls",
    category: "tracking",
    keyBase: "help.t.carrierTrackingUrls",
    titleKey: "help.t.carrierTrackingUrls.title",
    summaryKey: "help.t.carrierTrackingUrls.summary",
    stepCount: 3,
    tipCount: 1,
  },

  // ---------------- WHATSAPP ----------------
  {
    id: "connect-whatsapp",
    category: "whatsapp",
    keyBase: "help.t.connectWhatsapp",
    titleKey: "help.t.connectWhatsapp.title",
    summaryKey: "help.t.connectWhatsapp.summary",
    stepCount: 5,
    tipCount: 2,
    links: [{ labelKeyIndex: 0, href: "/whatsapp" }],
  },
  {
    id: "whatsapp-send-message",
    category: "whatsapp",
    keyBase: "help.t.whatsappSendMessage",
    titleKey: "help.t.whatsappSendMessage.title",
    summaryKey: "help.t.whatsappSendMessage.summary",
    stepCount: 3,
    tipCount: 2,
  },

  // ---------------- PAYMENTS ----------------
  {
    id: "payment-method-online",
    category: "payments",
    keyBase: "help.t.paymentMethodOnline",
    titleKey: "help.t.paymentMethodOnline.title",
    summaryKey: "help.t.paymentMethodOnline.summary",
    stepCount: 3,
    tipCount: 0,
  },
  {
    id: "payment-method-upi-qr",
    category: "payments",
    keyBase: "help.t.paymentMethodUpiQr",
    titleKey: "help.t.paymentMethodUpiQr.title",
    summaryKey: "help.t.paymentMethodUpiQr.summary",
    stepCount: 4,
    tipCount: 1,
  },
  {
    id: "payment-method-bank",
    category: "payments",
    keyBase: "help.t.paymentMethodBank",
    titleKey: "help.t.paymentMethodBank.title",
    summaryKey: "help.t.paymentMethodBank.summary",
    stepCount: 5,
    tipCount: 2,
  },

  // ---------------- PRICING & PROFIT ----------------
  {
    id: "smart-pricing",
    category: "pricing",
    keyBase: "help.t.smartPricing",
    titleKey: "help.t.smartPricing.title",
    summaryKey: "help.t.smartPricing.summary",
    stepCount: 4,
    tipCount: 0,
    links: [{ labelKeyIndex: 0, href: "/pricing" }],
  },
  {
    id: "profit-health",
    category: "pricing",
    keyBase: "help.t.profitHealth",
    titleKey: "help.t.profitHealth.title",
    summaryKey: "help.t.profitHealth.summary",
    stepCount: 3,
    tipCount: 0,
    links: [{ labelKeyIndex: 0, href: "/profit" }],
  },

  // ---------------- SETTINGS ----------------
  {
    id: "settings-profile",
    category: "settings",
    keyBase: "help.t.settingsProfile",
    titleKey: "help.t.settingsProfile.title",
    summaryKey: "help.t.settingsProfile.summary",
    stepCount: 3,
    tipCount: 1,
  },
  {
    id: "settings-language",
    category: "settings",
    keyBase: "help.t.settingsLanguage",
    titleKey: "help.t.settingsLanguage.title",
    summaryKey: "help.t.settingsLanguage.summary",
    stepCount: 3,
    tipCount: 0,
  },
  {
    id: "settings-theme",
    category: "settings",
    keyBase: "help.t.settingsTheme",
    titleKey: "help.t.settingsTheme.title",
    summaryKey: "help.t.settingsTheme.summary",
    stepCount: 4,
    tipCount: 0,
  },

  // ---------------- GROWTH ADVISOR ----------------
  {
    id: "growth-advisor",
    category: "growth",
    keyBase: "help.t.growthAdvisor",
    titleKey: "help.t.growthAdvisor.title",
    summaryKey: "help.t.growthAdvisor.summary",
    stepCount: 3,
    tipCount: 1,
    links: [{ labelKeyIndex: 0, href: "/suggestions" }],
  },

  // ---------------- SOCIAL AI / KEYS ----------------
  {
    id: "ai-keys-overview",
    category: "settings",
    keyBase: "help.t.aiKeysOverview",
    titleKey: "help.t.aiKeysOverview.title",
    summaryKey: "help.t.aiKeysOverview.summary",
    stepCount: 5,
    tipCount: 2,
    links: [
      { labelKeyIndex: 0, href: "/settings#ai-keys" },
      { labelKeyIndex: 1, href: "/chat" },
    ],
  },
  {
    id: "ai-key-gemini",
    category: "settings",
    keyBase: "help.t.aiKeyGemini",
    titleKey: "help.t.aiKeyGemini.title",
    summaryKey: "help.t.aiKeyGemini.summary",
    stepCount: 4,
    tipCount: 2,
    links: [{ labelKeyIndex: 0, href: "/settings#ai-keys" }],
  },
  {
    id: "ai-key-openrouter",
    category: "settings",
    keyBase: "help.t.aiKeyOpenrouter",
    titleKey: "help.t.aiKeyOpenrouter.title",
    summaryKey: "help.t.aiKeyOpenrouter.summary",
    stepCount: 4,
    tipCount: 2,
    links: [{ labelKeyIndex: 0, href: "/settings#ai-keys" }],
  },
  {
    id: "ai-key-nvidia",
    category: "settings",
    keyBase: "help.t.aiKeyNvidia",
    titleKey: "help.t.aiKeyNvidia.title",
    summaryKey: "help.t.aiKeyNvidia.summary",
    stepCount: 5,
    tipCount: 2,
    links: [{ labelKeyIndex: 0, href: "/settings#ai-keys" }],
  },
];
