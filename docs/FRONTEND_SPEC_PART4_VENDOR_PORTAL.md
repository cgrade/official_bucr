# Bucr Frontend Specification - Part 4: Vendor Portal

> **Version:** 1.0.0 | **Last Updated:** January 2026

---

## 1. Sitemap & Routes

```
/vendor                         → Dashboard
├── /vendor/reservations        → Reservations management
│   ├── /vendor/reservations/today      → Today's bookings
│   ├── /vendor/reservations/upcoming   → Future bookings
│   ├── /vendor/reservations/past       → History
│   └── /vendor/reservations/scan       → QR Scanner
├── /vendor/orders              → Takeout orders
│   ├── /vendor/orders/active           → Active orders
│   └── /vendor/orders/history          → Order history
├── /vendor/menu                → Menu management
│   ├── /vendor/menu/categories         → Categories
│   └── /vendor/menu/items              → Items
├── /vendor/gallery             → Photo gallery
├── /vendor/experiences         → Special experiences
├── /vendor/reviews             → Reviews management
├── /vendor/guests              → Guest profiles (CRM)
│   └── /vendor/guests/[id]             → Guest detail
├── /vendor/analytics           → Analytics (Pro/Premium)
├── /vendor/settings            → Settings
│   ├── /vendor/settings/profile        → Business profile
│   ├── /vendor/settings/branches       → Branch management
│   ├── /vendor/settings/hours          → Operating hours
│   ├── /vendor/settings/payment        → Payment settings
│   ├── /vendor/settings/delivery       → Delivery settings
│   └── /vendor/settings/documents      → Documents
├── /vendor/subscription        → Subscription management
└── /vendor/auth
    ├── /vendor/auth/login              → Login
    ├── /vendor/auth/register           → Register
    └── /vendor/auth/forgot-password    → Forgot password
```

---

## 2. Dashboard Layout

### 2.1 Main Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌────────┬──────────────────────────────────────────────────┐   │
│ │SIDEBAR │  MAIN CONTENT AREA                               │   │
│ │        │                                                  │   │
│ │ BUCR   │  ┌────────────────────────────────────────────┐  │   │
│ │ vendor │  │ HEADER BAR                                 │  │   │
│ │        │  │ Page Title          🔔 Notifications  👤   │  │   │
│ │────────│  └────────────────────────────────────────────┘  │   │
│ │        │                                                  │   │
│ │ 🏠 Dash│  ┌────────────────────────────────────────────┐  │   │
│ │ 📅 Rsv │  │                                            │  │   │
│ │ 🛒 Ord │  │           PAGE CONTENT                     │  │   │
│ │ 🍽️ Menu│  │                                            │  │   │
│ │ 📷 Gal │  │                                            │  │   │
│ │ ⭐ Exp │  │                                            │  │   │
│ │ 💬 Rev │  │                                            │  │   │
│ │ 👥 Gst │  │                                            │  │   │
│ │ 📊 Ana │  │                                            │  │   │
│ │────────│  │                                            │  │   │
│ │ ⚙️ Set │  │                                            │  │   │
│ │ 💳 Sub │  └────────────────────────────────────────────┘  │   │
│ │        │                                                  │   │
│ └────────┴──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Dashboard Home

