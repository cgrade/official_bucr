# BUCR — Feature Gaps

A living register of features that are missing, partial, or built-but-unsurfaced, found
during a system-wide audit. The core platform (credit economy, reservations, no-show /
cancellation splits, gifting, reviews, per-cover invoicing, vendor & admin RBAC, message
center, referrals, account deletion, full auth) is **complete and verified** — the items
below are the deltas.

**Status key:** ✅ done · 🟡 partial · ⛔ not built · 🅿️ built-but-parked (hidden by choice)
**Priority:** P0 launch-blocking · P1 soon after launch · P2 growth · P3 later

_Last updated: 2026-06-25. Keep this in sync as gaps are closed; remove items when shipped._

---

## A. Web ⇄ Mobile parity — ✅ CLOSED (this pass)
The web diner app now mirrors mobile for experiences and special offers.
- **Experiences** — web venue page lists them and books with the experience's own
  deposit + capacity (`experienceId`). ✅
- **Special offers** — web venue page lists them; "Book with this offer" opens a normal
  reservation and notes the offer to the vendor via `specialRequests`. ✅
- _Remaining nicety (P3):_ richer home/discovery surfacing of experiences/offers on web
  (mobile home + search highlight them; web home shows only a Featured row).

---

## B. Built backend, no / hidden consumer UI

### B1. Event ticketing — 🅿️ built, hidden — P2
A **complete** backend exists: `Event`, `EventTicket`, `EventBundle` models; routes
`/events`, `/events/[id]/tickets`, `/events/[id]/bundles`, `/vendor/events`,
`/users/event-tickets`, `/users/event-bundles`. There is **no consumer UI** on web or
mobile, and the vendor/admin Events pages render "Coming Soon".
- **Gap:** discovery, ticket purchase (Paystack), and ticket display/redemption UI.
- **Decision needed:** ship it as a revenue line, or formally shelve. Currently dead code
  surface that still needs maintenance.

### B2. Orders / takeout — 🅿️ built, hidden (intentional) — P2
`TakeoutOrder` model + `/orders` routes + `order_payment` Paystack purpose exist; all UIs
say "Coming Soon" (hidden per product decision). Pre-order-to-table is the launch path;
standalone takeout is parked.
- **Gap:** order placement + kitchen/vendor order management UI if/when revived.

---

## C. Lifecycle gaps — ✅ CLOSED (this pass)

### C1. Multi-branch — ✅ done (core) — P1
- Branch CRUD: GET/PATCH/**DELETE** on `/vendor/branches/[branchId]` (this already
  existed; delete now blocks branches with upcoming reservations, main branch protected).
- **Diner branch selection** at booking on web + mobile (Location picker when >1 branch),
  `branchId` persisted on the reservation.
- Vendor **delete** button wired in Settings → Locations.
- _Remaining (P2):_ per-branch **operating-hours** editing UI (the `[branchId]` PATCH
  already accepts `operatingHours`; the Business Hours tab still edits the main branch) and
  branch-filtered vendor dashboards / per-branch capacity.

### C2. Waitlist — ✅ done — P1
Full vendor seating loop: `GET /vendor/waitlist` (queue + position, lazy-expires lapsed
holds), `POST .../[id]/notify` (15-min hold + push/SMS/email), `POST .../[id]/seat`,
`DELETE .../[id]`; guest `GET /waitlist` returns live position; cleanup cron expires stale
holds. Vendor portal **Waitlist** page. No credits (walk-in list).
- _Remaining (P3):_ in-app guest waitlist-status screen (guest is already notified by
  push/SMS/email; position API exists).

### C3. Subscription downgrade — ✅ done — P2
Scheduled downgrade (`VendorSubscription.scheduledTier`): keep the current paid tier until
period end (no refund — closed loop), then the cron applies it. `POST/DELETE
/vendor/subscription/downgrade` + vendor portal banner/controls.
- _Remaining (P2):_ a seamless landing straight onto a lower **paid** tier needs a saved
  payment method (architecture is pay-per-period via Paystack); for now a paid landing
  drops to Basic and prompts a re-subscribe.

### C4. Booking verification gate — ✅ done — P1
Booking now requires a verified **email OR phone** (`ECONOMICS.REQUIRE_VERIFICATION_TO_BOOK`,
default on). Register auto-sends the email OTP; `/reservations` returns
`VERIFICATION_REQUIRED`; web + mobile have a verify screen (resend + skip); `/auth/me` +
`/users/profile` expose `isVerified`. Browsing/login stay open.

---

## D. Designed-but-not-built (roadmap — confirmed absent in code)

| Item | Status | Priority | Notes |
|---|---|---|---|
| **BUCR+ guest membership** | ⛔ | P2–P3 | Deliberate (Stage 2–3). ₦3,500/mo bundle + perks. Do **not** rely on for break-even. |
| **Bill commission / in-app meal payment** | ⛔ | P3 | Largest untapped revenue pool. **Requires a licensed BaaS/MMO partner** (settlement). Not part of launch architecture. |
| **Live real-time queue** (beyond basic waitlist) | ⛔ | P2 | SSE channel exists (`/realtime/events`); no queue feature on top. |
| **Guest loyalty tiers** | ⛔ | P2 | Vendor achievements auto-sync today; no guest-side tiers/points. |
| **Night-out multi-venue planner** | ⛔ | P3 | Lower priority. |
| **Flutterwave failover rail** | ⛔ | P1–P2 | Single payment rail (Paystack) today. Add once volume justifies two integrations. |
| **Postmark email fallback** | ⛔ | P2 | Single email rail (Resend). Add only if Resend deliverability degrades. |

---

## E. Config / operational (code is ready, ops/policy pending)

### E1. SMS & Push — ✅ built, ⚙️ needs keys — P0 to enable
Both are **fully implemented** (real Termii SMS API + Expo push), but **gated on missing
credentials** — they silently no-op until configured.
- SMS: set `TERMII_*` (password reset, phone verification, gift + booking notifications go live).
- Push: configure Expo push credentials / project; tokens are already saved per user and
  sent on notification events.
- **Action:** provision keys before launch; otherwise booking-critical SMS/push won't send.

### E2. Single payment + email rails — see D (Flutterwave / Postmark).

---

## F. Documentation drift (correct in `CLAUDE.md`)

- **CLAUDE.md says "SMS deferred to post-launch"** — stale. SMS is fully wired (Section E1).
  Update the feature-status table + Section 8 to reflect SMS as built-pending-keys.
- The feature-status table should also note Event ticketing as **built but hidden** (B1)
  rather than simply "Built", to avoid implying it's shipped to users.

---

## Suggested sequencing
1. **P0 / launch:** provision SMS + push keys (E1). _(C4 verification gate is now built +
   on by default.)_
2. **P1 / immediately after:** Flutterwave failover (D). _(C1 multi-branch core, C2 waitlist
   seating, C4 verification — done.)_
3. **P2 / growth:** event ticketing decision (B1), live queue, loyalty, BUCR+; finish C1
   (per-branch hours UI + branch-filtered dashboards); seamless paid downgrade for C3.
4. **P3 / later:** bill commission (needs licensed partner), night-out planner, web
   discovery polish (A remaining nicety), guest waitlist-status screen (C2 remaining).
