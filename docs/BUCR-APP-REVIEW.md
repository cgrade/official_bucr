# BUCR — App Review & Production Readiness Audit

> **Date:** April 16, 2026
> **Scope:** Full-stack audit — Backend API, Prisma schema, Vendor Portal, Admin Portal, Mobile App (Expo)
> **Platform:** Nigerian restaurant reservation & takeout platform with credit-based deposit system

---

## 1. General App Overview

**Purpose:**
Multi-platform application serving **users** (diners), **vendors** (restaurants), and **admins** (platform operators). Solves the 20% restaurant no-show problem via a credit-based deposit system. Vendors pay flat monthly subscriptions — no commissions.

**Architecture:**

| Layer | Technology | Port |
|-------|-----------|------|
| Backend API | Next.js 14 (App Router) | 3000 |
| Database | PostgreSQL + Prisma ORM | 5433 |
| Vendor Portal | Next.js (React, TailwindCSS, Radix UI) | 3001 |
| Admin Portal | Next.js (React, TailwindCSS, Radix UI) | 3002 |
| Mobile App | React Native (Expo Router) | 8081 |
| Cache | Redis (ioredis) | 6379 |
| Payments | Paystack | — |
| Email | Resend | — |
| SMS | Termii | — |
| Storage | Cloudinary | — |

**Primary Modules (Implemented):**

| Module | Status | Routes |
|--------|--------|--------|
| Authentication (User/Vendor/Admin) | ✅ Complete | 12 routes |
| User Credits & Wallet | ✅ Complete | 4 routes |
| Reservations (QR + PIN check-in) | ✅ Complete | 4 routes |
| Takeout/Delivery Orders | ✅ Complete | 5 routes |
| Vendor Management (menu, gallery, experiences) | ✅ Complete | 22 routes |
| Admin Dashboard & Analytics | ✅ Complete | 35 routes |
| Payments (Paystack + webhooks) | ✅ Complete | 3 routes |
| Reviews | ✅ Complete | 2 routes |
| Favorites & Waitlist | ✅ Complete | 3 routes |
| Events & Tickets | ✅ Complete | 4 routes |
| Cron Jobs (credit expiry, subscriptions, cleanup) | ✅ Complete | 3 routes |
| Real-time (SSE event emitter) | ✅ Partial | 1 route |
| File Upload (Cloudinary) | ✅ Complete | 1 route |

**Total API routes:** ~110

---

## 2. Code Review & Data Audit

### 2.1. Hardcoded / Placeholder Data Found

| File | Issue | Severity |
|------|-------|----------|
| `src/app/api/admin/reports/history/route.ts` | Returns `mockHistory[]` array — mock report entries hardcoded, not from DB | 🔴 High |
| `src/app/api/admin/analytics/route.ts` | `userGrowth: 0`, `vendorGrowth: 0`, `avgOrderValue: 0`, `totalReviews: 0` — TODO placeholders never implemented | 🔴 High |
| `src/app/api/admin/dashboard/route.ts` | Contains at least 1 TODO/placeholder | 🟡 Medium |
| `prisma/seed.ts` | Gallery images use Unsplash URLs, document URLs use `example.com` — acceptable for seed data but must not leak to production | 🟢 Low |

**Action List:**
```
[ ] Replace admin/reports/history mock data with actual ReportHistory DB table
[ ] Implement growth calculation (compare current vs previous period) in admin/analytics
[ ] Calculate avgOrderValue from TakeoutOrder aggregation
[ ] Query Review model for totalReviews/avgRating instead of returning 0
[ ] Audit all 40 files with TODO/FIXME across apps/ for unfinished work
```

### 2.2. Frontend TODO/Placeholder Count

| App | Files with TODOs | Notable |
|-----|------------------|---------|
| Vendor Portal | 18 files | Register page (13), Settings (6), Menu (5), Events (5) |
| Mobile App | 15 files | Edit-profile (10), Register (8), Search (6), Venue (4) |
| Admin Portal | 7 files | Vendors page (9), Users page (8), Login (4) |

### 2.3. Environment & Secrets

**Current `.env.example` status:**

