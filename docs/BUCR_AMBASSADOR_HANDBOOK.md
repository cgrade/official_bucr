# BUCR Ambassador Handbook

**Your complete guide to BUCR — feature by feature.**
If you represent BUCR, this is your single source of truth. Read it end to end; you should
be able to explain any feature and answer almost any question after it. Plain language, real
numbers, concrete examples.

> Tagline: **"Your table, actually waiting."**
> Domain: **bucr.ng** · Founder: **Mr. Grade** (Chef · Founder & CEO) · Launch city: **Abuja**

---

## Part 1 — The Story (why BUCR exists)

### The problem
Nigerian restaurants lose a huge amount of money to **no-shows** — guests who book a table
and never turn up. In Lagos in 2023, one well-known group reported roughly **50% no-shows**.
The restaurant preps food and holds the table; the guest doesn't come; the table sits empty
while walk-ins are turned away. It got bad enough that in December 2025 the Lagos State
Governor publicly intervened with ~250 operators.

### The solution
BUCR makes a reservation **mean something** by attaching a small, **refundable deposit** to
it. You put a deposit down to confirm a table. **Show up and you get it all back — plus a
small bonus.** **No-show and you lose part of it.** Suddenly a booking is a commitment, not a
maybe. Restaurants get reliable bookings; guests get a table that's actually waiting.

### The one-sentence pitch
> "BUCR is a reservation platform where a small refundable deposit guarantees the table —
> guests who show up get it back plus a bonus, and no-shows are penalised, so restaurants
> stop losing money to empty tables."

### Why Abuja first (not Lagos)
- Abuja diners have ~2.37× the *welfare-adjusted* spending power of Lagos.
- A dense, predictable, high-income crowd (diplomats, government, NGOs, expats) who book
  ahead and value reliability.
- Lighter traffic + better infrastructure → people actually arrive on time.
- No dominant local competitor (Reisty is Lagos-focused).
- Restaurant clusters are tight (Maitama, Wuse II, Asokoro, Garki, Gwarinpa) → easy to sign.

---

## Part 2 — How the money works (the credit economy)

This is the heart of BUCR. Learn it cold.

### The credit
- **1 credit = ₦10.** Always. (Think of credits like arcade tokens for dining.)
- You **buy** credits with a small service fee (**6%**), so **₦10.60 buys 1 credit**.
  Example: ₦10,600 → 1,000 credits.
- Credits are valid for **90 days** from purchase (a reminder goes out 30 days before expiry).
- Credits are **"platform access credits," not a wallet or money** — they can't be withdrawn
  to cash, earn no interest, and don't transfer out. This is deliberate and legal (see Part 7).

### The deposit (to confirm a booking)
- The deposit is a **flat amount per reservation** — the **same whether you book for 1 or 6**.
- It's set by the restaurant's type (a vendor can override it):

  | Venue type | Deposit | In Naira |
  |---|---|---|
  | Fine dining | 2,000 credits | ₦20,000 |
  | Upscale casual | 1,500 credits | ₦15,000 |
  | Lounge | 1,000 credits | ₦10,000 |
  | Casual | 1,000 credits | ₦10,000 |

- **Important:** the deposit is **fully refundable** — it's a guarantee, not a charge. You
  still pay for your meal at the restaurant as normal.

### What happens when…
- **✅ You show up (check in):** you get **100% of the deposit back + a 3% bonus** as usable
  credits. Example: ₦15,000 deposit → ₦15,000 back + ₦450 bonus.
- **❌ You no-show:** you **keep 60%**, and **40% is forfeited**. Of that 40%: **30% goes to
  the restaurant** (as non-cashable marketing credits, their compensation) and **10% goes to
  BUCR**. Example on a ₦10,000 deposit: keep ₦6,000, restaurant gets ₦3,000, BUCR gets ₦1,000.
