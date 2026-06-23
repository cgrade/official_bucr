# BUCR Platform Economics & Business Logic

> Comprehensive documentation of the credit system, event ticketing, revenue generation, and payment strategy for the Bucr platform.

> ⚠️ **Outdated in places.** This early doc predates the economic corrections.
> The canonical source of truth is `src/lib/config/economics.ts` and `CLAUDE.md`.
> Known stale figures here: credit face value is **₦10** (not ₦100), purchase
> spread is **6%** (not 17%), expiry is **90 days**. Expiry references below have
> been corrected; the ₦100 face-value figures have not been swept.

---

## Table of Contents

1. [Credit System](#1-credit-system)
2. [Reservation Credit Flow](#2-reservation-credit-flow)
3. [Event System](#3-event-system)
4. [Revenue Generation Streams](#4-revenue-generation-streams)
5. [Event Ticket Payment: Recommendation](#5-event-ticket-payment-recommendation)
6. [Financial Projections](#6-financial-projections)

---

## 1. Credit System

### 1.1 Overview

Bucr operates a **closed-loop credit system** ("Bucr Wallet") that serves as the platform's economic backbone. Users purchase credits with naira, then spend credits on reservations, events, and experiences. This creates a **walled garden** where Bucr controls the float, earns margins on every purchase, and benefits from breakage (unused/expired credits).

### 1.2 Credit Configuration

| Parameter | Value | Source |
|---|---|---|
| **Face value** | 1 credit = ₦100 | `config.credits.valueNgn` |
| **Purchase price** | 1 credit = ₦120 | `config.credits.purchasePriceNgn` |
| **Purchase margin** | 17% per credit | (₦120 - ₦100) / ₦120 |
| **Expiry** | 90 days from purchase | `config.credits.expiryDays` |
| **Expiry reminder** | 30 days before expiry | `config.credits.expiryReminderDays` |
| **Breakage target** | ~12% of purchased credits | Business target |

### 1.3 Credit Transaction Types

The system tracks these transaction types (defined in `CreditTransactionType` enum):

| Type | Description | Amount Direction |
|---|---|---|
| `purchase` | User buys credits via Paystack | **+** (positive) |
| `redeem` | Credits deducted for reservation/event | **-** (negative) |
| `refund` | Credits returned (cancellation, show-up) | **+** (positive) |
| `bonus` | Bonus credits awarded | **+** (positive) |
| `forfeit` | Credits forfeited (no-show, late cancel) | **-** (negative) |
| `expire` | Credits expired after 90 days | **-** (negative) |

### 1.4 Credit Purchase Flow

```
User → Paystack (₦120/credit) → Webhook verification → Credits added to balance
```

1. User initiates purchase via Paystack (card, bank transfer, USSD, mobile money)
2. Paystack webhook confirms payment
3. `purchaseCredits()` creates a `CreditTransaction` with:
   - `type: 'purchase'`
   - `amount: credits` (positive)
   - `expiresAt: now + 90 days`
   - `status: 'active'`
   - `remainingAmount: credits` (tracks partial usage)
4. User's `creditsBalance` is updated atomically in a DB transaction

### 1.5 Credit Expiry & Breakage

Credits expire 90 days after purchase. The platform runs a cron job (`processExpiredCredits()`) that:

1. Finds all `purchase` transactions where `expiresAt <= now` and `expiredAt IS NULL`
2. Marks them as `status: 'expired'`
3. Deducts the `remainingAmount` from the user's balance
4. Creates an `expire` transaction for the audit trail

**Breakage revenue** = expired credits × ₦10 face value. This is pure profit — the naira was already collected, and the credits are now removed from circulation without delivering any service.

Target: **12% breakage** (industry standard for closed-loop systems).

### 1.6 Bonus Credit Awards

| Trigger | Bonus | Config Key |
|---|---|---|
| Show-up (check-in) | 5% of deposit | `showupBonusPercent` |
| Review (verified) | 5-10 credits | `reviewBonusMin`/`reviewBonusMax` |
| Referral | 20 credits | `referralBonus` |
| Vendor cancellation | 100% refund + 10% bonus | Hardcoded in `cancelReservation()` |
| Event cancellation | 100% refund + 10% bonus | Hardcoded in `cancelEvent()` |

**Key insight**: Bonus credits are "minted" — they cost the platform ₦0 to create but have ₦100 face value to users. This is an extremely low-cost retention mechanism.

---

## 2. Reservation Credit Flow

### 2.1 Credit Tiers

| Tier | Party Size | Credits Required | Naira Equivalent |
|---|---|---|---|
| Standard | 1-2 guests | 50 | ₦5,000 |
| Group | 3-6 guests | 100 | ₦10,000 |
| Large Party | 7+ guests | 200 | ₦20,000 |

For **experiences**, the vendor sets the credit price (`experience.creditsRequired`).

### 2.2 Reservation Lifecycle

```
Create → Deduct credits → [Check-in | Cancel | No-show]
```

#### On Creation:
- Credits deducted from user balance (`type: 'redeem'`)
- `creditsDeposited` stored on reservation record
- QR code + 4-digit PIN generated

#### On Check-in (Show-up):
- **Full deposit refunded** (`type: 'refund'`)
- **5% bonus awarded** (`type: 'bonus'`)
- Net cost to user: **₦0** (they get deposit + bonus back)
- Net cost to platform: Only the bonus credit value (₦0 to mint)

#### On Cancellation (User):
| Time Before Reservation | Refund | Forfeited |
|---|---|---|
| 24+ hours | 100% | ₦0 |
| 12-24 hours | 50% | 50% |
| <12 hours | 0% | 100% |

Forfeited credits → **pure platform revenue** (vendor gets 0%).

#### On Cancellation (Vendor):
- User receives **100% refund + 10% bonus**
- Platform absorbs the bonus cost (minimal — it's minted credits)

#### On No-show:
- **100% of deposit forfeited** → platform revenue
- Vendor share: **0%** (`noShowVendorSharePercent = 0`)
- This is the core anti-no-show incentive

### 2.3 Credit Flow Diagram

```
                    ┌──────────────┐
                    │  User Buys   │
                    │  Credits     │
                    │  (₦120/cr)   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  User Balance│
                    │  (credits)   │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
     ┌────────▼───┐ ┌─────▼─────┐ ┌───▼────────┐
     │ Reservation │ │  Event    │ │ Experience │
     │  Deposit    │ │  Ticket   │ │  Booking   │
     └────────┬───┘ └─────┬─────┘ └───┬────────┘
              │           │            │
     ┌────────▼───────────▼────────────▼────────┐
     │           OUTCOME                        │
     ├─────────┬──────────┬──────────┬───────────┤
     │ Show-up │ Cancel   │ No-show  │ Expire    │
     │ Refund  │ Partial  │ Forfeit  │ Breakage  │
     │ +5%     │ Refund   │ 100%→Plat│ 100%→Plat│
     └─────────┴──────────┴──────────┴───────────┘
```

---

## 3. Event System

### 3.1 Event Model

Events are vendor-created experiences with ticketed entry. The schema supports:

| Field | Type | Description |
|---|---|---|
| `title` | String | Event name |
| `description` | String? | Details |
| `date` / `endDate` | DateTime | Start/end |
| `location` / `address` / `city` | String | Venue info |
| `capacity` | Int | Max tickets |
| `ticketPrice` | Int | Price in **credits** |
| `images` | String[] | Up to 5 image URLs |
| `category` | Enum | dining, concert, wedding, corporate, festival, other |
| `status` | Enum | draft → published → completed/cancelled |
| `bundleDiscount` | Int | % discount for reservation+event bundle |
| `isFeatured` | Boolean | Promoted event |

### 3.2 Event Ticket Purchase

Current implementation (`purchaseEventTicket()`):

1. Verify event is `published` and has capacity
2. Calculate `totalCredits = ticketPrice × quantity`
3. **Deduct credits** from user balance (`deductCredits()`)
4. Generate QR code for check-in
5. Create `EventTicket` record with `status: 'confirmed'`

**Payment method**: Credits only (deducted from Bucr Wallet).

### 3.3 Event Bundles (Reservation + Event)

The bundle system lets users combine a reservation with an event ticket at a discount:

1. Calculate `discountedCredits = ticketPrice × (1 - bundleDiscount/100)`
2. Calculate `depositCredits = discountedCredits × 15%` (15% deposit)
3. Deduct deposit from user
4. Create `EventBundle` linking reservation + event
5. On check-in: award 5% bonus on deposit

### 3.4 Event Cancellation

When a vendor cancels an event:
- All ticket holders receive **100% refund + 10% bonus**
- All bundle holders receive **100% deposit refund + 10% bonus**
- This mirrors the reservation cancellation policy

---

## 4. Revenue Generation Streams

### 4.1 Primary Revenue Streams

| # | Stream | Mechanism | Est. Monthly Revenue (100 vendors) |
|---|---|---|---|
| 1 | **Credit Purchase Margin** | 17% on every credit purchase | ₦1.7M+ |
| 2 | **Vendor Subscriptions** | Flat monthly fees | ₦7.5M - ₦25M |
| 3 | **No-Show Forfeiture** | 100% of forfeited deposits | ₦500K - ₦2M |
| 4 | **Credit Breakage** | Expired unused credits | ₦300K - ₦1M |
| 5 | **Event Ticket Commission** | Platform cut on event tickets | TBD (see §5) |

### 4.2 Credit Purchase Margin (Detailed)

Every credit purchase generates 17% margin:

| Credits Purchased | User Pays (₦120/cr) | Face Value (₦100/cr) | Platform Margin |
|---|---|---|---|
| 50 | ₦6,000 | ₦5,000 | ₦1,000 (17%) |
| 100 | ₦12,000 | ₦10,000 | ₦2,000 (17%) |
| 200 | ₦24,000 | ₦20,000 | ₦4,000 (17%) |
| 500 | ₦60,000 | ₦50,000 | ₦10,000 (17%) |

With 1,000 active users purchasing an average of 100 credits/month:
- **Monthly volume**: 100,000 credits × ₦120 = ₦12M in purchases
- **Monthly margin**: ₦2M (17%)

### 4.3 Vendor Subscriptions (Detailed)

| Tier | Price | Target Segment | Projected Mix |
|---|---|---|---|
| Basic | ₦75,000/mo | Small restaurants | 60% |
| Pro | ₦145,000/mo | Mid-size, bars, lounges | 30% |
| Premium | ₦250,000/mo | Hotels, clubs, fine dining | 10% |

With 100 vendors (60/30/10 split):
- Basic: 60 × ₦75K = ₦4.5M
- Pro: 30 × ₦145K = ₦4.35M
- Premium: 10 × ₦250K = ₦2.5M
- **Total: ₦11.35M/month**

### 4.4 No-Show Forfeiture

With a 20% no-show rate (industry average, which Bucr aims to reduce):

| Metric | Value |
|---|---|
| Reservations/month (100 vendors) | ~3,000 |
| No-show rate (target after Bucr) | ~8% |
| No-show reservations | 240 |
| Average deposit | 75 credits (₦7,500) |
| **Monthly forfeiture revenue** | **₦1.8M** |

Note: Bucr's credit deposit system is specifically designed to **reduce** no-shows. Even at the reduced 8% rate, the forfeiture revenue is significant because 100% goes to the platform.

### 4.5 Breakage Revenue

| Metric | Value |
|---|---|
| Credits purchased/month | 100,000 |
| Breakage rate (target) | 12% |
| Expired credits/month | 12,000 |
| **Monthly breakage revenue** | **₦1.2M** (pure profit) |

### 4.6 Secondary Revenue Streams

| Stream | Mechanism | Potential |
|---|---|---|
| **Featured listings** | Premium vendors get priority placement | ₦50K-₦200K/mo |
| **Event promotion** | Boosted visibility for events | ₦30K-₦100K/mo |
| **Data insights** | Anonymized dining trend reports | Future |
| **Corporate partnerships** | Bulk credit purchases at discount | Future |
| **Takeout/delivery** | Vendor collects directly (no commission in V1) | Future commission model |

---

## 5. Event Ticket Payment: Recommendation

### 5.1 The Question

Should event tickets be purchased with:
- **Option A**: Bucr credits (current implementation)
- **Option B**: Direct naira payment via Paystack/OPay/PalmPay
- **Option C**: Hybrid (credits OR direct payment)

### 5.2 Analysis

#### Option A: Credits Only (Current)

**Pros:**
- Keeps all money inside the Bucr ecosystem (closed-loop)
- 17% margin on every credit purchase that funds the ticket
- Users who show up get deposit back + bonus → incentivizes attendance
- Consistent with reservation model → unified UX
- Breakage revenue applies to event ticket credits too
- No need for separate payment integration per ticket type
- Platform controls the full credit lifecycle

**Cons:**
- Friction: users must first buy credits, then buy tickets (2-step process)
- Credit balance may be insufficient → user must top up first
- Event tickets can be expensive (500+ credits = ₦60,000+) → large credit purchase required
- Users may perceive credits as "not real money" for large purchases
- Limits payment methods to what Paystack supports (no OPay/PalmPay direct)

#### Option B: Direct Naira Payment

**Pros:**
- Lower friction: one-step purchase
- Users can pay with any method (card, transfer, OPay, PalmPay)
- Feels more "real" for expensive tickets
- No credit balance requirement

**Cons:**
- **Platform loses the 17% margin** on credit purchases
- **No breakage revenue** from event tickets
- **No show-up incentive** — if tickets are paid in naira, there's no deposit-refund mechanism
- **No behavioral lock-in** — users don't accumulate credits
- Payment processing fees (Paystack: 1.5% + ₦100) eat into revenue
- Inconsistent with reservation model (credits for reservations, naira for events = confusing UX)
- Requires building a separate payment flow, refund logic, and reconciliation

#### Option C: Hybrid (Credits OR Direct Payment)

**Pros:**
- Maximum flexibility for users
- Credits for those who have them, direct for those who don't

**Cons:**
- **Most complex implementation** — two parallel payment systems
- **UX confusion** — "Should I use credits or pay directly?"
- **Revenue leakage** — users will choose direct payment to avoid credit markup
- **Split analytics** — harder to track and forecast revenue
- **Refund complexity** — credit refunds vs. naira refunds have different flows

### 5.3 Recommendation: Credits Only (Option A) with Enhancements

**The recommended approach is to keep credits as the sole payment method for event tickets**, with the following enhancements to address the cons:

#### Enhancement 1: "Quick Buy" Flow
When a user tries to buy a ticket but has insufficient credits, automatically calculate the credit shortfall and offer a one-click top-up:

```
Ticket: 200 credits (₦24,000)
Your balance: 80 credits
Shortfall: 120 credits (₦14,400)
[Buy 120 credits + Ticket → ₦14,400 via Paystack]
```

This collapses the 2-step process into 1 step, removing friction.

#### Enhancement 2: Event-Specific Credit Packs
Offer pre-priced credit packs aligned with common ticket prices:

| Pack | Credits | Price | Use Case |
|---|---|---|---|
| Event Starter | 100 | ₦12,000 | Standard events |
| Event Plus | 250 | ₦30,000 | Premium events |
| Event VIP | 500 | ₦60,000 | High-end experiences |

#### Enhancement 3: Add Paystack Payment Channels
Paystack already supports card, bank transfer, USSD, and mobile money. Add OPay and PalmPay as Paystack payment channels (they integrate via Paystack's bank transfer/POS APIs). This gives users the payment method flexibility without leaving the credit system.

### 5.4 Why Credits Win for the Platform

| Metric | Credits Only | Direct Payment | Difference |
|---|---|---|---|
| Margin per ticket | 17% | -1.5% (Paystack fee) | **+18.5%** |
| Breakage revenue | Yes (~12%) | No | **+12%** |
| Show-up incentive | Yes (refund + bonus) | No | **Higher attendance** |
| Behavioral lock-in | Yes | No | **Higher retention** |
| Ecosystem stickiness | High | Low | **Lower churn** |
| Implementation complexity | Low (already built) | High (new flow) | **Faster time-to-market** |

**Bottom line**: Credits generate **~30% more revenue per ticket** than direct payment (17% margin + 12% breakage vs. -1.5% Paystack fees), while also driving higher attendance and user retention.

### 5.5 When to Consider Direct Payment

In V2, consider adding direct naira payment **only** for:
- **Corporate bookings** (bulk tickets, invoiced payments)
- **International users** (who can't easily buy credits via Paystack)
- **Very high-value tickets** (₦100K+) where credit friction is too high

These should be the exception, not the default.

---

## 6. Financial Projections

### 6.1 Monthly Revenue (100 Vendors, 1,000 Users)

| Stream | Low Estimate | High Estimate |
|---|---|---|
| Vendor Subscriptions | ₦7.5M | ₦11.35M |
| Credit Margin | ₦1.5M | ₦3M |
| No-Show Forfeiture | ₦1M | ₦2M |
| Credit Breakage | ₦500K | ₦1.2M |
| Event Commission (if added) | ₦200K | ₦800K |
| Featured/Promotions | ₦100K | ₦300K |
| **Total** | **₦10.8M** | **₦18.65M** |

### 6.2 Revenue per Vendor per Month

| Stream | Per Vendor |
|---|---|
| Subscription (avg) | ₦113,500 |
| Credit margin share | ₦15,000 - ₦30,000 |
| **Total ARPV** | **₦128,500 - ₦143,500** |

### 6.3 Unit Economics per User per Month

| Metric | Value |
|---|---|
| Average credit purchase | 100 credits (₦12,000) |
| Platform margin | ₦2,000 (17%) |
| Expected breakage | ₦1,440 (12% of ₦12,000) |
| No-show forfeiture share | ₦600 (8% × 75cr avg) |
| **Revenue per user/month** | **₦4,040** |

### 6.4 Key Ratios to Track

| Ratio | Target | Why |
|---|---|---|
| Credit purchase margin | 17% | Core revenue driver |
| Breakage rate | 10-15% | Too low = credits too useful; too high = user complaints |
| No-show rate | <8% | Below industry 20% = product working |
| Show-up rate | >90% | High = credit incentive working |
| Credit velocity | 2-3x/month | Credits should cycle, not sit idle |
| Vendor churn | <5%/month | Subscription revenue stability |
| User credit balance | 50-150 avg | Enough to book, not so much they forget about it |

---

## Appendix: Implementation References

| Component | File Path |
|---|---|
| Credit config | `src/lib/config.ts` |
| Credit service | `src/services/credit.service.ts` |
| Reservation service | `src/services/reservation.service.ts` |
| Event service | `src/services/event.service.ts` |
| Credit helpers | `src/lib/utils/helpers.ts` |
| Prisma schema | `prisma/schema.prisma` |
| Upload route (event images) | `src/app/api/upload/route.ts` |
| Event API routes | `src/app/api/events/route.ts`, `src/app/api/events/[id]/route.ts` |
| Vendor events API | `src/app/api/vendor/events/route.ts` |
| Payment integration | Paystack via `src/app/api/payments/` |

---

*Last updated: April 2026*