| Variable | Present | Notes |
|----------|---------|-------|
| DATABASE_URL | ✅ | — |
| JWT_SECRET / JWT_REFRESH_SECRET | ✅ | Min 32 chars enforced |
| PAYSTACK_SECRET_KEY / PUBLIC_KEY | ✅ | — |
| CLOUDINARY_* | ✅ | — |
| RESEND_API_KEY | ✅ | — |
| TERMII_API_KEY | ✅ | — |
| CRON_SECRET | ❌ Missing | Needed for `vercel.json` cron auth |
| REDIS_URL | ❌ Missing | Used by `src/lib/cache/redis.ts` |
| ADMIN_PORTAL_URL | ❌ Missing | Referenced in `middleware.ts` CORS |
| VENDOR_PORTAL_URL | ❌ Missing | Referenced in `middleware.ts` CORS |
| SENTRY_DSN | ❌ Missing | No error monitoring configured |

**Action List:**
```
[ ] Add CRON_SECRET, REDIS_URL, ADMIN_PORTAL_URL, VENDOR_PORTAL_URL to .env.example
[ ] Add SENTRY_DSN placeholder for error monitoring
[ ] Verify no secrets are committed in .env (should be .gitignored)
```

---

## 3. Database Schema Audit

**Models (24 total):** User, Admin, Vendor, VendorBranch, VendorDocument, MenuCategory, Menu, GalleryImage, Reservation, Invitation, Waitlist, TakeoutOrder, VendorWallet, VendorCreditTransaction, CreditTransaction, Review, Experience, Achievement, SpecialOffer, GuestProfile, Favorite, Payment, VendorSubscription, SystemSetting, VerificationToken

### 3.1. Schema Health

| Check | Status |
|-------|--------|
| Soft deletes (`deletedAt`) | ✅ On User, Vendor, Menu, Experience, SpecialOffer |
| Role-based access (UserRole enum) | ✅ user/vendor/admin |
| Indexes on foreign keys | ✅ All vendorId, userId indexed |
| Composite indexes for dashboard queries | ✅ Reservation has 7 indexes |
| Unique constraints | ✅ email, phone, slug, reference, [userId,vendorId] |
| Expiry tracking | ✅ CreditTransaction.expiresAt, VendorSubscription.expiresAt |
| VerificationToken (DB-backed) | ✅ Replaces old in-memory Map |
| GuestProfile CRM | ✅ visitCount, noShowCount, tags, preferences, isVip |

### 3.2. Schema Gaps

| Issue | Recommendation | Priority |
|-------|---------------|----------|
| No `ReportHistory` model | Admin reports history is mocked — needs a real table | 🔴 High |
| No `Notification` model | Push/email/SMS logs are fire-and-forget with no persistence | 🟡 Medium |
| No `AuditLog` usage | `audit_logs` table exists but `audit-logger.ts` is imported nowhere in routes | 🟡 Medium |
| Vendor `operatingHours` is Json | No validation at DB level, relies on app-layer checks | 🟢 Low |
| No `table_management` models | Deferred to V2 per spec | ℹ️ V2 |

---

## 4. Backend API Audit

### 4.1. API Endpoints Inventory (110 routes)

| Group | Count | Auth | Notes |
|-------|-------|------|-------|
| `/api/auth/*` | 12 | Mixed | Login, register, refresh, logout, verify, reset |
| `/api/users/*` | 10 | User | Profile, credits, favorites, orders, reservations |
| `/api/vendor/*` | 22 | Vendor | Menu, gallery, analytics, branches, settings |
| `/api/admin/*` | 35 | Admin | Full CRUD, analytics, documents, featured |
| `/api/orders/*` | 3 | User | Create, view, confirm payment |
| `/api/reservations/*` | 2 | User | Create, cancel/modify |
| `/api/payments/*` | 3 | User | Initialize, verify, webhook |
| `/api/events/*` | 4 | Mixed | Public list, tickets, bundles |
| `/api/cron/*` | 3 | Cron | Credits, subscriptions, token cleanup |
| `/api/upload` | 1 | Auth | Cloudinary signed URL |
| Other | 5 | Mixed | Featured, experiences, reviews, realtime, waitlist |

### 4.2. API Issues Found

