# Bucr Frontend Specification - Part 3: User Web Application

> **Version:** 1.0.0 | **Last Updated:** January 2026

---

## 1. Sitemap & Routes

```
/                           → Landing/Home
├── /discover               → Browse restaurants
│   └── /discover?q=...     → Search results with filters
├── /venue/[slug]           → Venue detail
│   ├── /venue/[slug]/menu      → Menu tab
│   ├── /venue/[slug]/reviews   → Reviews tab
│   └── /venue/[slug]/book      → Booking flow
├── /booking
│   ├── /booking/[id]           → Booking confirmation/details
│   ├── /booking/[id]/modify    → Modify booking
│   └── /booking/[id]/cancel    → Cancel booking
├── /wallet                 → Credits dashboard
│   ├── /wallet/buy             → Purchase credits
│   └── /wallet/history         → Transaction history
├── /orders                 → Takeout orders
│   └── /orders/[id]            → Order details
├── /favorites              → Saved venues
├── /profile                → User profile
│   ├── /profile/edit           → Edit profile
│   └── /profile/settings       → Preferences
├── /auth
│   ├── /auth/login             → Login
│   ├── /auth/register          → Register
│   ├── /auth/forgot-password   → Forgot password
│   └── /auth/reset-password    → Reset password
└── /help
    ├── /help/faq               → FAQ
    └── /help/contact           → Contact support
```

---

## 2. Page Layouts

