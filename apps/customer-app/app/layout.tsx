import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from 'next/headers'
import "./globals.css";
import { Providers } from "./providers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { CartProvider } from "./context/cart-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProfitSaathi",
  description: "AI Micro Entrepreneur Advisor",
};

// Capacitor / native-feel: let the WebView extend behind the iOS notch and
// Android nav bar so the chrome can opt-in to safe-area padding instead of
// being clipped under it. themeColor matches the light/dark backgrounds so
// the iOS status bar tint blends with the app background.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0d" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  const locale = await getLocale();

  const cookieStore = await cookies()
  const theme = cookieStore.get("theme");
  const accent = cookieStore.get("accent");

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${theme?.value === "dark" ? "dark" : ""}`}
      data-accent={accent?.value || "emerald"}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <NextIntlClientProvider messages={messages} locale={locale}>
            <CartProvider>
              {children}
            </CartProvider>
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}
