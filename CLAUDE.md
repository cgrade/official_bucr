# BUCR — Project Memory

This file is automatically read by Claude Code at the start of every session in this repo. It is the canonical context for what BUCR is, how it works, and the decisions that shape the codebase. Keep it updated as decisions change — this file should always reflect the current source of truth.

---

## 1. What BUCR is

BUCR is a Nigerian restaurant reservation and dining platform. Domain: **bucr.ng**. Founder: **Mr. Grade**, a working chef (Chef & Founder/CEO). Launch market: **Abuja** (Maitama, Wuse II, Asokoro, Garki, Gwarinpa), chosen deliberately over Lagos — see Section 3.

**The problem it solves:** Nigeria has a severe restaurant no-show problem. PIE Lagos reported roughly 50% no-shows in 2023; the issue was serious enough that the Lagos State Governor publicly intervened with ~250 operators in December 2025. Restaurants over-prep and under-fill; guests lose confirmed bookings to other walk-ins.

**The solution:** a credit-backed deposit system. Guests deposit credits to confirm a booking. Showing up returns the deposit plus a bonus. No-showing forfeits part of it — split between the vendor (as compensation) and the platform — all inside a closed-loop credit economy that never converts to cash for vendors.

**Competitors:** Reisty (Lagos-only, consumer-first discovery/booking). Dinesurf ($2M ARR, bootstrapped, pivoted to B2B "Guest Growth OS" — vendor SaaS). Neither charges a published per-cover fee; BUCR introduces that mechanism.

---

## 2. Brand & contact