```
┌─────────────────────────────────────────────────────────────────┐
│  Good afternoon, La Taverna! 🍕                                 │
│                                                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐ │
│  │ Today's    │ │ This Week  │ │ Revenue    │ │    SCAN      │ │
│  │ Bookings   │ │            │ │ (Month)    │ │     QR       │ │
│  │            │ │            │ │            │ │              │ │
│  │    12      │ │    47      │ │  ₦1.2M     │ │     📷      │ │
│  │  bookings  │ │  bookings  │ │   +15%     │ │   Check-in   │ │
│  │            │ │            │ │            │ │              │ │
│  └────────────┘ └────────────┘ └────────────┘ └──────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Today's Reservations                          [View All →]     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ TIME     GUEST           PARTY  STATUS          ACTIONS    ││
│  │──────────────────────────────────────────────────────────────││
│  │ 12:00    Chidera O.      2      ● Confirmed    [Check-in]  ││
│  │ 12:30    Adebayo K.      4      ● Confirmed    [Check-in]  ││
│  │ 1:00     Ngozi M.        2      ✓ Checked In   [Details]   ││
│  │ 1:30     Emeka A.        6      ● Confirmed    [Check-in]  ││
│  │ 2:00     Fatima B.       2      ○ Pending      [Confirm]   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Active Takeout Orders                         [View All →]     │
│                                                                 │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐      │
│  │ ORD-12345      │ │ ORD-12346      │ │ ORD-12347      │      │
│  │ Chidera O.     │ │ Adebayo K.     │ │ Ngozi M.       │      │
│  │ 3 items • ₦8.5k│ │ 2 items • ₦4.2k│ │ 5 items • ₦12k │      │
│  │ 🟡 Preparing   │ │ 🟢 Ready       │ │ 🟡 Preparing   │      │
│  │ [Update]       │ │ [Mark Picked]  │ │ [Update]       │      │
│  └────────────────┘ └────────────────┘ └────────────────┘      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Quick Stats (This Month)                                       │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  📊 Performance                                            │ │
│  │                                                            │ │
│  │  Total Reservations    │████████████████░░░│  187 (+12%)  │ │
│  │  Check-in Rate         │██████████████████░│   92%        │ │
│  │  No-show Rate          │██░░░░░░░░░░░░░░░░░│    4%        │ │
│  │  Avg. Rating           │████████████████░░░│  ★ 4.8       │ │
│  │  New Reviews           │█████████░░░░░░░░░░│   24         │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. QR Scanner Page (Critical Feature)

### 3.1 Scanner Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Check-in Guest                                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │                    ┌─────────────────┐                      ││
│  │                    │                 │                      ││
│  │                    │   [CAMERA       │                      ││
│  │                    │    VIEWFINDER]  │                      ││
│  │                    │                 │                      ││
│  │                    │   ┌───────┐     │                      ││
│  │                    │   │ SCAN  │     │                      ││
│  │                    │   │ AREA  │     │                      ││
│  │                    │   └───────┘     │                      ││
│  │                    │                 │                      ││
│  │                    └─────────────────┘                      ││
│  │                                                             ││
│  │              Point camera at guest's QR code                ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ─────────────────── OR ────────────────────                    │
│                                                                 │
│  Enter PIN Manually                                             │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                          │
│  │      │ │      │ │      │ │      │        [Verify]           │
│  └──────┘ └──────┘ └──────┘ └──────┘                          │
│                                                                 │
│  ─────────────────────────────────────────                      │
│                                                                 │
│  Or search by reference: BKR-______                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Check-in Success Modal

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         ✓                                       │
│                                                                 │
│                  Check-in Successful!                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  Guest:        Chidera Okonkwo                             ││
│  │  Reference:    BKR-ABC123                                  ││
│  │  Party Size:   2 guests                                    ││
│  │  Time:         7:00 PM                                     ││
│  │  Table:        Auto-assign                                 ││
│  │                                                             ││
│  │  Credits:      50 credits refunded + 2.5 bonus            ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Special Notes:                                                 │
│  🎂 Birthday celebration - complimentary dessert               │
│  🥜 Nut allergy                                                │
│                                                                 │
│                     [Done]  [View Guest Profile]                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Check-in Error States

```
┌────────────────────────────┐  ┌────────────────────────────┐
│                            │  │                            │
│            ✗               │  │            ⚠               │
│                            │  │                            │
│   Invalid QR Code          │  │   Already Checked In       │
│                            │  │                            │
│   This QR code is not      │  │   This reservation was     │
│   valid or has expired.    │  │   checked in at 7:05 PM    │
│                            │  │                            │
│   [Try Again]              │  │   [View Details]           │
│                            │  │                            │
└────────────────────────────┘  └────────────────────────────┘

