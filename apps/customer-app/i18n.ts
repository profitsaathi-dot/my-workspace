export const locales = ["en", "hi", "kn", "ta", "ml"] as const;
export const defaultLocale = "en";

export type Locale = (typeof locales)[number];

export const LANGUAGES: { code: Locale; label: string; native: string }[] = [
  { code: "en", label: "English",   native: "English" },
  { code: "hi", label: "Hindi",     native: "हिन्दी" },
  { code: "kn", label: "Kannada",   native: "ಕನ್ನಡ" },
  { code: "ta", label: "Tamil",     native: "தமிழ்" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
];