- Founder: Mr. Grade — Chef · Founder & CEO
- Email: mrgrade55@gmail.com
- Phone: +234 814 610 474
- Domain: bucr.ng
- Tagline: "Your table, actually waiting."
- Visual identity: navy (#0F2547) + gold (#C9A84C), Cormorant Garamond (display) + Jost (body)

---

## 3. Market strategy

**Abuja is the primary launch market — not a fallback from Lagos.** Research-backed reasons:
- Welfare-adjusted purchasing power in Abuja is ~2.37x Lagos (people have more real spending power than headline income suggests).
- Abuja has a dense diplomatic/government/NGO/expat clientele — predictable, high-income diners who book ahead and value reliability.
- Lighter traffic and better infrastructure than Lagos mean guests actually arrive at booking time.
- No dominant local competitor in Abuja specifically (Reisty is Lagos-focused).
- Restaurant clusters are geographically tight (Maitama, Wuse II, Asokoro), making founder-led vendor acquisition efficient.
- Lower operating costs extend runway versus a Lagos launch.

**Go-to-market sequencing (do not skip ahead):**
1. Founder-led vendor acquisition — 30-80 venues in Maitama/Wuse II/Asokoro/Garki/Gwarinpa, using Mr. Grade's industry relationships directly.
2. Prove unit economics in Abuja before expanding to Lagos or any other city. Premature geographic expansion is a leading cause of death for Nigerian startups at this stage.
3. Vendor revenue (per-cover fee + subscriptions) must reach break-even on its own — do not rely on BUCR+ (guest membership) to make the model work. Treat BUCR+ as a stretch hypothesis to validate, not a load-bearing revenue assumption.

**Known failure patterns to actively avoid** (from Nigerian startup post-mortems): ignoring unit economics while assuming scale fixes margins; choosing consumer-subscription models in a price-sensitive market without proof; underestimating distribution/vendor-acquisition effort; expanding geography before proving profitability in one city.

---

## 4. The credit economy — canonical rules

This is the most important section. Get this wrong and the legal architecture, the revenue model, and the financial model all break.

### 4.1 Core unit
- **1 credit = N10** (locked; do not use N100 anywhere — this was an early build error, since corrected).
- Purchase price = `credits x N10 x (1 + spread)`, spread default **6%** (configurable, A/B-test candidate).
- Credits expire **90 days** after purchase (`CREDIT_EXPIRY_DAYS`, env-overridable); expiry reminder sent 30 days before.
- Credits are **non-refundable to cash, non-withdrawable, closed-loop** — for both guests and vendors. This is a legal requirement, not a preference.

### 4.2 Deposit — FLAT per reservation (NOT per person)
The deposit is a **flat amount per reservation**. Party size does **not** affect it — a table for 1 and a table for 6 pay the same deposit. The amount is set by the **venue type**, or overridden by the **vendor** in their settings (Settings → Reservations). Minimum ₦10,000 per reservation.

| Venue type | Default deposit (credits) | Naira value |
|---|---|---|
| fine_dining | 2,000 | N20,000 |
| upscale_casual | 1,500 | N15,000 |
| lounge | 1,000 | N10,000 |
| casual | 1,000 | N10,000 |
| (fallback / DEPOSIT_DEFAULT) | 1,000 | N10,000 |

Vendors may set their own flat deposit via `customDepositCredits` on the Vendor model (range 100–10,000 credits = ₦1,000–₦100,000). When set, it overrides the venue-type default. Resolution order in `calculateReservationDeposit()`: vendor custom → venue-type default → global default.

### 4.3 Show-up flow
Guest checks in (QR or PIN) -> 100% of deposit returned + **3% show-up bonus**, as usable credits.

### 4.4 No-show flow (canonical, resolved model)
- Guest forfeits **40%** of the deposit (uniform across all venue types).
- Guest **keeps 60%** — returned to their balance as normal usable credits.
- Of the forfeited 40%: **30% of the original deposit -> vendor**, as **non-cashable marketing credits**. **10% of the original deposit -> BUCR**, as platform credits.
- Worked example: 1,000-credit deposit, no-show -> guest keeps 600, vendor gets 300 (marketing credits), BUCR gets 100.
- platformShare is always derived as `forfeit − vendorShare` (40% − 30% = 10%), never a fixed %.
- All of this happens inside **one atomic `db.$transaction()`**. No per-cover fee is charged on a no-show.

### 4.5 Cancellation refunds
| Time before booking | Refund |
|---|---|
| 24+ hours | 100% |
| 12-24 hours | 50% |
| Under 12 hours | 0% |
| Vendor cancels | 100% refund + 10% compensation bonus to guest — **the 10% is paid by the vendor out of their (non-cashable) marketing wallet**. A vendor must therefore hold ≥10% of the deposit in credits to cancel; the cancel is blocked server-side if their wallet is short. Enforced atomically in `cancelReservation` (vendor branch). |

### 4.6 Vendor credit rules — the legal gate
- Vendors **earn** credits only via no-show compensation (30% share above) and platform promotions.
- Vendors **spend** credits only on BUCR's own marketing inventory (featured placement, promoted spots).
- Vendors may also buy marketing budget directly with naira (same 6% spread as guests).
- **Vendor credits can NEVER be withdrawn to cash.** This must be enforced at the service layer via a config flag (`VENDOR_WITHDRAWAL_ENABLED = false`), not just hidden in the UI. This is the single most important legal guardrail in the entire system — it's what keeps BUCR outside CBN money-services licensing (no settlement to a third party = no MMO/e-money license required). Do not ship any code path that enables it. It stays `false` until a licensed payment partner is integrated and counsel signs off.

### 4.7 Gifting (feature)
- Guest can gift credits to another user (by phone/email). Fee: **8% of gift value**, charged in credits.
- If recipient is an existing user -> auto-claim immediately; fee recognized as platform revenue on claim.
- If recipient is not a user -> pending invite (SMS + email), claim window **30 days**; new-account registration auto-claims matching pending gifts.
- If unclaimed past the window -> expires, **full refund to sender** (gift amount + fee), no fee revenue recognized on an expired gift.
- All atomic; adversarial cases handled: can't gift more than you hold, can't claim twice, can't claim expired.

---

## 5. Revenue model — the four no-license lines

The cardinal rule across the whole monetization model: **money flows only TO BUCR, never OUT to a third party as settlement.** This is what avoids needing a CBN payment-services license at launch.

| Line | Mechanism | Sequencing |
|---|---|---|
| **Per-cover success fee** | Flat fee **per seated head**, billed to vendor monthly. The fee is multiplied by party size: **total = base × tier multiplier × partySize** (a table of 1 → 1×, a table of 4 → 4×). **Basic-tier base = N1,500 per head** (flat across all venue types). NEVER a percentage of the bill (a % would constitute settlement/licensing exposure). Reduced by subscription tier (Pro = 50% = N750/head, Elite = 0%). Triggered by guest-side check-in, not vendor self-report (prevents under-reporting). | Stage 1 — launch. Sells with zero proof since it's pay-per-result. |
| **Vendor subscriptions** | Basic = **free** (required for supply-density acquisition). Pro = **N30,000/mo**. Elite = **N85,000/mo**. Anchored on Dinesurf's verified pricing (Basic N18k, Core N50k, Pro N83-125k) — BUCR sits between/below those. | Stage 2 — growth, once per-cover has proven value. |
| **Marketing / featured placement** | Vendors pay (naira or marketing credits) for featured carousel slots, top-of-search, promoted experiences, category sponsorship. Only works at vendor density — near-zero value with few vendors, becomes the highest-margin line at scale. | Stage 3 — scale. |
| **BUCR+ guest membership** | N3,500/mo or ~N35,000/yr, includes a monthly credit bundle + perks (priority booking, no service fees, concierge). Highest-uncertainty line in the model — defer until genuine venue scarcity exists (3-5 exclusive premium venues). | Stage 4 — once supply is desirable. Do not rely on this for break-even. |

**Additional revenue (not in the four-stage sequence but real):**
- **Credit purchase spread** (6-7% markup) — becomes the single largest revenue line at scale (~51% of revenue in modeled projections) because every credit purchase generates margin instantly.
- **Credit breakage** — unspent credits at 12-month expiry recognized as platform revenue.
- **Gift fee** (8%).
- **No-show platform share** (10% of forfeited deposits).

**On per-cover fee pricing specifically:** there is no public Nigerian benchmark for this (no competitor publishes one) — BUCR is introducing the mechanism. The N1,500 flat per-cover figure (Basic tier) is a reasoned estimate anchored on OpenTable's global per-cover benchmark and Abuja dining price levels, not validated local data. **Validate with 15-20 Abuja vendors before treating these as fixed.**

**Future/deferred revenue — requires a licensed partner:** a commission on the actual meal bill (the largest pool of money in the system, currently untouched). This requires collecting the bill in-app and remitting to the vendor — which is settlement, requiring a licensed BaaS/MMO partnership (e.g. Paystack MFB, Flutterwave MFB — both now hold Nigerian microfinance banking licenses as of 2026). Not part of the launch architecture. When unlocked, credits can be reconciled against a bill payment through the licensed rail without breaking the closed loop (see the float-application mechanism in BUCR_Monetization_Model.docx Section 4.3).

**Illustrative financial shape** (figures are placeholders to show structure, not validated forecasts — see BUCR_Monetization_Model.xlsx for the live, editable model):
- Break-even lands somewhere in the 150-250 vendor range depending on pricing inputs.
- Net margin climbs from negative pre-breakeven to roughly 60-67% at scale (500-1,000 vendors), typical of a marketplace+SaaS model once density kicks in.

---

## 6. Legal & compliance posture

BUCR is designed to operate in Nigeria **without a CBN payment-services/e-money license** by staying strictly closed-loop. This is a deliberate architecture, not an oversight — do not casually add features that break it.

**The non-negotiable rules:**
1. Vendor credits are never withdrawable/cashable. (`VENDOR_WITHDRAWAL_ENABLED = false`, enforced server-side.)
2. No naira ever flows from BUCR to a vendor as settlement of guest funds. Vendors are paid in real naira only directly by guests at the venue (outside BUCR) or via BUCR invoicing the vendor (subscriptions, per-cover fees — money flows TO BUCR).
3. The per-cover fee is always a **flat amount**, never a percentage of the bill — a percentage would functionally resemble a payment-processing commission and re-introduce settlement/licensing exposure.
4. Credits are disclosed as "platform access credits," not as a wallet, stored value, or currency. They're non-refundable, expire in 90 days, earn no interest.
5. The credit float (cash received for unspent credits) is held in a segregated operating bank account, not commingled with general opex.

**A Nigerian fintech/payments lawyer must review this architecture before launch.** A purpose-built legal review brief exists (`BUCR_Legal_Review_Brief.docx`) with seven specific questions for counsel, scoped narrowly so the review is fast and cheap rather than an open-ended audit. Until that review is complete and the model is cleared, treat every economic figure in this file as provisional.

---

## 7. Technical architecture

### Monorepo structure
```
official_bucr/
├── apps/
│   ├── mobile-app/       Expo React Native (customer-facing)
│   ├── vendor-portal/    Next.js 14 (restaurant dashboard)
│   └── admin-portal/     Next.js 14 (platform management)
├── src/                  Backend API (Next.js App Router)
│   ├── app/api/          API routes
│   ├── services/         Business logic layer
│   ├── lib/              Auth, DB, cache, middleware, utilities
│   │   └── config/economics.ts   <- single source of truth for ALL economic constants
│   └── types/
├── prisma/               Schema + migrations
├── middleware.ts         CORS + security headers
├── docker-compose.yml    Local Postgres (port 5433)
└── vercel.json           Cron schedule
```

### Stack
| Layer | Tech |
|---|---|
| Backend | Next.js 14 (App Router), TypeScript |
| Database | PostgreSQL + Prisma ORM (hosted on **Supabase** in production — see Section 8) |
| Cache / blacklist | Redis (with in-memory fallback if Redis is down) |
| Auth | JWT (jose) — 15min access / 7-day refresh; blacklisted on logout |
| Passwords | bcryptjs, 12 salt rounds |
| Payments | **Paystack** (primary) — card, bank transfer, USSD, QR, mobile money. Flutterwave as a planned failover rail. |
| Images | Cloudinary |
| Email | **Resend** (escalate booking-critical sends to Postmark if deliverability issues arise) |
| SMS | **Termii** (Nigerian-built, DND-compliant routing — deliberately chosen over global providers like Twilio for cost + compliance) |
| Maps | **Mapbox** (chosen over Google Maps — ~85% cheaper geocoding, larger free tier) |
| Mobile | Expo React Native + NativeWind (TailwindCSS) |
| Web portals | Next.js 14 + Radix UI + TailwindCSS |
| Client state | Zustand + React Query |
| Cron | Vercel Crons (all routes guarded by `CRON_SECRET`) |

### The economic config module — non-negotiable pattern
**Every economic constant lives in `src/lib/config/economics.ts`. No service may hardcode an economic value.** This includes credit value, spread, expiry, deposit tiers, show-up bonus %, no-show forfeit % (overall and per-venue-type), no-show split %, cancellation refund tiers, per-cover fees (by venue type), subscription prices, gift fee %, and the `VENDOR_WITHDRAWAL_ENABLED` flag. Tunable levers are env-var overridable. This exists so legally-mandated or pricing changes are config edits, not code rewrites, and so a lawyer/auditor has one place to review.

### Key data models (Prisma) — 23+ models including:
- **Users & vendors:** User, Vendor (with `venueType` enum: fine_dining | upscale_casual | lounge | casual, `subscriptionTier`: basic | pro | elite, `reliabilityScore`, `bookWithConfidence` badge), VendorBranch (lat/lng — now wired to Mapbox), GuestProfile (vendor-side CRM)
- **Bookings:** Reservation (status, QR, PIN, credits deposited/refunded/bonus), TakeoutOrder
- **Financials:** CreditTransaction (user ledger), VendorCreditTransaction (vendor wallet — `no_show_share`, `featured_spend`, **`withdrawal` type exists in schema but is disabled in code**), VendorWallet, Payment, **CoverCharge** (per-cover fee accrual), **PlatformRevenue** (recognizes spread/breakage/cover-fee/gift-fee/no-show-share/subscription revenue separately from raw credit movement)
- **Gifting:** **Gift** model (sender, recipient, amount, fee, status pending/claimed/expired, expiry)
- **Content:** Experience, Menu + MenuCategory (with `isAvailable`, `availableForDineIn`, `availableForTakeout`, and `unavailableUntil` for temporary "86" availability), Review, SpecialOffer, Achievement
- **Events:** Event, EventTicket, EventBundle
- **Platform:** FeaturedPackage/FeaturedSpot, Notification, VerificationToken, AuditLog, Waitlist, Invitation, Favorite

### Architectural patterns that must be preserved
- **Every credit mutation is inside `db.$transaction()`** — atomic, no partial states. This is the single highest-stakes pattern in the codebase.
- Fire-and-forget notifications (`.catch()`, never blocking the response).
- Soft deletes (`deletedAt`) on User, Vendor, Reservation — never hard-delete.
- `AuditLog` on every sensitive admin/economic action.
- Role-based route protection via `withAuth(handler, [roles])`.
- Consistent pagination: `{ data, meta: { page, limit, total, totalPages } }`.
- `@@index` on every common filter field.
- Paystack webhook verified via HMAC-SHA512 signature.
- Redis token blacklist with in-memory fallback for resilience.

---

## 8. Third-party services — chosen and why

| Category | Choice | Why (brief) |
|---|---|---|
| Email | **Resend** | Cheapest good option now; React Email templating. Escalate booking-confirmation-critical sends to Postmark only if deliverability issues appear — don't switch everything pre-emptively. |
| SMS | **Termii** | Nigerian-built, direct carrier relationships, DND-registry-compliant routing. Cheaper than international providers (Twilio etc.) at Nigerian volumes. Africa's Talking is the credible backup if redundancy is ever needed. |
| Database | **Supabase** | Bundles managed Postgres + auth + storage + realtime; Row Level Security adds defense-in-depth for a credit-ledger app. Chosen over Neon specifically because of Neon's 2025 outage history — too risky for a system holding live credit balances. |
| Payments | **Paystack** primary | Stripe-backed infrastructure, ~60%+ Nigerian merchant market share, best developer experience. Flutterwave should be added as a documented failover rail once volume justifies maintaining two integrations (target: Stage 2 growth). Note: CBN fined Paystack N250M for a regulatory matter in the past — a compliance event, not a platform-reliability one, but worth flagging to legal counsel. |
| Maps | **Mapbox** | ~85% cheaper geocoding than Google Maps, nearly 2x the free map-load tier. Validate Nigerian address/geocoding accuracy for the specific Abuja launch neighborhoods before fully committing. |
| Images | Cloudinary | Keep — industry standard, no reason to switch at this scale. |
| Cache / rate-limiting | Redis | Keep — serverless-friendly, in-memory fallback already correctly architected. |
| Hosting | Vercel | Keep — native fit for Next.js 14 App Router + cron. |
| Push notifications | Expo Notifications / Firebase | Keep — standard Expo RN pairing. |

A full reference document with reasoning exists: `BUCR_Third_Party_Services_Reference.docx`. Re-evaluate this table at each major scale milestone — pricing in this market (especially Maps and SMS) shifts often due to regulatory and platform changes.

---

## 9. Feature status

| Feature | Status |
|---|---|
| Credit-backed reservations | Built — values corrected to N10/credit and the resolved no-show split |
| Vendor reliability score + Book-With-Confidence badge | Built — 90-day rolling window, 95% threshold sustained 60 days, counts only vendor-fault failures (not guest no-shows) |
| Pre-order with reservation | Built — data-only signal to kitchen; guest still pays at venue |
| Menu availability toggle | Built — including temporary "86 for service" with auto-reset (`unavailableUntil`) |
| Gift and credit-gifting | Built — 8% fee, auto-claim, expiry-refund, mobile UI |
| Event ticketing | Built — Event/EventTicket/EventBundle |
| Per-cover success fee | Built — segmented by venueType, reduced by subscription tier, accrued on check-in, invoiced monthly |
| Vendor subscriptions | Built — repriced to Basic free / Pro N30k / Elite N85k |
| Platform revenue ledger | Built — separates spread/breakage/cover-fee/gift-fee/no-show-share/subscription |
| Vendor credit withdrawal | **Disabled by design** — `VENDOR_WITHDRAWAL_ENABLED = false`, do not re-enable without legal sign-off + licensed partner |
| Vendor staff logins | Built — `VendorStaff` model (roles: manager/staff), owner invite → email accept link → set password → login at the vendor portal. Scoped to one vendor via `getVendorContext(payload)`; least-privilege capability matrix in `src/lib/auth/vendor-context.ts`. Operational endpoints (check-in cluster, reservations) accept staff; money/identity/team endpoints stay owner-only by default. |
| Mapbox integration (discovery map, branch geocoding) | In progress per `BUCR_Mapbox_Integration_Prompt.md` |
| BUCR+ guest membership | Designed, deliberately not yet built — deferred to Stage 2-3 |
| Night-out planner (multi-venue) | Designed, not built — lower priority |
| Live real-time queue (beyond basic waitlist) | Designed, not built — lower priority |
| Guest loyalty tiers | Designed, not built |
| Bill commission / in-app meal payment | Deferred — requires licensed BaaS partner, not part of launch architecture |
| Multi-country support (NG/GH/KE) | Plumbing built — `VendorBranch.country`, `User.country`, country-aware geocoding, country→phone-format on registration. Phone-format localisation is **live**. |
| Local-currency DISPLAY (GH₵/KSh via live FX) | **Built but gated OFF** — `MULTI_CURRENCY_DISPLAY_ENABLED = false`. Credit base stays ₦10; FX (open.er-api.com) is display-only, never settlement. Flip per market only after counsel sign-off + real approved vendors. Converted amounts carry a "≈" marker + "billed in Naira" disclaimer. |
| Transactional email (Resend) | Built — welcome (diner + vendor), reservation confirmation (diner) + new-reservation alert (vendor), reservation reminder, credit-expiry reminder, order confirmation, vendor weekly report. SMS deferred to post-launch. |

---

## 10. Companion documents

These exist alongside this file and should be treated as authoritative for their domain:
- `BUCR_Source_of_Truth_Spec.docx` — the canonical reconciliation of build vs. strategy decisions (most detailed version of Sections 4-7 above).
- `BUCR_Change_List.docx` — prioritized engineering tasks (P0-P3) implementing the spec.
- `BUCR_Implementation_Prompt.md` — the original Claude Code prompt that implemented the credit rework, gifting, and menu toggle.
- `BUCR_Audit_Checklist.md` — full test/audit checklist for verifying the implementation (run this after any change to credit logic).
- `BUCR_Monetization_Model.docx` + `.xlsx` — full revenue architecture + live editable financial model.
- `BUCR_Legal_Review_Brief.docx` — the scoped brief for Nigerian fintech counsel.
- `BUCR_Third_Party_Services_Reference.docx` — full reasoning behind every infrastructure choice in Section 8.
- `BUCR_Mapbox_Integration_Prompt.md` — the Mapbox build prompt.

**When a decision changes, update this file first**, then bring the code and other documents into line — this file is the entry point for any new session (human or Claude Code) on this project.

---

## 11. Open items / known unknowns

- Per-cover fee pricing (N1,500 flat, Basic tier) is not yet validated against real Abuja vendor willingness-to-pay — needs 15-20 vendor conversations.
- Credit purchase spread (6-7%) is not yet validated against guest acceptance — needs a small user survey.
- BUCR+ guest membership has the highest uncertainty in the entire model — treat as a hypothesis, not a plan.
- Legal review of the full closed-loop architecture is pending — do not treat any economic figure here as final until counsel signs off.
- **Legal Q for counsel (add to `BUCR_Legal_Review_Brief.docx`):** Is displaying an *indicative* foreign-currency equivalent (GH₵/KSh), while the price of record and settlement remain in Naira, compliant with CBN Act 2007 s20 and the anti-dollarization circulars — including for cross-border Ghanaian/Kenyan users? Research suggests yes (benchmarking ≠ pricing/denominating in FX), but it must be confirmed. Until then `MULTI_CURRENCY_DISPLAY_ENABLED` stays `false` and everything shows ₦.
- BUCR Limited's incorporation status with the CAC should be confirmed/updated wherever the legal brief references "in formation."
- Flutterwave failover integration not yet built (planned for Stage 2).
- Postmark fallback for booking-critical emails not yet built (trigger: deliverability issues observed on Resend).