### 2.1 Landing Page

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER                                                          │
│ [Logo]     Discover | How it Works | For Business    [Login]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    HERO SECTION                                 │
│                                                                 │
│        Never Lose Your Reservation Deposit Again                │
│        Book restaurants with confidence. Show up,               │
│        get your money back + bonus credits.                     │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ 🔍 Search restaurants, cuisines, locations...           │   │
│   │ 📍 Lagos, Nigeria  ▼                    [Search]        │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   Popular: Italian • Chinese • Nigerian • Fine Dining           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    HOW IT WORKS                                 │
│                                                                 │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐        │
│   │   🔍    │   │   💳    │   │   📱    │   │   🎉    │        │
│   │ Browse  │ → │ Reserve │ → │ Show Up │ → │ Enjoy!  │        │
│   │& Search │   │& Deposit│   │& Scan QR│   │+5% bonus│        │
│   └─────────┘   └─────────┘   └─────────┘   └─────────┘        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│              FEATURED RESTAURANTS                               │
│                                                                 │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│   │ [Image] │  │ [Image] │  │ [Image] │  │ [Image] │           │
│   │ ★ 4.8   │  │ ★ 4.7   │  │ ★ 4.9   │  │ ★ 4.6   │           │
│   │ Name    │  │ Name    │  │ Name    │  │ Name    │           │
│   │ Cuisine │  │ Cuisine │  │ Cuisine │  │ Cuisine │           │
│   └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│                                                                 │
│                  [View All Restaurants →]                       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│              WHY BUCR?                                          │
│                                                                 │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│   │ 💰 No Lost      │  │ ⭐ Earn Rewards │  │ 🛡️ Guaranteed   ││
│   │    Deposits     │  │    Every Visit  │  │    Tables       ││
│   │ Get your money  │  │ 5% bonus when   │  │ Restaurants     ││
│   │ back when you   │  │ you show up     │  │ commit to you   ││
│   │ show up         │  │ plus reviews    │  │ too             ││
│   └─────────────────┘  └─────────────────┘  └─────────────────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ FOOTER                                                          │
│ [Logo]  About | Help | Privacy | Terms | For Business           │
│         © 2026 Bucr. All rights reserved.                       │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Discover/Search Page

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER (sticky)                                                 │
├─────────────────────────────────────────────────────────────────┤
│ SEARCH BAR                                                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🔍 Italian restaurants near me...                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ FILTER CHIPS (horizontal scroll on mobile)                      │
│ [📍 Near me] [🍝 Italian] [⭐ 4.5+] [💰 $$] [🎯 Filters ▼]      │
│                                                                 │
├──────────────────┬──────────────────────────────────────────────┤
│  SIDEBAR FILTERS │  RESULTS GRID                                │
│  (desktop only)  │                                              │
│                  │  Showing 24 restaurants                      │
│  Cuisine         │  Sort: [Recommended ▼]                       │
│  ☐ Italian       │                                              │
│  ☐ Chinese       │  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  ☐ Nigerian      │  │ ♡ [Img] │  │ ♡ [Img] │  │ ♡ [Img] │      │
│  ☐ Japanese      │  │ ★ 4.8   │  │ ★ 4.7   │  │ ★ 4.9   │      │
│  ☐ Indian        │  │ La Mensa│  │ Dynasty │  │ Azura   │      │
│  [Show more]     │  │ Italian │  │ Chinese │  │ African │      │
│                  │  │ ₦₦₦ •VI │  │ ₦₦ •Ikj │  │ ₦₦₦₦•Lki│      │
│  Price Range     │  └─────────┘  └─────────┘  └─────────┘      │
│  ○ ₦             │                                              │
│  ○ ₦₦            │  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  ○ ₦₦₦           │  │ ♡ [Img] │  │ ♡ [Img] │  │ ♡ [Img] │      │
│  ○ ₦₦₦₦          │  │ ★ 4.5   │  │ ★ 4.6   │  │ ★ 4.8   │      │
│                  │  │ Craft   │  │ Izanagi │  │ Nok     │      │
│  Rating          │  │ Steaks  │  │ Japanese│  │ Nigerian│      │
│  ★★★★★ 4.5+      │  │ ₦₦₦ •VI │  │ ₦₦₦ •VI │  │ ₦₦ •Lki │      │
│  ★★★★☆ 4.0+      │  └─────────┘  └─────────┘  └─────────┘      │
│  ★★★☆☆ 3.5+      │                                              │
│                  │                                              │
│  Features        │          [Load More Results]                 │
│  ☐ Outdoor       │                                              │
│  ☐ Private Room  │                                              │
│  ☐ Parking       │                                              │
│  ☐ Live Music    │                                              │
│                  │                                              │
│  [Clear All]     │                                              │
└──────────────────┴──────────────────────────────────────────────┘
```

### 2.3 Venue Detail Page

```
┌─────────────────────────────────────────────────────────────────┐
│ GALLERY HERO (carousel with thumbnails)                         │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │                      [Main Image]                           │ │
│ │                                                             │ │
│ │  ← ●●●○○○○○ →                           [View All Photos]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────┐  ┌────────────────────────┐  │
│  │  VENUE INFO                  │  │  BOOKING CARD (sticky) │  │
│  │                              │  │                        │  │
│  │  La Taverna Italiana         │  │  Reserve a Table       │  │
│  │  ★ 4.8 (324 reviews)         │  │                        │  │
│  │  Italian • ₦₦₦               │  │  📅 Date               │  │
│  │  ✓ Verified  ⭐ Trusted       │  │  [Today, Jan 23 ▼]     │  │
│  │                              │  │                        │  │
│  │  📍 12 Awolowo Rd, Ikoyi     │  │  🕐 Time               │  │
│  │  📞 +234 801 234 5678        │  │  [7:00 PM ▼]           │  │
│  │  🕐 Mon-Sun: 12pm - 11pm     │  │                        │  │
│  │                              │  │  👥 Party Size         │  │
│  │  ♡ Save   📤 Share           │  │  [2 guests ▼]          │  │
│  │                              │  │                        │  │
│  │  ────────────────────────    │  │  ─────────────────     │  │
│  │                              │  │  Deposit: 50 credits   │  │
│  │  [Overview] [Menu] [Reviews] │  │  (₦5,000 value)        │  │
│  │                              │  │                        │  │
│  │  About                       │  │  ✓ Refunded on arrival │  │
│  │  Authentic Italian dining    │  │    + 5% bonus          │  │
│  │  in the heart of Ikoyi...    │  │                        │  │
│  │                              │  │  [Reserve Now]         │  │
│  │  Highlights                  │  │                        │  │
│  │  🍷 Full bar  🌿 Vegan       │  │  Balance: 150 credits  │  │
│  │  🅿️ Parking  🎵 Live music   │  │                        │  │
│  │                              │  │  [Buy More Credits]    │  │
│  └──────────────────────────────┘  └────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Booking Confirmation Page

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                  ✓ Booking Confirmed!                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │                      [QR CODE]                              ││
│  │                       200x200                               ││
│  │                                                             ││
│  │                Reference: BKR-ABC123                        ││
│  │                    PIN: 4829                                ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  La Taverna Italiana                                       ││
│  │  📅 Friday, January 24, 2026                               ││
│  │  🕐 7:00 PM                                                ││
│  │  👥 2 guests                                               ││
│  │  📍 12 Awolowo Road, Ikoyi, Lagos                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  💳 50 credits deposited                                   ││
│  │  ✓ Will be refunded + 5% bonus when you check in          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [Add to Calendar]  [Get Directions]  [Share Booking]           │
│                                                                 │
│  ────────────────────────────────────────────────────────────   │
│                                                                 │
│  Cancellation Policy                                            │
│  • 24+ hours before: Full refund                                │
│  • 12-24 hours: 50% refund                                      │
│  • Less than 12 hours: No refund                                │
│                                                                 │
│               [Modify Reservation]  [Cancel]                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 User Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER with user menu                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Hello, Chidera! 👋                                             │
│                                                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │  💳 Credits    │  │  📅 Upcoming   │  │  ⭐ Reviews    │    │
│  │                │  │                │  │                │    │
│  │     150        │  │       2        │  │      8         │    │
│  │   ₦15,000      │  │  reservations  │  │   written      │    │
│  │                │  │                │  │                │    │
│  │  [Buy More]    │  │  [View All]    │  │  [View All]    │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Upcoming Reservations                                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  [img] La Taverna Italiana                                 ││
│  │        📅 Tomorrow, Jan 24 • 7:00 PM • 2 guests            ││
│  │        Reference: BKR-ABC123                               ││
│  │        [View QR]  [Directions]  [Modify]                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  [img] Dynasty Chinese                                     ││
│  │        📅 Sat, Jan 25 • 8:30 PM • 4 guests                 ││
│  │        Reference: BKR-DEF456                               ││
│  │        [View QR]  [Directions]  [Modify]                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Your Favorites                                                 │
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ [Image] │  │ [Image] │  │ [Image] │  │  + Add  │            │
│  │ Azura   │  │ Nok     │  │ Craft   │  │   More  │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.6 Wallet/Credits Page

