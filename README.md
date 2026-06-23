# Bucr — *Your table, actually waiting.*

Bucr (**bucr.ng**) is a Nigerian restaurant reservation & dining platform built around a **credit‑backed deposit system** that all but eliminates no‑shows. Guests place a small, refundable credit deposit to confirm a booking; showing up returns the deposit **plus a bonus**, and a no‑show forfeits part of it — all inside a closed‑loop credit economy that never converts to cash for vendors.

Launch market: **Abuja, Nigeria**. Founder: **Mr. Grade** (Chef · Founder/CEO).

> The canonical product/strategy context lives in [`CLAUDE.md`](./CLAUDE.md). Economic constants live in [`src/lib/config/economics.ts`](./src/lib/config/economics.ts) — the single source of truth.

---

## Why Bucr

Nigeria has a severe restaurant **no‑show problem** (~50% in some Lagos venues). Bucr fixes the incentive: a refundable deposit makes a booking *mean* something. Restaurants stop over‑prepping and under‑filling; guests stop losing tables to walk‑ins.

**Revenue (no payment licence required at launch — money only ever flows *to* Bucr):**
1. **Per‑cover success fee** — flat ₦/cover, billed monthly (reduced by tier).
2. **Vendor subscriptions** — Basic (free), Pro (₦30k/mo), Elite (₦85k/mo).
3. **Featured / ad placement** — vendors buy carousel + search boosts with credits.
4. **Credit spread** (6%), **breakage** (expiry), **gift fee** (8%), **no‑show platform share**.

---

## Monorepo layout

```
official_bucr/
├── src/                  Backend API — Next.js 14 App Router (port 3000)
│   ├── app/api/          REST routes
│   ├── services/         Business logic (credit, reservation, payment, featured, fx, email…)
│   └── lib/config/economics.ts   ← ALL economic constants
├── apps/
│   ├── web/              Diner web app — Next.js 14 (port 3003)   ← consumer site
│   ├── vendor-portal/    Restaurant dashboard — Next.js 14 (port 3001)
│   ├── admin-portal/     Platform admin — Next.js 14 (port 3002)
│   └── mobile-app/       Diner mobile app — Expo React Native
├── prisma/               Schema + migrations + seed
├── packages/theme/       Shared brand tokens (Tailwind preset)
└── docs/                 Documentation (incl. VENDOR_GUIDE, VENDOR_TRAINING_MANUAL)
```

| Surface | Who | Stack | Port |
|---|---|---|---|
| **Backend API** | all clients | Next.js 14, Prisma, PostgreSQL, Redis | 3000 |
| **Diner web** (`apps/web`) | guests | Next.js 14, React Query, Tailwind | 3003 |
| **Vendor portal** (`apps/vendor-portal`) | restaurants | Next.js 14 (forced‑dark) | 3001 |
| **Admin portal** (`apps/admin-portal`) | Bucr team | Next.js 14 (forced‑dark) | 3002 |
| **Mobile app** (`apps/mobile-app`) | guests | Expo RN, expo‑router, NativeWind | Expo |

---

## Tech stack

- **Backend:** Next.js 14 (App Router) · TypeScript · Prisma ORM · PostgreSQL (Supabase in prod) · Redis (in‑memory fallback)
- **Auth:** JWT (jose) — 15‑min access / 7‑day refresh, blacklisted on logout · bcrypt (12 rounds)
- **Payments:** Paystack (card, transfer, USSD, QR, mobile money) · Flutterwave planned failover
- **Maps/Geocoding:** Mapbox (server‑side geocoding; public token for client maps)
- **Email:** Resend · **SMS:** Termii (post‑launch) · **Images:** Cloudinary · **Crash reporting:** Sentry (mobile)
- **Cron:** Vercel Crons (all guarded by `CRON_SECRET`)
- **Client state:** Zustand + React Query

---

## Quick start

**Prerequisites:** Node 20+, Docker (for local Postgres), npm.

```bash
# 1. Install backend deps (repo root)
npm install

# 2. Start local Postgres (port 5433) + create env
docker compose up -d
cp .env.example .env        # then fill in real values (see Environment below)

# 3. Database
npx prisma migrate deploy   # apply migrations
npx prisma generate         # generate the client
npm run seed                # seed demo data (admin, vendor, packages…)

# 4. Run the backend API
npm run dev                 # http://localhost:3000
```

Run a client app (each has its own deps):