┌────────────────────────────┐  ┌────────────────────────────┐
│                            │  │                            │
│            ⚠               │  │            ✗               │
│                            │  │                            │
│   Wrong Venue              │  │   Reservation Not Found    │
│                            │  │                            │
│   This reservation is      │  │   No reservation found     │
│   for another branch.      │  │   with this code.          │
│                            │  │                            │
│   [Dismiss]                │  │   [Try Again]              │
│                            │  │                            │
└────────────────────────────┘  └────────────────────────────┘
```

---

## 4. Reservations Management

### 4.1 Reservations List View

```
┌─────────────────────────────────────────────────────────────────┐
│  Reservations                                                   │
│                                                                 │
│  [Today] [Upcoming] [Past]        🔍 Search    [+ New Booking]  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Filters:  [All Statuses ▼]  [Date Range]  [Export CSV]     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ TIME   REF        GUEST          PARTY STATUS      ACTIONS ││
│  │─────────────────────────────────────────────────────────────││
│  │ 12:00  BKR-123   Chidera O.     2     ● Confirmed  ⋮       ││
│  │ 12:30  BKR-124   Adebayo K.     4     ● Confirmed  ⋮       ││
│  │ 1:00   BKR-125   Ngozi M.       2     ✓ Checked In ⋮       ││
│  │ 1:30   BKR-126   Emeka A.       6     ● Confirmed  ⋮       ││
│  │ 2:00   BKR-127   Fatima B.      2     ○ Pending    ⋮       ││
│  │ 2:30   BKR-128   Olu T.         3     ✗ Cancelled  ⋮       ││
│  │ 3:00   BKR-129   Amara N.       2     ⚠ No-show    ⋮       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Showing 1-20 of 47 reservations       [← Prev] [Next →]       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Status Legend:
● Confirmed (blue)
○ Pending (gray)
✓ Checked In (green)
✗ Cancelled (red strikethrough)
⚠ No-show (amber)
```

### 4.2 Reservation Detail Drawer

```
┌─────────────────────────────────────────────────────────────────┐
│                                               [×]               │
│  Reservation Details                                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Reference: BKR-ABC123              Status: ● Confirmed    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Guest Information                                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  👤 Chidera Okonkwo                                        ││
│  │  📧 chidera@email.com                                      ││
│  │  📞 +234 801 234 5678                                      ││
│  │  🏆 VIP Guest (15 visits)                                  ││
│  │                                                             ││
│  │  [View Full Profile]                                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Booking Details                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  📅 Friday, January 24, 2026                               ││
│  │  🕐 7:00 PM                                                ││
│  │  👥 2 guests                                               ││
│  │  💳 50 credits deposited                                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Special Requests                                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  🎂 Birthday celebration                                   ││
│  │  🥜 Nut allergy - please inform kitchen                    ││
│  │  🪑 Window seat preferred                                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Actions                                                        │
│  [Check-in]  [Modify]  [Cancel]  [Contact Guest]               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Menu Management

### 5.1 Menu Items List