```
┌─────────────────────────────────────────────────────────────────┐
│  My Wallet                                                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │       💳 Credit Balance                                    ││
│  │                                                             ││
│  │              150 credits                                   ││
│  │              ₦15,000 value                                 ││
│  │                                                             ││
│  │  ⚠️ 30 credits expire in 25 days                           ││
│  │                                                             ││
│  │              [Buy More Credits]                            ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Buy Credits                                               ││
│  │                                                             ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       ││
│  │  │   50    │  │   100   │  │   200   │  │  Custom │       ││
│  │  │ credits │  │ credits │  │ credits │  │ amount  │       ││
│  │  │ ₦6,000  │  │ ₦12,000 │  │ ₦24,000 │  │   ...   │       ││
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘       ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Transaction History                                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  + Credit Purchase            +100 credits      Jan 20    ││
│  │  - Reservation Deposit         -50 credits      Jan 20    ││
│  │  + Check-in Refund + Bonus     +52 credits      Jan 19    ││
│  │  + Referral Bonus              +20 credits      Jan 18    ││
│  │  - Reservation Deposit         -50 credits      Jan 15    ││
│  │                                                             ││
│  │  [Load More]                                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. User Flows

### 3.1 Registration Flow

```
[Landing] → [Register Page]
               │
               ▼
         ┌──────────────┐
         │ Enter Details│
         │ • Full name  │
         │ • Email      │
         │ • Phone      │
         │ • Password   │
         │ • Referral?  │
         └──────────────┘
               │
               ▼
         ┌──────────────┐
         │ Verify Phone │
         │ (OTP SMS)    │
         └──────────────┘
               │
               ▼
         ┌──────────────┐
         │ Verify Email │
         │ (OTP Email)  │
         └──────────────┘
               │
               ▼
         [Dashboard] → Browse & Book
```

### 3.2 Booking Flow

```
[Discover] → [Venue Page] → [Select Date/Time/Guests]
                                    │
                                    ▼
                            ┌──────────────┐
                            │ Review       │
                            │ Booking      │
                            │ Details      │
                            └──────────────┘
                                    │
                                    ▼
                         ┌────────────────────┐
                         │ Confirm & Deposit  │
                         │ (50-200 credits)   │
                         └────────────────────┘
                                    │
                                    ▼
                         ┌────────────────────┐
                         │ Confirmation Page  │
                         │ • QR Code          │
                         │ • PIN              │
                         │ • Details          │
                         └────────────────────┘
                                    │
                      ┌─────────────┼─────────────┐
                      ▼             ▼             ▼
               [Add to Cal]  [Get Directions] [Share]
```

### 3.3 Check-in Flow

```
[Reservation] → [Show QR at Venue]
                        │
                        ▼
              ┌────────────────────┐
              │ Vendor Scans QR    │
              │ or Enters PIN      │
              └────────────────────┘
                        │
                        ▼
              ┌────────────────────┐
              │ Check-in Confirmed │
              │ Credits Refunded   │
              │ + 5% Bonus         │
              └────────────────────┘
                        │
                        ▼
              [Push Notification]
              "You're checked in! 52 credits returned"
```

### 3.4 Credit Purchase Flow

```
[Wallet] → [Select Amount] → [Paystack Checkout]
                                    │
                                    ▼
                           ┌──────────────┐
                           │ Card Details │
                           │ • Number     │
                           │ • Expiry     │
                           │ • CVV        │
                           └──────────────┘
                                    │
                                    ▼
                           ┌──────────────┐
                           │ OTP/3DS      │
                           │ Verification │
                           └──────────────┘
                                    │
                                    ▼
                           ┌──────────────┐
                           │ Success!     │
                           │ Credits      │
                           │ Added        │
                           └──────────────┘
                                    │
                                    ▼
                           [Updated Balance]