- **🕑 You cancel in time:** 
  - **24+ hours before:** 100% refund.
  - **12–24 hours before:** 50% refund.
  - **Under 12 hours:** no refund.
- **🏚️ The restaurant cancels on you:** you get **100% back + a 10% bonus** — and that bonus
  is **paid by the restaurant** out of their own credits (so they have skin in the game too).

### Other ways credits move
- **Show-up bonus:** +3% of the deposit every time you check in.
- **Reviews:** leave a review after you've dined and earn **+5 credits** (you can only review a
  place you actually checked into — keeps reviews honest).
- **Gifting:** send credits to a friend by email/phone. Fee is **8%** of the gift. If they're
  already a user it lands instantly; if not, they have 30 days to claim (else the sender is
  fully refunded, fee included).
- **Referrals:** invite a friend with your code — you both get bonus credits when they join.

---

## Part 3 — The Diner experience (web + mobile), feature by feature

BUCR for guests is a **mobile app** (iOS/Android via Expo) and a **web app** — they mirror
each other.

1. **Discover restaurants.** Browse by category and cuisine, search by name or cuisine, sort,
   filter (incl. by price level), and view them on a **map** (Mapbox). Featured venues appear
   in a carousel.
2. **Venue page.** Photos, overview, full **menu**, **popular dishes** (ranked by how often
   they're pre-ordered — not just a dump of every item), **reviews**, opening hours,
   directions, and the **"Book with Confidence"** badge on reliable venues.
3. **Experiences & Special offers.** Some venues offer curated **experiences** (e.g. a chef's
   table, with their own deposit/capacity) and **special offers** (discounts) — bookable
   right from the venue page.
4. **Book a table.** Pick date, time, and party size. If the venue has more than one branch
   you choose the **location**. You can **pre-order dishes** so the kitchen preps ahead (you
   still pay at the venue). The panel shows the **refundable deposit** and **your balance**,
   and warns you (with a top-up link) if you're short.
5. **Booking guardrails (why a booking might be blocked):**
   - You need a **verified email or phone** before your first booking (anti-fraud / so we can
     reach you). A 6-digit code is emailed at sign-up.
   - You need enough credits for the deposit.
   - The venue must be **open** at the chosen day/time.
6. **Check in.** At the venue you check in via **QR code or a 4-digit PIN** (vendor scans /
   enters it). That triggers your refund + 3% bonus.
7. **Wallet.** See your balance + Naira value, buy credits, **gift** credits, see credits
   **expiring** soon, and a full **transaction history** with clear descriptions.
8. **Waitlist.** If a slot is full, join a no-deposit **"notify me"** waitlist; you get a
   push/SMS/email when a table opens and a short window to claim it.
9. **My bookings.** Upcoming + past reservations, QR/PIN, cancel (with the refund tiers above),
   and leave a review after dining.
10. **Notifications.** Confirmations, reminders, check-in bonus, credit-expiry, gift alerts —
    in-app + push + email.

---

## Part 4 — The Vendor (restaurant) experience, feature by feature

Restaurants get a **web dashboard** (the Vendor Portal).

1. **Onboarding & KYC.** Register the restaurant, upload documents (CAC, etc.) for
   verification. Admin reviews and approves. (Verification is why diners can trust the venue.)
2. **Dashboard.** Today's reservations, key stats, reliability score, quick QR check-in, and
   **"Your BUCR impact"** — show-up rate, **deposit value protected**, no-show compensation
   earned, and covers seated (the ROI of being on BUCR).
3. **Reservations & check-in.** See bookings, check guests in by **QR or PIN**, mark no-shows,
   cancel (paying the 10% guest compensation from their credit wallet), and see any
   **pre-ordered dishes** so the kitchen preps ahead.
4. **Waitlist.** A live queue — **notify** the next party when a table frees (starts a 15-min
   hold + alerts the guest), **seat** them, or remove them.
5. **Menu.** Full menu management with categories (incl. starches, rice, pasta, desserts),
   per-item availability, and a temporary **"86 for service"** toggle that auto-resets.
6. **Reviews.** Read guest reviews, **respond**, and **report** an unfair one to BUCR support.
7. **Billing (per-cover fee).** BUCR charges a small **success fee per seated guest**, invoiced
   **every two weeks**. Vendors pay each invoice via Paystack from the **Billing** page (money
   flows to BUCR — closed loop). 1-week grace, reminders every 48h.
8. **Message Center.** One inbox for everything: new-reservation alerts, cancellations,
   invoices + reminders, and **broadcasts from the BUCR team** — important items are also
   emailed. Unread badge in the sidebar.
9. **Locations & branches.** Add/edit/delete branches (each with its own address, map pin, and
   opening hours). Diners pick the branch when booking.
10. **Subscriptions.** Choose a plan (see Part 5); upgrade anytime, or **schedule a downgrade**
    that takes effect at the end of the paid period.
11. **Team (staff logins).** Owners invite staff with **granular, scoped permissions**
    (e.g. allow check-in but not cancellations). Seats: **Pro = 1, Elite = 3**.
12. **Marketing / featured spots.** Pay (with Naira or marketing credits) for featured
    carousel slots, top-of-search, promoted experiences. (Highest value once many venues are on.)
13. **Experiences, special offers, events, achievements, gallery, display settings, gift &
    waitlist** — all managed in the portal.

---

## Part 5 — How BUCR makes money (so you can explain the business)

BUCR has **four no-license revenue lines**, rolled out in stages. The golden rule:
**money only ever flows TO BUCR, never out to a third party as settlement** — that's what
keeps BUCR outside heavy CBN payment licensing at launch.

1. **Per-cover success fee (Stage 1, at launch).** A **flat fee per seated guest** — Basic
   tier **₦1,500/head**, multiplied by party size (a table of 4 = 4×). Reduced by plan
   (Pro = 50% = ₦750, Elite = ₦0). **Never a % of the bill** (a % would look like payment
   processing and trigger licensing). It's pay-per-result — vendors only pay when guests
   actually show up.
2. **Vendor subscriptions (Stage 2).** **Basic = free** (to get lots of restaurants on),
   **Pro = ₦30,000/mo**, **Elite = ₦85,000/mo** (lower per-cover fees + more features/seats).
3. **Marketing / featured placement (Stage 3).** Restaurants pay for visibility. Most valuable
   once there are many venues competing for attention.
4. **BUCR+ guest membership (Stage 4, future).** A monthly membership (~₦3,500/mo) with a
   credit bundle + perks. Deliberately **not** relied on for break-even.

**Plus, behind the scenes:** the **6% credit purchase spread** (margin on every credit sold —
the biggest line at scale), **breakage** (unused credits at expiry), the **8% gift fee**, and
the **10% no-show platform share**.

---

## Part 6 — Who else is out there (positioning)

- **Reisty** — Lagos-only, consumer discovery/booking. BUCR is Abuja-first and deposit-backed.
- **Dinesurf** — pivoted to B2B vendor SaaS ("Guest Growth OS").
- **The BUCR difference:** neither competitor charges a published per-cover fee, and neither
  is built around a **refundable deposit that actually fixes no-shows**. That deposit engine is
  BUCR's wedge.

---

## Part 7 — Trust, legal & safety (answer this confidently)

- **Credits are not a bank wallet.** They're prepaid platform access credits — non-refundable
  to cash, non-withdrawable, expire in 90 days, earn no interest. This is disclosed, and it's
  what keeps BUCR a **closed loop**.
- **Restaurants can never withdraw credits to cash.** Their credits are spent only on BUCR
  marketing inventory. (This is the single most important legal guardrail — enforced in code.)
- **BUCR never settles guest money to restaurants.** Restaurants are paid for meals directly by
  guests at the venue, outside BUCR. BUCR only ever *receives* money (credit purchases,
  subscriptions, per-cover fees).
- **Deposits are held safely** in a segregated operating account, not mixed with running costs.
- A **Nigerian fintech lawyer reviews** this structure before launch. Until then, treat the
  exact figures as provisional.

---

## Part 8 — Frequently asked questions

**Is the deposit a charge? Do I lose my money?**
No. It's fully refundable — you get 100% back (plus 3%) when you show up. You only lose part of
it if you no-show or cancel late.

**So I pay twice — deposit and the meal?**
No. The deposit is returned. You pay for your meal at the restaurant as usual; the deposit just
guarantees the table.

**Can I get my credits as cash?**
No — credits are for booking on BUCR, not a cash wallet. They're valid for 90 days.

**What if the restaurant cancels on me?**
You get 100% back **plus a 10% bonus**, paid by the restaurant.

**What if I'm running late / there's traffic?**
Check in when you arrive; as long as you're seated you get your full refund + bonus. If you
genuinely can't make it, cancel early (24h+ = full refund).

**Why do I need to verify my email/phone?**
To keep bookings real and so the restaurant can reach you. It's a one-time 6-digit code.

**How does the restaurant make money from this?**
Fewer empty tables (more realized covers), no-show compensation when guests don't show, and
better planning. They pay BUCR a small flat fee only for guests who actually show up.

**Is my card/payment safe?**
Payments are processed by **Paystack** (the same infrastructure many Nigerian businesses use).
BUCR doesn't store card details.

**What's the catch on buying credits?**
A 6% service fee (₦10.60 per ₦10 credit). That's how BUCR sustains the platform.

**Does a bigger party cost a bigger deposit?**
No — the deposit is flat per reservation, whether you book for 1 or 6.

**What if I forget to use my credits?**
They're valid 90 days; you get a reminder 30 days before they expire.

**Can I gift credits?**
Yes — by email or phone, with an 8% fee. Unclaimed gifts (after 30 days) are fully refunded to
you, fee included.

---

## Part 9 — Ambassador do's & don'ts

**Do:**
- Lead with the **no-show pain** and the **"deposit you get back + bonus"** hook.
- Use real numbers (₦15,000 deposit → ₦15,000 + ₦450 back on show-up).
- Be precise that credits are **refundable to your balance**, not a charge.
- Say "Abuja first, proving it before expanding" — it's a strength, not a limitation.

**Don't:**
- Don't call credits a "wallet," "savings," or "money you can withdraw." They're platform
  credits (90-day, non-cashable).
- Don't promise cash refunds or interest.
- Don't quote the per-cover fee or deposits as "final" to vendors — they're being validated;
  say "indicative."
- Don't claim BUCR holds a banking/payment license — it's a deliberately **closed-loop**
  model that doesn't need one at launch.

---

## Part 10 — Glossary (say these correctly)

- **Credit** — BUCR's unit; 1 credit = ₦10.
- **Deposit** — refundable credits that confirm a booking (flat per reservation).
- **Check-in** — proving you showed up (QR/PIN); triggers the refund + 3% bonus.
- **No-show** — booked but didn't come; you keep 60%, lose 40% (30% to venue, 10% to BUCR).
- **Per-cover fee** — BUCR's flat fee per *seated* guest, billed to the restaurant.
- **Closed loop** — money only flows into BUCR, never settled out — the legal foundation.
- **Book with Confidence** — a badge on restaurants with a proven reliability record.
- **Spread** — the 6% fee when buying credits.
- **Breakage** — unused credits that expire (becomes BUCR revenue).

---

*Know Parts 2, 5, and 7 cold — the credit math, how BUCR earns, and the legal/trust story are
the questions you'll get most. Everything else you can look up here. Represent BUCR with
confidence: a real Nigerian problem, a clever refundable-deposit fix, and a clean business model.*
