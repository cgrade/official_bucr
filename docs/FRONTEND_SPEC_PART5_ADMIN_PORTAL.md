# Bucr Frontend Specification - Part 5: Admin Portal

> **Version:** 1.0.0 | **Last Updated:** January 2026

---

## 1. Sitemap & Routes

```
/admin                          → Dashboard
├── /admin/users                → User management
│   └── /admin/users/[id]               → User detail
├── /admin/vendors              → Vendor management
│   ├── /admin/vendors/[id]             → Vendor detail
│   └── /admin/vendors/pending          → Pending approvals
├── /admin/documents            → Document verification
│   └── /admin/documents/[id]           → Document review
├── /admin/reservations         → All reservations
├── /admin/orders               → All orders
├── /admin/credits              → Credit system
│   ├── /admin/credits/transactions     → All transactions
│   └── /admin/credits/adjustments      → Manual adjustments
├── /admin/analytics            → Platform analytics
├── /admin/promotions           → Promotions management
├── /admin/support              → Support tickets
├── /admin/settings             → System settings
└── /admin/auth
    └── /admin/auth/login               → Admin login
```

---

## 2. Admin Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌────────┬──────────────────────────────────────────────────┐   │
│ │SIDEBAR │  MAIN CONTENT                                    │   │
│ │        │                                                  │   │
│ │ BUCR   │  Platform Overview                    Jan 2026   │   │
│ │ admin  │                                                  │   │
│ │        │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐│   │
│ │────────│  │ Users    │ │ Vendors  │ │ Revenue  │ │Rsv   ││   │
│ │        │  │          │ │          │ │          │ │      ││   │
│ │ 🏠 Dash│  │  12,450  │ │   156    │ │ ₦45.2M   │ │8,234 ││   │
│ │ 👥 Usrs│  │  +1,240  │ │   +12    │ │  +18%    │ │+15%  ││   │
│ │ 🏪 Vend│  │ this mo  │ │ this mo  │ │ this mo  │ │      ││   │
│ │ 📄 Docs│  └──────────┘ └──────────┘ └──────────┘ └──────┘│   │
│ │ 📅 Rsv │                                                  │   │
│ │ 🛒 Ord │  ┌────────────────────────────────────────────┐  │   │
│ │ 💳 Cred│  │  Revenue & Bookings Trend                  │  │   │
│ │ 📊 Ana │  │                                            │  │   │
│ │ 🎁 Prom│  │  ₦50M ┤                           ╭──      │  │   │
│ │ 🎫 Supp│  │  ₦40M ┤                    ╭──────╯        │  │   │
│ │────────│  │  ₦30M ┤             ╭──────╯               │  │   │
│ │ ⚙️ Set │  │  ₦20M ┤      ╭──────╯                      │  │   │
│ │        │  │  ₦10M ┤──────╯                             │  │   │
│ │        │  │       └──────────────────────────────────  │  │   │
│ │        │  │         Jul Aug Sep Oct Nov Dec Jan        │  │   │
│ │        │  └────────────────────────────────────────────┘  │   │
│ │        │                                                  │   │
│ │        │  ┌─────────────────────┐ ┌─────────────────────┐ │   │
│ │        │  │ Pending Actions     │ │ Recent Activity     │ │   │
│ │        │  │                     │ │                     │ │   │
│ │        │  │ 🔴 5 Doc reviews    │ │ • New vendor: Nok   │ │   │
│ │        │  │ 🟡 3 Vendor apps    │ │ • User #12450 reg   │ │   │
│ │        │  │ 🟡 2 Support tickets│ │ • ₦500k credits sold│ │   │
│ │        │  │                     │ │ • Doc approved: XYZ │ │   │
│ │        │  │ [View All]          │ │ [View All]          │ │   │
│ │        │  └─────────────────────┘ └─────────────────────┘ │   │
│ └────────┴──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. User Management

### 3.1 Users List