| Issue | File | Severity |
|-------|------|----------|
| `admin/logout` imports `@/lib/auth/token-blacklist` which doesn't exist | `auth/admin/logout/route.ts` | 🔴 Build error |
| `users/profile/avatar` — `FormData.get()` TS error | `users/profile/avatar/route.ts` | 🔴 Build error |
| Admin analytics returns hardcoded zeros | `admin/analytics/route.ts` | 🔴 Functional |
| Report history returns mock data | `admin/reports/history/route.ts` | 🔴 Functional |
| No `/api/health` endpoint | — | 🟡 Missing |
| No request body size limits on upload | `upload/route.ts` | 🟡 Security |
| Rate limiter uses in-memory store | `lib/middleware/rate-limit.ts` | 🟡 Scaling |

**Action List:**
```
[ ] Fix admin/logout import — use blacklistToken from token.service.ts
[ ] Fix avatar route FormData typing issue
[ ] Implement real growth calculations in admin/analytics
[ ] Create ReportHistory model and migrate report history off mock data
[ ] Add /api/health endpoint returning { status: 'ok', timestamp, version }
[ ] Add body size validation in upload route
[ ] Consider Redis-backed rate limiter for multi-instance deployments
```

---

## 5. Services Layer Audit

**11 services implemented:**

| Service | File | Status |
|---------|------|--------|
| credit.service | ✅ | Purchase, deduct, refund, expiry, reminders |
| reservation.service | ✅ | Create, check-in, cancel, no-show, modify + email notifications |
| order.service | ✅ | Create, confirm payment + email notifications |
| payment.service | ✅ | Paystack init, verify, webhook processing |
| token.service | ✅ | DB-backed verification tokens, JWT blacklist |
| subscription.service | ✅ | Create, upgrade, check expiry |
| email.service | ✅ | Resend integration, templates for reservation/order/expiry |
| sms.service | ✅ | Termii integration, OTP, reminders |
| upload.service | ✅ | Cloudinary upload |
| qrcode.service | ✅ | QR code generation for reservations |
| event.service | ✅ | Event CRUD, ticket purchase, bundles |

### Service Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| No notification persistence — emails/SMS are fire-and-forget | Can't retry failed sends, no delivery tracking | 🟡 Medium |
| No push notification service (Expo Notifications) | Mobile users get no push alerts | 🟡 Medium |
| `sendReservationReminder` in SMS service exists but no cron calls it | Reminders never actually sent | 🔴 High |
| No WebSocket/real-time for vendor order dashboard | Vendors must refresh to see new orders | 🟡 Medium |

---

## 6. Frontend Audit

### 6.1. Vendor Portal (`apps/vendor-portal`)

| Page | Status | Issues |
|------|--------|--------|
| Login/Register | ✅ Built | Register has 13 TODO items |
| Dashboard | ✅ Built | — |
| Reservations | ✅ Built | — |
| Orders | ✅ Built | — |
| Menu Management | ✅ Built | 5 TODOs (image upload, validation) |
| Gallery | ✅ Built | 1 TODO |
| Guest Profiles (CRM) | ✅ Built | 3 TODOs |
| Analytics | ✅ Built | 2 TODOs |
| Settings | ✅ Built | 6 TODOs (operating hours, delivery zones) |
| Events | ✅ Built | 5 TODOs |
| Experiences | ✅ Built | 2 TODOs |
| Reviews | ✅ Built | 2 TODOs |
| Special Offers | ✅ Built | 4 TODOs |
| QR Scanner | ✅ Built | 1 TODO |
| Credits | ✅ Built | 1 TODO |
| Display Settings | ✅ Built | 1 TODO |

### 6.2. Admin Portal (`apps/admin-portal`)

| Page | Status | Issues |
|------|--------|--------|
| Login | ✅ Built | 4 TODOs |
| Dashboard | ✅ Built | — |
| Users Management | ✅ Built | 8 TODOs (filters, bulk actions) |
| Vendors Management | ✅ Built | 9 TODOs (verification flow, details) |
| Documents | ✅ Built | 2 TODOs |
| Orders | ✅ Built | 1 TODO |
| Reservations | ✅ Built | 1 TODO |
| Analytics | ⚠️ Build error | Missing `@/lib/api` module |
| Credits | ⚠️ Build error | Missing `@/lib/api` module |
| Featured | ⚠️ Build error | Missing `@/lib/api` module |

**Critical:** Admin portal has `@/lib/api` import errors across multiple pages — `src/lib/api.ts` may be incomplete or missing exports.

### 6.3. Mobile App (`apps/mobile-app`)