```

---

## 4. Component Specifications

### 4.1 Venue Card

```
┌─────────────────────────────────────┐
│  ┌───────────────────────────────┐  │
│  │        [Image 300x200]        │  │
│  │                            ♡  │  │  ← Favorite toggle (top-right)
│  └───────────────────────────────┘  │
│  La Taverna Italiana                │  ← H5, font-semibold
│  ★ 4.8 (324) • Italian             │  ← Body SM, text-gray-600
│  ₦₦₦ • Victoria Island              │  ← Body SM, text-gray-500
│  ✓ Verified                         │  ← Caption, text-primary
└─────────────────────────────────────┘

Props:
- venue: Venue object
- onFavorite: () => void
- isFavorite: boolean
- variant: 'default' | 'compact' | 'horizontal'
```

### 4.2 Booking Card (Sticky Sidebar)

```
┌─────────────────────────────────────┐
│  Reserve a Table                    │  ← H5
│                                     │
│  📅 Date                            │  ← Label
│  ┌─────────────────────────────┐    │
│  │ Today, Jan 23            ▼  │    │  ← Date picker trigger
│  └─────────────────────────────┘    │
│                                     │
│  🕐 Time                            │
│  ┌─────────────────────────────┐    │
│  │ 7:00 PM                  ▼  │    │  ← Time select
│  └─────────────────────────────┘    │
│                                     │
│  👥 Party Size                      │
│  ┌─────────────────────────────┐    │
│  │ 2 guests                 ▼  │    │  ← Guest select
│  └─────────────────────────────┘    │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Deposit: 50 credits                │  ← Font-semibold
│  (₦5,000 value)                     │  ← text-gray-500
│                                     │
│  ✓ Refunded on arrival + 5% bonus   │  ← text-success, text-sm
│                                     │
│  ┌─────────────────────────────┐    │
│  │      Reserve Now            │    │  ← Primary button, full width
│  └─────────────────────────────┘    │
│                                     │
│  Your balance: 150 credits          │  ← text-sm, text-gray-600
│                                     │
│  [Buy More Credits]                 │  ← Link, text-primary
└─────────────────────────────────────┘
```

### 4.3 Reservation Card

```
┌─────────────────────────────────────────────────────────┐
│  ┌─────┐  La Taverna Italiana                          │
│  │[img]│  📅 Tomorrow, Jan 24 • 7:00 PM • 2 guests     │
│  │60x60│  Reference: BKR-ABC123                        │
│  └─────┘                                               │
│          [View QR]  [Directions]  [Modify]             │
└─────────────────────────────────────────────────────────┘

States:
- upcoming: Default state
- today: Highlighted with accent border
- checked_in: Success state with checkmark
- cancelled: Grayed out with strike-through
- no_show: Error state
```

### 4.4 Credit Transaction Item

```
┌─────────────────────────────────────────────────────────┐
│  [+] Credit Purchase            +100 credits    Jan 20 │
│      via Paystack                                      │
└─────────────────────────────────────────────────────────┘

Types with icons:
- PURCHASE: + (green), CreditCard icon
- DEPOSIT: - (amber), Calendar icon  
- REFUND: + (green), CheckCircle icon
- BONUS: + (blue), Gift icon
- REFERRAL: + (blue), Users icon
- CANCELLATION: + (green), XCircle icon
- NO_SHOW: - (red), AlertTriangle icon
- EXPIRY: - (gray), Clock icon
```

---

## 5. Responsive Behavior

### 5.1 Breakpoint Strategy

| Breakpoint | Layout Changes |
|------------|----------------|
| < 640px (mobile) | Single column, bottom nav, full-width cards |
| 640-768px (tablet portrait) | 2-column grid, collapsible sidebar |
| 768-1024px (tablet landscape) | 2-3 column grid, visible sidebar |
| 1024-1280px (desktop) | 3-4 column grid, sticky sidebar |
| > 1280px (large) | Max-width container, 4 column grid |

### 5.2 Navigation

**Desktop:**
- Horizontal header navigation
- User dropdown menu

**Mobile:**
- Hamburger menu (top)
- Bottom tab bar: Home, Search, Bookings, Wallet, Profile

### 5.3 Venue Detail (Mobile)

- Gallery becomes full-width carousel
- Booking card moves to bottom sheet (sticky)
- Tabs become horizontal scrollable chips
- "Reserve" becomes floating action button