```bash
cd apps/web           && npm install && npm run dev    # diner web  → :3003
cd apps/vendor-portal && npm install && npm run dev    # vendors    → :3001
cd apps/admin-portal  && npm install && npm run dev    # admin      → :3002
cd apps/mobile-app    && npm install && npx expo start # mobile (dev build for native modules)
```

**Seed logins:** admin `admin@bucr.ng` / `Admin@123456` · vendor `vendor@zumagrill.com` / `Vendor@123456` · diner `john@example.com` / `User@123456`.

---

## Environment

Copy `.env.example` → `.env` and fill it in. Key variables (full list + defaults in `.env.example`):

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | ✅ | **≥16 chars or the API refuses to boot in production** |
| `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_WEBHOOK_SECRET` | ✅ | Payments |
| `MAPBOX_ACCESS_TOKEN` | ✅ | Server‑side geocoding (branches + maps) |
| `RESEND_API_KEY`, `EMAIL_FROM` | ✅ | Transactional email |
| `CLOUDINARY_*` | ✅ | Image uploads |
| `REDIS_URL` | ⬜ | Falls back to in‑memory if absent |
| `CRON_SECRET` | ✅ | Guards all cron routes |
| `MULTI_CURRENCY_DISPLAY_ENABLED` | ⬜ | `false` for the NG launch (display‑only FX) |
| `VENDOR_WITHDRAWAL_ENABLED` | ⬜ | **Must stay `false`** (legal gate) |

Client apps additionally need `NEXT_PUBLIC_API_URL` (web/portals) and `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_MAPBOX_TOKEN` / `EXPO_PUBLIC_SENTRY_DSN` (mobile).

---

## The credit economy (canonical rules)

- **1 credit = ₦10** (locked). Purchase price = `credits × ₦10 × (1 + 6% spread)`.
- Credits **expire 90 days** after purchase (reminder 30 days before). Non‑refundable to cash, non‑withdrawable, closed‑loop.
- **Deposit is flat per reservation** (not per person), set by venue type or vendor override; min ₦10,000.
- **Show‑up:** 100% deposit returned **+ 3% bonus**.
- **No‑show:** guest forfeits **40%** (keeps 60%); of the 40% → **30% to vendor** (non‑cashable marketing credits), **10% to Bucr**.
- **Cancellation:** 24h+ = 100% · 12–24h = 50% · <12h = 0% · vendor‑cancel = 100% + 10% bonus to guest.

Every credit mutation runs inside a single `db.$transaction()`. **No economic value is hardcoded** outside `economics.ts`.

> ⚠️ **Legal gate:** vendor credits can never be withdrawn to cash (`VENDOR_WITHDRAWAL_ENABLED=false`). This keeps Bucr outside CBN payment‑services licensing. Do not enable without a licensed partner + counsel sign‑off.

---

## Scripts

| Command (root) | What |
|---|---|
| `npm run dev` | Backend API (3000) |
| `npm run build` | Production build of the backend |
| `npm run seed` | Seed the database |
| `npx vitest run` | Run the test suite |
| `npx prisma studio` | Browse the DB |
| `npx prisma migrate deploy` | Apply migrations |

Each `apps/*` has `dev`, `build`, `start`, `type-check`.

---

## Testing & builds

- **Unit/integration:** `npx vitest run` (Vitest). Run before every PR.
- **Type safety:** `npx tsc --noEmit` per app.
- **Production builds:** `next build` for the backend + each portal/web app; `eas build` for mobile.

---

## Deployment

- **Backend + web + portals:** Vercel (native Next.js 14 + cron). Set all env vars; Vercel Crons read from `vercel.json`.
- **Database:** Supabase (managed Postgres + RLS).
- **Mobile:** EAS Build (custom dev/preview/production builds — native modules: Mapbox, Sentry, view‑shot).
- **Webhooks:** point Paystack to `/api/webhooks/paystack` (HMAC‑SHA512 verified).

---

## Documentation

- [`CLAUDE.md`](./CLAUDE.md) — product, strategy, economics, architecture (source of truth).
- [`docs/VENDOR_GUIDE.md`](./docs/VENDOR_GUIDE.md) — every vendor feature, how it works, how to use it.
- [`docs/VENDOR_TRAINING_MANUAL.md`](./docs/VENDOR_TRAINING_MANUAL.md) — script + playbook for the team to onboard/train vendors.
- [`docs/ECONOMICS.md`](./docs/ECONOMICS.md) — economic model deep‑dive.

---

© 2026 Bucr Limited · Nigeria