| Screen | Status | Issues |
|--------|--------|--------|
| Auth (Login/Register/Forgot) | ✅ Built | 14 TODOs across auth screens |
| Home (Discovery) | ✅ Built | — |
| Search | ✅ Built | 6 TODOs (filters, location) |
| Venue Detail | ✅ Built | 4 TODOs |
| Booking Flow | ✅ Built | 5 TODOs (QR display, modify) |
| Bookings List | ✅ Built | 2 TODOs |
| Wallet | ✅ Built | — |
| Events | ✅ Built | 2 TODOs |
| Profile/Settings | ✅ Built | 10 TODOs (edit profile, preferences) |
| Orders | ✅ Built | 2 TODOs |
| CachedImage component | ✅ Built | 6 TODOs (cache eviction, preloading) |

---

## 7. Security Audit

| Check | Status | Notes |
|-------|--------|-------|
| Security headers (CSP, X-Frame, XSS) | ✅ | Applied in `middleware.ts` |
| CORS configured | ✅ | localhost + env-based origins |
| JWT with role claim | ✅ | Roles read from DB, not hardcoded |
| Password hashing (bcrypt, 12 rounds) | ✅ | — |
| Rate limiting | ✅ | In-memory (not Redis-backed) |
| Token blacklist on logout | ⚠️ | Admin logout has broken import |
| Webhook signature verification | ⚠️ | Paystack webhook secret in env but verify logic needs audit |
| Input validation (Zod) | ✅ | All routes validate with Zod schemas |
| Cron endpoint auth | ✅ | CRON_SECRET bearer check |
| SQL injection prevention | ✅ | Prisma ORM parameterizes all queries |
| File upload validation | ⚠️ | No explicit file size/type limits in upload route |

---

## 8. Performance & Scaling (for 100K MAU target)

### Current State

| Area | Status | Recommendation |
|------|--------|---------------|
| Database indexes | ✅ | 40+ indexes across all models |
| Query pagination | ✅ | All list endpoints support `page` + `limit` |
| Image CDN | ✅ | Cloudinary handles transformations |
| Caching (Redis) | ⚠️ Partial | Redis client exists, but only used for token blacklist — no API response caching |
| Connection pooling | ⚠️ | Single Prisma client instance — may need PgBouncer at scale |
| Background jobs | ⚠️ | Cron-only (Vercel) — no queue for async tasks (email, SMS) |
| Real-time | ⚠️ | SSE event emitter exists but not integrated into order/reservation flows |

### Recommended for 100K MAU

```
[ ] Add Redis caching for: vendor detail, menu, featured list, analytics
[ ] Implement API response caching headers (Cache-Control, ETag)
[ ] Add PgBouncer or Prisma Accelerate for connection pooling
[ ] Consider BullMQ or Inngest for background jobs (email, SMS, push)
[ ] Integrate SSE into vendor portal for live order/reservation updates
[ ] Add CDN caching for static assets (Vercel handles this automatically)
[ ] Implement database read replicas for analytics queries
```

---

## 9. Hosting & Deployment

### Current Setup

| Component | Current | Production Recommendation |
|-----------|---------|--------------------------|
| Backend | localhost:3000 | Vercel (auto-scales) |
| Database | Docker PostgreSQL :5433 | Supabase / Neon.tech / AWS RDS |
| Redis | Local | Upstash Redis (serverless) |
| Vendor Portal | localhost:3001 | Vercel (separate project) |
| Admin Portal | localhost:3002 | Vercel (separate project) |
| Mobile App | Expo Dev | EAS Build → App Store + Play Store |
| Cron Jobs | vercel.json (3 jobs) | Vercel Cron (included in Pro plan) |

### Deployment Checklist

```
[ ] Configure production DATABASE_URL (with SSL)
[ ] Configure production REDIS_URL (Upstash)
[ ] Set all API keys for production (Paystack live keys, Resend, Termii, Cloudinary)
[ ] Set CRON_SECRET for production
[ ] Configure custom domain (api.bucr.ng, vendor.bucr.ng, admin.bucr.ng)
[ ] Enable Vercel Analytics
[ ] Set up Sentry for error monitoring
[ ] Configure Cloudinary upload presets for production
[ ] Run prisma migrate deploy on production DB
[ ] Set up database backups (daily)
```

---

## 10. Testing Audit

### Current Test Infrastructure

