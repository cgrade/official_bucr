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

## C. Partially-built lifecycle

### C1. Multi-branch — 🟡 partial — P1
Vendors can **create** branches (`POST /vendor/branches`) and set operating hours
(`PATCH`). Missing:
- **Per-branch edit / delete** endpoint + UI (no `DELETE`, no `/vendor/branches/[id]`).
- **Branch-scoped operations** — reservations, deposits, capacity, and the QR/check-in
  flow are effectively single-branch; a diner can't pick a branch and a vendor can't run
  per-branch availability.
- **Effort:** medium. Needs branch selection in the booking flow + branch filters across
  vendor dashboards.

### C2. Waitlist — 🟡 join-only — P1
Guests can **join** a waitlist (`POST /waitlist`, states `waiting` / `notified`), but
there is **no vendor action to notify / seat the next party** and no auto-promotion when a
table frees up. The loop is open-ended.
- **Gap:** vendor "notify next" / "seat" endpoint + UI; optional push/SMS on promotion;
  position display for the guest.
- **Effort:** small–medium.

### C3. Subscription downgrade — 🟡 partial — P2
`upgrade` and `cancel` exist; a true **downgrade** path (Elite→Pro, with proration /
credit handling) is not clearly implemented.
- **Gap:** downgrade endpoint with proration policy; confirm `cron/subscriptions` handles
  tier step-downs at period end.

### C4. Email verification not enforced — 🟡 — P1
`/auth/verify-email` exists and sends, but login and booking are **not gated** on a
verified email — accounts work fully unverified.
- **Decision:** enforce verification (block booking until verified) or keep soft. If soft,
  document it; if enforced, add the gate in `withAuth`/booking + a resend flow.

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
1. **P0 / launch:** provision SMS + push keys (E1); decide email-verification policy (C4).
2. **P1 / immediately after:** waitlist seating (C2), multi-branch completion (C1),
   Flutterwave failover (D).
3. **P2 / growth:** event ticketing decision (B1), live queue, loyalty, subscription
   downgrade (C3), BUCR+.
4. **P3 / later:** bill commission (needs licensed partner), night-out planner, web
   discovery polish (A remaining nicety).