```
┌─────────────────────────────────────────────────────────────────┐
│  Users                                           [+ Add User]   │
│                                                                 │
│  🔍 Search users...     [Status ▼]  [Date Range]  [Export]     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ USER            EMAIL              CREDITS  STATUS  JOINED  ││
│  │─────────────────────────────────────────────────────────────││
│  │ Chidera O.      chidera@...        150     Active   Jun 24 ││
│  │ Adebayo K.      adebayo@...        45      Active   Jul 24 ││
│  │ Ngozi M.        ngozi@...          0       Inactive Aug 24 ││
│  │ Emeka A.        emeka@...          200     Active   Sep 24 ││
│  │ Fatima B.       fatima@...         80      Suspended Oct 24 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Showing 1-20 of 12,450              [← Prev] 1 2 3 ... [Next →]│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 User Detail

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Users                                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  👤 Chidera Okonkwo                    Status: ● Active    ││
│  │  📧 chidera@email.com      ✓ Verified                      ││
│  │  📞 +234 801 234 5678      ✓ Verified                      ││
│  │  📅 Joined: June 15, 2024                                  ││
│  │  🔗 Referral Code: CHID2024                                ││
│  │                                                             ││
│  │  [Edit]  [Suspend]  [Delete]  [Impersonate]                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ Credits    │ │ Bookings   │ │ Reviews    │ │ Referrals  │   │
│  │   150      │ │    28      │ │    12      │ │     5      │   │
│  │ ₦15,000    │ │  lifetime  │ │  written   │ │  referred  │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│                                                                 │
│  [Credit History] [Reservations] [Reviews] [Activity Log]       │
│                                                                 │
│  Credit Transactions                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ DATE       TYPE            AMOUNT    BALANCE    REF        ││
│  │ Jan 20     Purchase        +100      150        PAY-123    ││
│  │ Jan 20     Deposit         -50       50         BKR-456    ││
│  │ Jan 19     Refund+Bonus    +52       100        BKR-455    ││
│  │ Jan 18     Referral        +20       48         REF-789    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Admin Actions                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Adjust Credits: [____] [+ Add]  [- Deduct]                ││
│  │  Reason: [_________________________________]                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Vendor Management

### 4.1 Vendors List

```
┌─────────────────────────────────────────────────────────────────┐
│  Vendors                                                        │
│                                                                 │
│  [All] [Pending (3)] [Active] [Suspended]        [+ Add Vendor] │
│                                                                 │
│  🔍 Search vendors...     [Plan ▼]  [Location ▼]  [Export]     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ VENDOR          LOCATION    PLAN     BOOKINGS  STATUS      ││
│  │─────────────────────────────────────────────────────────────││
│  │ La Taverna      VI, Lagos   Pro      187       ✓ Verified  ││
│  │ Dynasty Chinese Ikoyi       Premium  234       ✓ Verified  ││
│  │ Nok by Alara    Lekki       Basic    89        ✓ Verified  ││
│  │ New Spot        VI          -        -         ○ Pending   ││
│  │ Craft Gourmet   VI          Pro      156       ⚠ Docs Exp  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Vendor Detail

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Vendors                                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  🍕 La Taverna Italiana              Status: ✓ Verified    ││
│  │  📍 12 Awolowo Road, Victoria Island, Lagos                ││
│  │  📧 contact@lataverna.ng                                   ││
│  │  📞 +234 801 234 5678                                      ││
│  │  📅 Joined: March 2024                                     ││
│  │                                                             ││
│  │  Trust Badges: ✓ Verified  ⭐ Trusted  🏆 Premium Partner  ││
│  │                                                             ││
│  │  [Edit]  [Suspend]  [View Public Page]  [Login as Vendor]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Subscription                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Plan: PRO (₦145,000/month)                                ││
│  │  Status: Active                                            ││
│  │  Next Billing: Feb 1, 2026                                 ││
│  │  [Change Plan]  [Cancel Subscription]                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Documents                                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ DOCUMENT        STATUS      UPLOADED     EXPIRES           ││
│  │ CAC             ✓ Approved  Jan 2024     -                 ││
│  │ TIN             ✓ Approved  Jan 2024     -                 ││
│  │ Food License    ⚠ Expiring  Jan 2024     Feb 2026          ││
│  │                                                             ││
│  │ [Review Documents]                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Performance                                                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ Bookings   │ │ Check-in   │ │ Rating     │ │ Revenue    │   │
│  │   187      │ │   94%      │ │  ★ 4.8     │ │  ₦2.8M     │   │
│  │ this month │ │   rate     │ │  (324)     │ │  this mo   │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Document Verification

