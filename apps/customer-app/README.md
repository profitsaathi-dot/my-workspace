# Customer App (Profitsaathi)

Public-facing storefront for ProfitSaathi sellers. Each seller's catalog lives behind a unique store token (`/<storeToken>/store`); buyers can browse, add to cart, check out via Razorpay, or pay via UPI QR / bank transfer when the seller has chosen offline payments.

Built with **Next.js 16 (App Router + Turbopack)**, **React 19**, **next-intl**, **next-auth (Keycloak)**, and a shared workspace UI package (`@workspace/ui`).

---

## Quick start

> Requires **Node 20+** and **pnpm 10**. Run commands from the workspace root unless otherwise noted.

```bash
# from workspace root
pnpm install

# run only this app
pnpm --filter Profitssathi-user dev
# or, from this directory
pnpm dev
```

The dev server starts on [http://localhost:3000/user](http://localhost:3000/user). The `/user` prefix comes from `basePath` in [`next.config.ts`](next.config.ts).

```bash
pnpm build      # production build (Turbopack)
pnpm start      # serve the production build
pnpm lint       # eslint
```

---

## Environment variables

Create `.env.local` in this directory. Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser bundle — keep secrets out of those.

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | Spring backend base URL (proxied via API routes under `/user/api/*`) |
| `NEXT_PUBLIC_ENV` | no | `local` / `staging` / `production` — used for environment-aware UI |
| `NEXT_PUBLIC_APP_NAME` | no | Display name fallback |
| `NEXT_PUBLIC_APP_VERSION` | no | Shown on the settings → app-info screen |
| `KEYCLOAK_CLIENT_ID` | yes | Server-side Keycloak client for next-auth |
| `KEYCLOAK_CLIENT_SECRET` | yes | Server-side Keycloak secret |
| `KEYCLOAK_ISSUER` | yes | Server-side Keycloak realm URL |
| `NEXT_PUBLIC_KEYCLOAK_ISSUER` | yes | Same realm URL used by the client for the post-logout redirect |
| `NEXT_PUBLIC_AES_KEY` | yes | 32-char key for client-side payload encryption |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | yes | Server key for creating orders |
| `RAZORPAY_KEY_SECRET` | yes | Server secret for verifying signatures |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | yes | Public key passed to the Razorpay checkout modal |
| `NEXT_PUBLIC_ANALYTICS_ID` | no | GA / analytics ID |

---

## URL structure

| Path | Page |
|---|---|
| `/user` | Landing — pick a store token to enter |
| `/user/:storeToken/store` | Storefront (product grid, search) |
| `/user/:storeToken/product/:productToken` | Product detail page |
| `/user/:storeToken/product/:productToken/checkout` | Checkout (address + payment) |
| `/user/:storeToken/cart` | Cart (logged-in users only) |
| `/user/:storeToken/orders` | Order history with retry-payment for failed/incomplete orders |
| `/user/:storeToken/order-success` | Post-purchase confirmation |
| `/user/:storeToken/login` | Keycloak login + WhatsApp signup placeholder |
| `/user/:storeToken/settings` | Profile, security, addresses, preferences (theme, accent, language) |

---

## Seller types

The customer app branches behaviour on `sellerType` returned from `/api/v1/store/info`:

- **`social`** — discovery-only stores fed by a single product link. Cart, "My Orders", login/logout, and address settings are hidden across the app. Buy Now is the only CTA.
- Anything else (default) — full storefront with cart, orders, login.

The flag is fetched once per `storeToken` via the [`StoreInfoProvider`](app/[storeToken]/context/store-info-context.tsx) at the route layout, then read with `useStoreInfo()`.

---

## Payments

Three modes, driven by the seller's `paymentType`:

1. **Online (default / Razorpay)** — `usePayment.startRazorpayPayment` creates the order, opens the Razorpay modal, and verifies the signature server-side.
2. **UPI QR** — order is created, then the offline-payment sheet shows the seller's QR; the buyer uploads a payment screenshot.
3. **Bank transfer** — same flow as UPI QR but with the seller's account number / IFSC instead of a QR.

Razorpay options use the live store name from the info endpoint and truncate `description` to stay under Razorpay's character limit.

---

## Internationalisation

Five locales out of the box: English, Hindi, Kannada, Tamil, Malayalam. Strings live in [`messages/`](messages); the active locale is persisted in a `locale` cookie set by the language switcher and the settings page. See [`i18n.ts`](i18n.ts) and [`i18n/request.ts`](i18n/request.ts).

When adding a new translation key, update **all five** locale files in the same PR — missing keys fall back to the key name and surface as visible English-shaped strings.

---

## Layout & responsive design

- **Desktop (`xl:` and above)** — sidebar always visible on the left; cart icon in the top header.
- **Mobile / tablet** — fixed bottom navigation (Home / Cart / Orders / Settings), no sidebar. iOS safe-area handled via `env(safe-area-inset-bottom)`. Cart and product checkout pages have their own sticky pay bar; the bottom nav is hidden on `/checkout` and `/login` to avoid stacking, and lifted above the nav on `/cart`.

The outer wrapper uses `h-[100dvh] overflow-hidden` with `<main>` as the scroll container so the body never has a stray scrollbar from extra bottom padding.

---

## Notable integrations

- **Keycloak via next-auth** — see [`app/api/auth/[...nextauth]/route.ts`](app/api/auth) and the logout flow in [`PublicLayout.tsx`](app/[storeToken]/components/PublicLayout.tsx).
- **PIN code auto-fill** — checkout form calls `https://api.postalpincode.in/pincode/{pin}` on a 6-digit entry, auto-fills city + state, and blocks Pay until the PIN is verified. AbortController guards against race conditions when the buyer types fast.
- **Capacitor** — Android wrapper config lives at [`capacitor.config.ts`](capacitor.config.ts); the `android/` folder holds the native project for building APKs.

---

## Project layout

```
app/
  [storeToken]/             # routes scoped to a store
    components/             # PublicLayout, ThemeLayout
    context/                # search, store-info, cart contexts
    cart/, orders/, settings/, store/, order-success/, login/
    product/[productToken]/
      checkout/, components/, hooks/, types/, utils/
  api/                      # Next.js Route Handlers — proxy to Spring backend
  lib/                      # auth helpers, accent cookie, language switcher
  page.tsx                  # landing page
i18n.ts, messages/          # next-intl setup + translations
public/                     # static assets
android/                    # Capacitor Android shell
```

---

## Workspace notes

This app lives in a pnpm workspace alongside `@workspace/ui`. Shared UI components are imported as source from `packages/ui/src/`; the customer-app's `next.config.ts` lists `@workspace/ui` in `transpilePackages`. React types are pulled from the workspace root (see root `package.json`) so the UI package can be type-checked without its own `@types/react` dep.

If you see a "multiple lockfiles detected" warning from Turbopack, the workspace root is already pinned via `turbopack.root` in [`next.config.ts`](next.config.ts) — you can safely delete a stray `apps/customer-app/package-lock.json` if one exists; pnpm only reads `pnpm-lock.yaml`.
