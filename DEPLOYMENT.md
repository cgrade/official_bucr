# Bucr — Deployment Guide

Step-by-step production deployment for the Bucr platform. Follow top to bottom the first time.

**What deploys where**

| Component | Path | Host | Notes |
|---|---|---|---|
| Backend API | repo root (`src/`) | Vercel (project A) | Next.js 14 App Router + Prisma + Vercel Crons |
| Diner web app | `apps/web` | Vercel (project B) | talks to the API |
| Vendor portal | `apps/vendor-portal` | Vercel (project C) | forced‑dark |
| Admin portal | `apps/admin-portal` | Vercel (project D) | forced‑dark |
| Mobile app | `apps/mobile-app` | EAS Build → App Store / Play | Expo |
| Database | `prisma/` | Supabase (managed Postgres) | Pro plan + pooling + backups |

> One repo → **four separate Vercel projects**, each with a different **Root Directory**. The mobile app ships via EAS, not Vercel.

---

## 0. Prerequisites (accounts)

You already have: **Paystack, Resend, Cloudinary, Supabase**. Also need: **Vercel**, **Mapbox** (token), a **GitHub** repo (already: `cgrade/official_bucr`), and the **bucr.ng** domain. For mobile: an **Expo/EAS** account + Apple Developer + Google Play Console.

Install locally: Node 20+, `npm i -g vercel` (optional), `npm i -g eas-cli` (mobile).

---

## 1. Supabase (database)

1. Create a project on the **Pro plan** (Free tier *pauses* on inactivity — unacceptable for production) in the **region closest to Nigeria** (e.g. EU‑West / London).
2. **Enable backups** — daily backups minimum; enable **PITR** if budget allows (this DB holds money‑equivalent balances).
3. Get two connection strings from **Project Settings → Database**:
   - **Pooled** (Transaction mode, port **6543**) → this becomes `DATABASE_URL`. Append `?pgbouncer=true&connection_limit=1`.
   - **Direct** (Session, port **5432**) → this becomes `DIRECT_URL`.
4. Keep the DB password in a password manager. Never commit it.

> The Prisma datasource is already wired for this: `url = DATABASE_URL` (pooled, used by the serverless app) and `directUrl = DIRECT_URL` (direct, used by migrations). **Don't skip the pooled URL** — Vercel serverless will exhaust direct connections under load.

---

## 2. Run migrations + seed (once, from your machine)

```bash
# In your shell, point at the Supabase DIRECT (5432) URL for migrations:
export DATABASE_URL="<supabase POOLED 6543 url>"
export DIRECT_URL="<supabase DIRECT 5432 url>"

npx prisma migrate deploy     # apply all migrations to Supabase
npx prisma generate           # generate the client
npm run seed                  # OPTIONAL: demo data. SKIP for a real production launch.
```

For a real launch, **do not seed demo vendors/users.** Create the first real admin via your seed/admin path or a one‑off script, then change its password.

---

## 3. Environment variables

Set these in each Vercel project (**Settings → Environment Variables**, Production scope). Full list + defaults are in [`.env.example`](./.env.example).

### 3a. Backend API project (the big one)
| Var | Value |
|---|---|
| `DATABASE_URL` | Supabase **pooled** (6543) URL |
| `DIRECT_URL` | Supabase **direct** (5432) URL |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | strong random ≥32 chars each (the API refuses to boot in prod with short/missing secrets) |
| `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_WEBHOOK_SECRET` | from Paystack (use **live** keys at launch) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend (verify your sending domain first) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary |
| `MAPBOX_ACCESS_TOKEN` | **secret** Mapbox token (`sk.…`) — server geocoding |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | **public** Mapbox token (`pk.…`) |
| `CRON_SECRET` | strong random — guards all cron routes |
| `NEXT_PUBLIC_APP_URL` | `https://bucr.ng` |
| `NODE_ENV` | `production` |
| `VENDOR_WITHDRAWAL_ENABLED` | **`false`** (legal gate — do not change) |
| `MULTI_CURRENCY_DISPLAY_ENABLED` | `false` for the NG launch |
| `REDIS_URL` | optional (in‑memory fallback if unset) |
| `TERMII_API_KEY`, `TERMII_SENDER_ID` | optional (SMS is post‑launch) |

Economics levers (`CREDIT_SPREAD`, `COVER_FEE_*`, `VENDOR_CANCEL_BONUS_PCT`, etc.) are optional overrides — defaults live in `economics.ts`.

### 3b. Diner web (`apps/web`)
| Var | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.bucr.ng` (your backend URL) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | public `pk.…` token |

### 3c. Vendor portal (`apps/vendor-portal`) and Admin portal (`apps/admin-portal`)
| Var | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.bucr.ng` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | public `pk.…` token |