```
┌─────────────────────────────────────────────────────────────────┐
│  Document Verification                                          │
│                                                                 │
│  [Pending (5)] [Approved] [Rejected]                [Refresh]   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ VENDOR          DOCUMENT    SUBMITTED   STATUS              ││
│  │─────────────────────────────────────────────────────────────││
│  │ New Spot Rest   CAC         Jan 22      🔴 Pending Review   ││
│  │ New Spot Rest   TIN         Jan 22      🔴 Pending Review   ││
│  │ Cafe Lagos      CAC         Jan 21      🔴 Pending Review   ││
│  │ Suya Express    Food Cert   Jan 20      🟡 Under Review     ││
│  │ Mama's Kitchen  CAC         Jan 19      🔴 Pending Review   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Document Review Panel                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  Vendor: New Spot Restaurant                                ││
│  │  Document: CAC Certificate                                  ││
│  │  Submitted: January 22, 2026                                ││
│  │                                                             ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │                                                     │   ││
│  │  │              [Document Preview]                     │   ││
│  │  │                 PDF Viewer                          │   ││
│  │  │                                                     │   ││
│  │  │  [Download]  [Zoom In]  [Zoom Out]  [Full Screen]  │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  │                                                             ││
│  │  Verification Checklist:                                    ││
│  │  [ ] Business name matches                                  ││
│  │  [ ] Registration number valid                              ││
│  │  [ ] Document not expired                                   ││
│  │  [ ] Document is legible                                    ││
│  │                                                             ││
│  │  Notes:                                                     ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │                                                     │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  │                                                             ││
│  │  [Reject]                              [Approve Document]   ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Credit System Management

```
┌─────────────────────────────────────────────────────────────────┐
│  Credit System                                                  │
│                                                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ Total Sold │ │ In Circ.   │ │ Breakage   │ │ Expiring   │   │
│  │ ₦45.2M     │ │ 380,000    │ │ 12.3%      │ │ 15,000     │   │
│  │ this month │ │ credits    │ │ rate       │ │ in 30 days │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│                                                                 │
│  [Transactions] [Manual Adjustments] [Expiry Management]        │
│                                                                 │
│  Recent Transactions                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ DATE       USER          TYPE        AMOUNT    REFERENCE   ││
│  │─────────────────────────────────────────────────────────────││
│  │ Jan 23     Chidera O.    Purchase    +100      PAY-12345   ││
│  │ Jan 23     Adebayo K.    Deposit     -50       BKR-67890   ││
│  │ Jan 23     Ngozi M.      Refund      +52       BKR-67889   ││
│  │ Jan 23     Emeka A.      Referral    +20       REF-11111   ││
│  │ Jan 23     Fatima B.     Expiry      -30       EXP-22222   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Manual Adjustment                                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  User: [Search user...                               🔍]   ││
│  │                                                             ││
│  │  Type:   (●) Add Credits   ( ) Deduct Credits              ││
│  │                                                             ││
│  │  Amount: [________] credits                                ││
│  │                                                             ││
│  │  Reason: [________________________________________]         ││
│  │          [ ] Customer compensation                          ││
│  │          [ ] Technical issue resolution                     ││
│  │          [ ] Promotion/Marketing                            ││
│  │          [ ] Other                                          ││
│  │                                                             ││
│  │                               [Cancel]  [Apply Adjustment]  ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Platform Analytics

