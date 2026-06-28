# BUCR — Security, QA & Launch-Readiness Audit

*Reviewer lens: 20-yr engineer / QA / product. Method: static sweep of the codebase
(injection, XSS, secrets, authz, headers, token handling), plus the economic + workflow
verification done across prior audit passes. Last updated: 2026-06-28._

---

## Verdict (TL;DR)

**Launch-ready for the intended controlled, founder-led Abuja pilot — after a short
pre-launch checklist.** The engineering is disciplined and the money is safe: the credit
ledger reconciles to the kobo, every mutation is atomic, the closed-loop posture is enforced
in code, RBAC + tenant isolation are real, and there is now a green CI gate + a 342-test
suite. The remaining items are **hardening, not architecture** — provision live keys, tighten
a few web-security defaults, and close the booking top-up UX gap.

**Not yet ready for an unbounded public launch at scale** without distributed rate-limiting,
real-time error alerting, and the web-security items below.

---

## Security posture — what's solid ✅

| Area | Finding |
|---|---|
| **SQL injection** | Prisma everywhere; only 2 raw queries, both safe tagged templates (`$queryRaw\`SELECT 1\``). No `RawUnsafe`. |
| **XSS** | No `dangerouslySetInnerHTML` / `innerHTML` in app code. |
| **RCE** | No `eval` / `child_process` / `exec`. |
| **Secrets** | None hardcoded in source; all via env, `.env` gitignored. |
| **PII exposure** | `passwordHash` only selected for login/change-password comparison, never returned. |
| **Payments** | Paystack webhook verified by HMAC-SHA512 with constant-time comparison; money flows only TO Bucr (closed loop). |
| **Auth** | JWT (jose) 15-min access / 7-day refresh + Redis blacklist on logout; bcrypt 12 rounds; no weak secret fallback. |
| **Authorization** | Admin RBAC (`adminCan`) + vendor RBAC (`can`/capabilities) + per-vendor tenant scoping (`vendorId`). 160/180 routes guarded; all 20 public routes intentional (discovery, config, auth, token-gated invite). |
| **Rate limiting** | Auth + money/abuse endpoints (booking, credit-purchase, gifts, reviews, waitlist, upload). |
| **Input validation** | Zod schemas across endpoints. |
| **Uploads** | Size cap (8MB images / 15MB docs) + MIME allowlist (blocks SVG/scripts). |
| **Headers** | X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy. |
| **Data integrity** | Every credit mutation atomic; ledger verified `balance == Σ(transactions)`; soft deletes + audit log. |
| **CI** | GitHub Actions typecheck (5 codebases) + 342 vitest tests on every push. |

---

## Findings to address (prioritized)

### 🟠 High — close before public scale (most before pilot)

1. **Web tokens are in JS-accessible cookies (not `httpOnly`).** `js-cookie` can't set
   `httpOnly`, so a successful XSS could exfiltrate access + refresh tokens. Risk is reduced
   (no XSS sinks found, `sameSite=lax`, `secure` on HTTPS), but the enterprise-standard is
   **server-set `httpOnly` cookies**. *Fix:* issue auth cookies from the API with
   `httpOnly; secure; sameSite=strict`.
2. **CORS is wildcard (`Access-Control-Allow-Origin: *`).** Lower risk because auth is a
   Bearer header (not auto-sent like cookies), but it should be an **allowlist** of bucr.ng
   origins. *Fix:* reflect only known origins.
3. **No HSTS / CSP headers.** Add **Strict-Transport-Security** (force HTTPS) for production
   and a **Content-Security-Policy** as defense-in-depth against XSS.
4. **In-memory rate-limit store.** On serverless (Vercel) each instance has its own map, so
   limits are per-instance, not global — an attacker hitting multiple instances gets N× the
   limit. *Fix:* back the limiter with Redis (the infra is already used for the blacklist).
5. **No real-time error alerting.** Error capture is centralized + structured (`capture.ts`)
   but log-only — Sentry was deferred (its `@opentelemetry` tree broke the lockfile). *Fix:*
   add `@sentry/nextjs` via an instrumentation hook (one-place change; capture already funnels
   every webhook/cron through it).

### 🟡 Medium / Low

6. **Booking "insufficient credits" surfaces as a generic failure** on web when the cached
   balance is stale at click-time (should route to top-up). *Fix:* on the booking error,
   detect insufficient-credits and route to `/wallet`; `refetchOnMount: 'always'` for balance.
7. **Admin broadcast body is rendered as HTML in emails.** Admin-only (trusted), but
   escape/sanitize the body before interpolating into email HTML.
8. **Messaging gating is inconsistent.** Message-center entries are always created while
   push/email respect the vendor's notification preference — align the policy.
9. **Day-boundary filters still use server-local `setHours`** (today/tomorrow groupings) —
   off by the offset on UTC infra (the wall-clock booking paths were fixed; these weren't).
10. **No pagination / delete / archive on the vendor message center** (hard 50-cap).

---

## QA / workflow status

- **Economics:** verified correct + ledger-consistent; unit-tested (deposits, cancellation
  tiers, show-up bonus, no-show 60/30/10 split, gift fee, per-cover × party size, TZ helper).
- **Booking:** same-day allowed, TZ-safe, operating-hours gate, verification gate (with
  existing users grandfathered), idempotency on retry.
- **Known product gaps (documented in FEATURE_GAPS.md):** SMS/push need keys (built, dormant);
  per-slot capacity/table availability not modeled (waitlist is host-driven); event ticketing
  built-but-parked; BUCR+ / bill-commission not built (roadmap).

---

## Pre-launch checklist (controlled Abuja pilot)

**Must:**
1. Provision live keys: Paystack, Resend, Termii (SMS), Expo push, Cloudinary, Supabase, Mapbox.
2. `httpOnly` auth cookies (#1) + CORS allowlist (#2) + HSTS (#3).
3. Booking top-up UX fix (#6).
4. Complete the Nigerian fintech/closed-loop **legal review** (per CLAUDE.md) before taking real deposits.
5. Confirm `REQUIRE_VERIFICATION_TO_BOOK=true` + the grandfather migration ran in prod.

**Should:**
6. Redis-backed rate limiting (#4) + Sentry (#5) before opening beyond the pilot cohort.
7. Seed-data hygiene: remove test accounts; set real deposit/fee values per the validated model.

**Verdict restated:** ship the controlled pilot once the "Must" list is done; treat the
"Should" list as the gate to broader/public availability.