---

## 4. Deploy the Backend API (Vercel project A)

1. **New Project → Import** `cgrade/official_bucr`.
2. **Root Directory:** repo root (leave default).
3. **Framework:** Next.js (auto). Build command default (`next build`); install `npm install`.
4. Add all **3a** env vars.
5. Deploy. Then attach domain **`api.bucr.ng`** (Settings → Domains).
6. Verify: `curl https://api.bucr.ng/api/health` → `200`.

### Crons
`vercel.json` already declares the schedules (credits expiry, subscriptions, cleanup, reliability, reminders, weekly reports, monthly cover‑fee invoice). Vercel picks these up automatically on the **backend** project. Each route checks `CRON_SECRET` — set it. (Vercel Cron sends the project's `CRON_SECRET` automatically.)

---

## 5. Paystack webhook

1. Paystack Dashboard → **Settings → API Keys & Webhooks**.
2. Webhook URL: `https://api.bucr.ng/api/webhooks/paystack`.
3. Ensure `PAYSTACK_WEBHOOK_SECRET` in Vercel matches. The endpoint verifies **HMAC‑SHA512** with a timing‑safe comparison and rejects anything else.
4. Test a card payment in live mode and confirm credits land.

---

## 6. Deploy the web app + portals (Vercel projects B, C, D)

For each of `apps/web`, `apps/vendor-portal`, `apps/admin-portal`:

1. **New Project → Import the same repo.**
2. **Root Directory → `apps/web`** (or `apps/vendor-portal`, `apps/admin-portal`).
3. Framework: Next.js (auto). Add the env vars from **3b/3c**.
4. Deploy, then attach domains:
   - `apps/web` → **`bucr.ng`** + **`www.bucr.ng`**
   - `apps/vendor-portal` → **`vendor.bucr.ng`**
   - `apps/admin-portal` → **`admin.bucr.ng`**
5. Update the cross‑links: the web header/footer point to the vendor portal — set those to `https://vendor.bucr.ng` (currently `http://localhost:3001`).

---

## 7. CORS / origins

The API currently returns `Access-Control-Allow-Origin: *` (safe because auth uses Bearer headers, not cookies). For defense‑in‑depth, tighten it in `middleware.ts` / `src/lib/middleware/security-headers.ts` to the known origins: `https://bucr.ng`, `https://vendor.bucr.ng`, `https://admin.bucr.ng`.

---

## 8. Mobile app (EAS)

```bash
cd apps/mobile-app
npm install
# set the real EAS projectId in app.json (or via `eas init`)
# set EXPO_PUBLIC_API_URL=https://api.bucr.ng, EXPO_PUBLIC_MAPBOX_TOKEN=pk.…,
#     EXPO_PUBLIC_SENTRY_DSN=… as EAS secrets / app config
eas login
eas build --platform ios --profile production
eas build --platform android --profile production
eas submit -p ios      # App Store
eas submit -p android   # Play Store
```

Mobile needs custom dev/preview/production builds (native modules: Mapbox, Sentry, view‑shot) — Expo Go won't run it.

---

## 9. Post‑deploy smoke checks

```bash
curl https://api.bucr.ng/api/health                 # 200
curl https://api.bucr.ng/api/vendors?limit=1        # JSON list
```
In a browser: open `https://bucr.ng` → register → browse → (with credits) reserve → check the vendor portal shows the booking → vendor checks in → confirm the deposit returns +3%. Do one live ₦ credit purchase end‑to‑end.

---

## 10. Go‑live checklist

- [ ] `VENDOR_WITHDRAWAL_ENABLED=false` in every environment
- [ ] `MULTI_CURRENCY_DISPLAY_ENABLED=false` (NG launch)
- [ ] `JWT_SECRET` / `JWT_REFRESH_SECRET` are strong + unique to production
- [ ] Paystack **live** keys + webhook verified
- [ ] Resend sending domain verified (SPF/DKIM)
- [ ] Supabase **backups/PITR on**; pooled `DATABASE_URL` + direct `DIRECT_URL` set
- [ ] CORS tightened to bucr.ng origins
- [ ] Demo seed data **not** present in the production DB
- [ ] **Legal:** the closed‑loop credit model reviewed/cleared by Nigerian fintech counsel (per `CLAUDE.md` §6) — this is the real launch gate, independent of infrastructure
- [ ] Sentry DSN set (mobile) + error monitoring on the API

---

## 11. Rollback

Vercel keeps every deployment — use **Instant Rollback** (Deployments → ⋯ → Promote previous) to revert any of the four projects in seconds. Database changes roll forward only: take a Supabase backup/restore point before running new migrations.

---

© 2026 Bucr Limited