```
┌─────────────────────────────────────────────────────────────────┐
│  Platform Analytics                        [This Month ▼]       │
│                                                                 │
│  Key Metrics                                                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ GMV        │ │ Revenue    │ │ Users      │ │ Vendors    │   │
│  │ ₦125M      │ │ ₦18.5M     │ │ 12,450     │ │ 156        │   │
│  │ +22%       │ │ +18%       │ │ +1,240     │ │ +12        │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Growth Trends                                             ││
│  │  ─── Revenue  ─── Users  ─── Bookings                      ││
│  │                                                             ││
│  │  [            MULTI-LINE CHART                           ] ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌──────────────────────────────┐ ┌────────────────────────────┐│
│  │ Top Vendors (by bookings)    │ │ Revenue Breakdown          ││
│  │                              │ │                            ││
│  │ 1. Dynasty Chinese    234    │ │ Credit Sales   ███████ 65% ││
│  │ 2. La Taverna         187    │ │ Subscriptions  ████░░░ 28% ││
│  │ 3. Nok by Alara       156    │ │ Other          █░░░░░░  7% ││
│  │ 4. Craft Gourmet      134    │ │                            ││
│  │ 5. Azura              128    │ │                            ││
│  │                              │ │                            ││
│  └──────────────────────────────┘ └────────────────────────────┘│
│                                                                 │
│  ┌──────────────────────────────┐ ┌────────────────────────────┐│
│  │ Booking Metrics              │ │ User Engagement            ││
│  │                              │ │                            ││
│  │ Total Bookings:     8,234    │ │ DAU:            2,340      ││
│  │ Avg. Check-in Rate:   89%    │ │ WAU:            5,670      ││
│  │ Avg. No-show Rate:     6%    │ │ MAU:            9,120      ││
│  │ Cancellation Rate:     5%    │ │ Retention (30d):  72%      ││
│  │                              │ │                            ││
│  └──────────────────────────────┘ └────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. System Settings

```
┌─────────────────────────────────────────────────────────────────┐
│  System Settings                                                │
│                                                                 │
│  [General] [Credits] [Notifications] [Security] [API]          │
│                                                                 │
│  Credit System Configuration                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  Credit Value                                               ││
│  │  1 credit = ₦ [100]                                        ││
│  │                                                             ││
│  │  Purchase Price (per credit)                                ││
│  │  ₦ [120] (20% margin)                                      ││
│  │                                                             ││
│  │  Credit Expiry                                              ││
│  │  [6] months after purchase                                 ││
│  │  Reminder at [30] days before expiry                       ││
│  │                                                             ││
│  │  Reservation Deposits                                       ││
│  │  Standard (1-2 guests):  [50] credits                      ││
│  │  Group (3-6 guests):     [100] credits                     ││
│  │  Large Party (7+):       [200] credits                     ││
│  │                                                             ││
│  │  Bonuses                                                    ││
│  │  Check-in bonus:         [5] %                             ││
│  │  Referral bonus:         [20] credits                      ││
│  │  Review bonus:           [5-10] credits                    ││
│  │  Vendor cancellation:    [10] % extra                      ││
│  │                                                             ││
│  │  Cancellation Policy                                        ││
│  │  24+ hours:    [100] % refund                              ││
│  │  12-24 hours:  [50] % refund                               ││
│  │  <12 hours:    [0] % refund                                ││
│  │                                                             ││
│  │                                         [Save Configuration]││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Subscription Plans                                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  Basic:     ₦ [75,000] /month    [Edit Features]           ││
│  │  Pro:       ₦ [145,000] /month   [Edit Features]           ││
│  │  Premium:   ₦ [250,000] /month   [Edit Features]           ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Admin Roles & Permissions

| Role | Dashboard | Users | Vendors | Documents | Credits | Analytics | Settings |
|------|-----------|-------|---------|-----------|---------|-----------|----------|
| **Super Admin** | ✓ | Full | Full | Full | Full | Full | Full |
| **Admin** | ✓ | View/Edit | View/Edit | Approve | View/Adjust | View | View |
| **Support** | ✓ | View | View | View | View | - | - |
| **Finance** | ✓ | View | View | - | Full | View | - |
| **Content** | ✓ | - | View | - | - | View | - |