```
┌─────────────────────────────────────────────────────────────────┐
│  Menu Management                                                │
│                                                                 │
│  [Categories] [Items]                              [+ Add Item] │
│                                                                 │
│  ┌──────────────┬───────────────────────────────────────────────┐
│  │ CATEGORIES   │  ITEMS                                       │
│  │              │                                              │
│  │ All Items    │  🔍 Search items...                          │
│  │ ─────────    │                                              │
│  │ 🍝 Pasta     │  ┌──────────────────────────────────────────┐│
│  │ 🍕 Pizza     │  │ [img] Margherita Pizza                   ││
│  │ 🥗 Salads    │  │       Classic tomato, mozzarella, basil  ││
│  │ 🍖 Mains     │  │       ₦8,500 (takeout)  ● Available      ││
│  │ 🍰 Desserts  │  │       [Edit] [Toggle]                    ││
│  │ 🍷 Drinks    │  └──────────────────────────────────────────┘│
│  │              │                                              │
│  │ [+ Category] │  ┌──────────────────────────────────────────┐│
│  │              │  │ [img] Spaghetti Carbonara                ││
│  │              │  │       Creamy egg, pancetta, parmesan     ││
│  │              │  │       ₦9,200 (takeout)  ● Available      ││
│  │              │  │       [Edit] [Toggle]                    ││
│  │              │  └──────────────────────────────────────────┘│
│  │              │                                              │
│  │              │  ┌──────────────────────────────────────────┐│
│  │              │  │ [img] Caesar Salad                       ││
│  │              │  │       Romaine, croutons, parmesan        ││
│  │              │  │       ₦5,500 (takeout)  ○ Unavailable    ││
│  │              │  │       [Edit] [Toggle]                    ││
│  │              │  └──────────────────────────────────────────┘│
│  └──────────────┴───────────────────────────────────────────────┘
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Add/Edit Menu Item Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Add Menu Item                                        [×]       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  📷 Upload Image                                           ││
│  │  ┌─────────────────┐                                       ││
│  │  │                 │  Drag & drop or click to upload       ││
│  │  │   [+ Upload]    │  Recommended: 800x600px, max 2MB      ││
│  │  │                 │                                       ││
│  │  └─────────────────┘                                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Item Name *                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Margherita Pizza                                           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Description                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Classic Italian pizza with fresh tomato sauce,             ││
│  │ mozzarella cheese, and fresh basil leaves.                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Category *                                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Pizza                                                   ▼  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Takeout Price (₦) *              Preparation Time             │
│  ┌────────────────────────┐       ┌────────────────────────┐   │
│  │ 8,500                  │       │ 20 mins             ▼  │   │
│  └────────────────────────┘       └────────────────────────┘   │
│                                                                 │
│  Dietary Tags                                                   │
│  [x] Vegetarian  [ ] Vegan  [ ] Gluten-free  [ ] Spicy         │
│                                                                 │
│  Availability                                                   │
│  (●) Available  ( ) Unavailable                                │
│                                                                 │
│                              [Cancel]  [Save Item]              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Guest Profiles (CRM)

### 6.1 Guest List

```
┌─────────────────────────────────────────────────────────────────┐
│  Guest Profiles                                                 │
│                                                                 │
│  🔍 Search guests...                    [Export]  [+ Add Guest] │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ GUEST         VISITS  LAST VISIT   TOTAL SPENT  STATUS     ││
│  │─────────────────────────────────────────────────────────────││
│  │ 👤 Chidera O.   15    Jan 20       ₦450,000     🏆 VIP     ││
│  │ 👤 Adebayo K.    8    Jan 18       ₦180,000     ⭐ Regular  ││
│  │ 👤 Ngozi M.      3    Jan 15       ₦45,000      👋 New      ││
│  │ 👤 Emeka A.     12    Jan 12       ₦320,000     🏆 VIP     ││
│  │ 👤 Fatima B.     1    Jan 10       ₦15,000      👋 New      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Guest Profile Detail

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Guests                                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  👤 Chidera Okonkwo                           🏆 VIP Guest ││
│  │  📧 chidera@email.com                                      ││
│  │  📞 +234 801 234 5678                                      ││
│  │  📅 Member since: June 2024                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Total Visits │ │ Total Spent  │ │ Avg. Party   │            │
│  │      15      │ │   ₦450,000   │ │    2.5       │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
│  Preferences & Notes                               [Edit]       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  🪑 Prefers window seating                                  ││
│  │  🍷 Favorite wine: Chianti                                  ││
│  │  🥜 Severe nut allergy - always inform kitchen              ││
│  │  🎂 Birthday: March 15                                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Visit History                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ DATE       PARTY   SPENT      STATUS                       ││
│  │ Jan 20     2       ₦35,000    ✓ Completed                  ││
│  │ Jan 5      4       ₦68,000    ✓ Completed                  ││
│  │ Dec 24     2       ₦42,000    ✓ Completed                  ││
│  │ Dec 10     3       ₦55,000    ✓ Completed                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Analytics (Pro/Premium)

