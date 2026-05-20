import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  environment: process.env.NEXT_PUBLIC_ENV || "development",
  
  ignoreErrors: [
    "top.GLOBALS",
    "chrome-extension://",
    "moz-extension://",
    "NetworkError",
    "Failed to fetch",
    "Load failed",
  ],

  beforeSend(event, hint) {
    if (event.exception) {
      const error = hint.originalException;
      if (error && typeof error === "object" && "message" in error) {
        const message = String(error.message);
        if (
          message.includes("chrome-extension://") ||
          message.includes("moz-extension://")
        ) {
          return null;
        }
      }
    }
    return event;
  },
});