| Type | Framework | Location | Status |
|------|-----------|----------|--------|
| Unit tests | Jest | `tests/unit/` | ✅ Reservation service tests |
| Integration tests | Jest + Supertest | `tests/integration/` | Directory exists |
| E2E tests | Jest | `tests/e2e/` | Directory exists |
| Load tests | Artillery | `tests/load/` | Config exists |
| Vendor portal tests | Vitest | `apps/vendor-portal/src/__tests__/` | ✅ Menu tests |

### Test Coverage Gaps

```
[ ] No tests for: credit.service, payment.service, order.service, token.service
[ ] No tests for: auth routes (login, register, refresh, reset-password)
[ ] No integration tests for: payment webhook flow, credit purchase flow
[ ] No E2E tests for: full reservation lifecycle (create → check-in → review)
[ ] Mobile app has 0 tests
[ ] Admin portal has 0 tests
```

---

## 11. Pre-Deployment Checklist

### Critical (Must fix before launch)
```
[ ] Fix admin/logout broken import (token-blacklist module)
[ ] Fix admin/avatar FormData typing error
[ ] Implement real data for admin analytics (replace zero placeholders)
[ ] Replace admin report history mock with DB-backed solution
[ ] Add CRON_SECRET to env and production
[ ] Wire up reservation reminder SMS to a cron job
[ ] Add /api/health endpoint for monitoring
```

### High Priority (Fix within first sprint)
```
[ ] Add missing .env.example variables (REDIS_URL, CRON_SECRET, portal URLs)
[ ] Resolve 40 TODO items across vendor portal
[ ] Resolve 33 TODO items across mobile app
[ ] Resolve 15 TODO items across admin portal
[ ] Fix admin portal @/lib/api build errors
[ ] Add push notification service (Expo Notifications)
[ ] Create Notification model for delivery tracking
```

### Medium Priority (Fix before scaling)
```
[ ] Add Redis caching for hot paths (vendor detail, featured, menu)
[ ] Implement background job queue for email/SMS
[ ] Integrate SSE for live vendor dashboard updates
[ ] Add comprehensive test suite (aim for 70%+ coverage)
[ ] Implement audit logging in sensitive admin routes
[ ] Add request body size limits on upload endpoint
```

### Low Priority (Polish)
```
[ ] Add i18n support (English + Pidgin?)
[ ] Add ARIA accessibility tags across portals
[ ] Implement offline caching strategy in mobile app
[ ] Add service worker for vendor portal PWA support
[ ] Add API documentation (Swagger/OpenAPI spec)
```

---

## 12. Recommended Execution Order

| # | Task | Est. Time | Impact |
|---|------|-----------|--------|
| 1 | Fix 2 build errors (admin logout + avatar) | 30 min | Unblocks admin portal |
| 2 | Fix admin analytics zero placeholders | 1 hr | Completes admin dashboard |
| 3 | Replace report history mock with DB model | 2 hr | Data integrity |
| 4 | Add missing .env variables + /api/health | 30 min | Ops readiness |
| 5 | Wire reservation reminder cron | 1 hr | User experience |
| 6 | Fix admin portal @/lib/api build errors | 2 hr | Unblocks admin pages |
| 7 | Push notification service (Expo) | 3 hr | Mobile engagement |
| 8 | Resolve 40 vendor portal TODOs | 6 hr | Feature completeness |
| 9 | Resolve 33 mobile app TODOs | 6 hr | Feature completeness |
| 10 | Add Redis API caching | 3 hr | Performance at scale |
| 11 | Background job queue (BullMQ/Inngest) | 4 hr | Reliability |
| 12 | Comprehensive test suite | 8 hr | Quality assurance |
| 13 | Production deployment + monitoring | 4 hr | Go-live |

---

## 13. Test Credentials (Development)

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Admin** | `admin@bucr.ng` | `Admin@123456` | Admin Portal (port 3002) |
| **User** | `john@example.com` | `User@123456` | Mobile App, 200 credits |
| **Vendor** | `vendor@zumagrill.com` | `Vendor@123456` | Vendor Portal (port 3001) |

### Services Running

| Service | URL | Status |
|---------|-----|--------|
| Backend API | http://localhost:3000 | ✅ Running |
| Vendor Portal | http://localhost:3001 | ✅ Running |
| Admin Portal | http://localhost:3002 | ✅ Running |
| Mobile App | Expo (port 8081) | Start with `npx expo start` |
| PostgreSQL | localhost:5433 | ✅ Docker |
