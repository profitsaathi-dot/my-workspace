import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  environment: process.env.NEXT_PUBLIC_ENV || "development",

  ignoreErrors: [
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ENOTFOUND",
  ],

  beforeSend(event, hint) {
    if (event.request?.url?.includes("/api/health")) {
      return null;
    }
    return event;
  },
});