```
┌─────────────────────────────────────────────────────────────────┐
│  Analytics                                     [This Month ▼]   │
│                                                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ Revenue    │ │ Bookings   │ │ Check-in   │ │ Avg Rating │   │
│  │ ₦1.2M      │ │ 187        │ │ 92%        │ │ ★ 4.8      │   │
│  │ +15%       │ │ +12%       │ │ +3%        │ │ +0.2       │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Reservations Over Time                                    ││
│  │                                                             ││
│  │  200 ┤                                          ╭──        ││
│  │  150 ┤                              ╭───────────╯          ││
│  │  100 ┤              ╭───────────────╯                      ││
│  │   50 ┤  ╭───────────╯                                      ││
│  │    0 ┼──┴────┴────┴────┴────┴────┴────┴────┴────┴────┴──  ││
│  │       Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct     ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌──────────────────────────────┐ ┌────────────────────────────┐│
│  │  Popular Times               │ │  Top Menu Items            ││
│  │                              │ │                            ││
│  │  Fri 7-8pm  ████████  85%   │ │  1. Margherita Pizza  120  ││
│  │  Sat 8-9pm  ███████░  78%   │ │  2. Carbonara          98  ││
│  │  Sun 1-2pm  ██████░░  65%   │ │  3. Tiramisu           87  ││
│  │  Fri 8-9pm  █████░░░  58%   │ │  4. Caesar Salad       76  ││
│  │                              │ │                            ││
│  └──────────────────────────────┘ └────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Settings

### 8.1 Business Profile

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings > Business Profile                                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Logo                                                      ││
│  │  ┌────────┐                                                ││
│  │  │ [logo] │  [Change Logo]                                 ││
│  │  └────────┘                                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Business Name *                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ La Taverna Italiana                                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Description                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Authentic Italian dining in the heart of Ikoyi...          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Cuisine Type *                        Price Range *            │
│  ┌────────────────────────┐           ┌────────────────────────┐│
│  │ Italian             ▼  │           │ ₦₦₦                 ▼  ││
│  └────────────────────────┘           └────────────────────────┘│
│                                                                 │
│  Features                                                       │
│  [x] Outdoor Seating  [x] Parking  [ ] Live Music  [x] Full Bar│
│  [ ] Private Room  [x] Wheelchair Accessible  [ ] Pet Friendly │
│                                                                 │
│                                              [Save Changes]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Subscription Management

```
┌─────────────────────────────────────────────────────────────────┐
│  Subscription                                                   │
│                                                                 │
│  Current Plan                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  ⭐ PRO PLAN                              ₦145,000/month   ││
│  │                                                             ││
│  │  ✓ Listings & bookings                                     ││
│  │  ✓ Credit integration                                      ││
│  │  ✓ Analytics dashboard                                     ││
│  │  ✓ Custom profiles                                         ││
│  │  ✓ Priority support                                        ││
│  │                                                             ││
│  │  Next billing: February 1, 2026                            ││
│  │                                                             ││
│  │  [Upgrade to Premium]  [Manage Billing]                    ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Available Plans                                                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ BASIC           │ │ PRO (Current)   │ │ PREMIUM         │   │
│  │ ₦75,000/mo      │ │ ₦145,000/mo     │ │ ₦250,000/mo     │   │
│  │                 │ │                 │ │                 │   │
│  │ • Listings      │ │ • Everything in │ │ • Everything in │   │
│  │ • Bookings      │ │   Basic         │ │   Pro           │   │
│  │ • Credit system │ │ • Analytics     │ │ • Marketing     │   │
│  │                 │ │ • Custom profile│ │ • Featured spots│   │
│  │                 │ │ • Priority help │ │ • Advanced CRM  │   │
│  │                 │ │                 │ │                 │   │
│  │ [Downgrade]     │ │ ✓ Current      │ │ [Upgrade]       │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
