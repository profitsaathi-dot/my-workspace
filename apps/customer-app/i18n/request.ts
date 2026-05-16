import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";

export default getRequestConfig(async ({ requestLocale }) => {
  //console.log("🌍 [i18n] Incoming request");

  // requestLocale (will be undefined in your setup)
  let locale = await requestLocale;
  //console.log("👉 requestLocale:", locale);

  // ✅ FIX: headers() is async now
  const headersList = await headers();

  const cookieHeader = headersList.get("cookie");
  //console.log("🍪 cookie header:", cookieHeader);

  const match = cookieHeader?.match(/locale=(\w+)/);
  const cookieLocale = match?.[1];

  //console.log("👉 cookie locale:", cookieLocale);

  // ✅ Final locale
  locale = cookieLocale || locale || "en";

  //console.log("✅ Final locale used:", locale);

  try {
    const messages = (await import(`../messages/${locale}.json`)).default;

    //console.log("📦 Loaded messages for:", locale);

    return {
      locale,
      messages,
    };
  } catch (error) {
    //console.error("❌ Failed loading messages, fallback to EN", error);

    const messages = (await import(`../messages/en.json`)).default;

    return {
      locale: "en",
      messages,
    };
  }
});