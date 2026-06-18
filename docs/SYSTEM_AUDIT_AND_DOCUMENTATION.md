# BUCR Platform - Complete System Audit & Documentation

**Date:** February 1, 2026  
**Version:** 1.0.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Credit System Deep Dive](#credit-system-deep-dive)
4. [QA Audit Findings](#qa-audit-findings)
5. [Revenue Optimization Recommendations](#revenue-optimization-recommendations)
6. [Cleanup & Refactoring Recommendations](#cleanup--refactoring-recommendations)
7. [Technical Specifications](#technical-specifications)

---

## Executive Summary

BUCR is a Nigerian restaurant reservation and takeout platform designed to solve the industry's 20% no-show problem through a credit-based deposit system. The platform operates on a **flat subscription model** (no commissions), making it vendor-friendly while generating revenue through:

1. **Credit margin** (17% on credit purchases)
2. **Credit breakage** (expired/forfeited credits - target 12%)
3. **Vendor subscriptions** (₦75K - ₦250K/month)
4. **Featured placements** (paid visibility for vendors)

### Platform Components

| Component | Technology | Status |
|-----------|------------|--------|
| Backend API | Next.js 14 (App Router) | ✅ Implemented |
| Database | PostgreSQL + Prisma | ✅ Implemented |
| Mobile App | React Native (Expo) | ✅ Implemented |
| Vendor Portal | Next.js Web App | ✅ Implemented |
| Admin Portal | Next.js Web App | ✅ Implemented |
| Payments | Paystack | ✅ Integrated |
| File Storage | Cloudinary | ✅ Integrated |
| Email | Resend | ✅ Integrated |
| SMS | Termii | ✅ Integrated |

---

## System Architecture Overview

### Monorepo Structure

```
official_bucr/
├── apps/
│   ├── mobile-app/          # React Native (Expo) - User mobile app
│   ├── vendor-portal/       # Next.js - Vendor dashboard
│   ├── admin-portal/        # Next.js - Admin dashboard
│   └── user-portal/         # Next.js - User web (placeholder)
├── packages/
│   └── theme/               # Shared design tokens & Tailwind preset
├── prisma/
│   ├── schema.prisma        # Database schema (759 lines)
│   └── seed.ts              # Database seeding
├── src/
│   ├── app/api/             # Backend API routes
│   ├── services/            # Business logic services
│   └── lib/                 # Utilities, middleware, validators
├── tests/                   # Unit, integration, E2E tests
└── docs/                    # Documentation
```

### Database Schema (28 Models)

**Core Models:**
- `User` - Customer accounts with credits balance
- `Vendor` - Restaurant/business accounts
- `VendorBranch` - Multi-location support
- `Reservation` - Booking records with QR/PIN
- `TakeoutOrder` - Pickup/delivery orders

**Credit System Models:**
- `CreditTransaction` - User credit movements
- `VendorWallet` - Vendor credit wallet
- `VendorCreditTransaction` - Vendor credit movements
- `Payment` - Paystack payment records

**Supporting Models:**
- `Menu`, `MenuCategory` - Restaurant menus
- `Experience` - Special dining experiences
- `SpecialOffer` - Promotional offers
- `Review` - User reviews (verified only)
- `GuestProfile` - CRM for vendors
- `Achievement` - Vendor badges
- `FeaturedPackage`, `FeaturedSpot` - Paid placements
- `VendorSubscription` - Subscription tracking
- `AuditLog` - System audit trail

### API Structure (15 Route Groups)

```
/api/
├── auth/           # Authentication (login, register, refresh, reset)
├── users/          # User management & profiles
├── vendors/        # Public vendor listings
├── vendor/         # Authenticated vendor operations
├── admin/          # Admin operations
├── reservations/   # Booking management
├── orders/         # Takeout/delivery orders
├── payments/       # Payment initialization & verification
├── reviews/        # Review management
├── experiences/    # Experience listings
├── featured/       # Featured content
├── upload/         # File uploads
├── waitlist/       # Waitlist management
├── webhooks/       # Paystack webhooks
└── realtime/       # Real-time updates
```

---

## Credit System Deep Dive

### Architecture

The credit system is the **core value proposition** of BUCR, implementing a deposit-based reservation system that:

1. **Reduces no-shows** by requiring upfront commitment
2. **Generates revenue** through margin and breakage
3. **Rewards loyalty** with show-up bonuses
4. **Protects users** with fair cancellation policies

### Credit Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CREDIT LIFECYCLE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   PURCHASE  │
                              │  ₦100 = 1cr │
                              │  (flat rate)│
                              └──────┬──────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                          USER WALLET (creditsBalance)                       │
│                                                                             │
│  Additions:                          Deductions:                            │
│  • purchase (+credits)               • redeem (-credits for reservation)    │
│  • refund (+credits back)            • forfeit (-credits for no-show)       │
│  • bonus (+5% show-up reward)        • expire (-credits after 6 months)     │
│  • referral (+20 credits)                                                   │
│  • review (+5-10 credits)                                                   │
│  • vendor_cancel (+10% compensation)                                        │
└────────────────────────────────────────────────────────────────────────────┘
                                     │
                     ┌───────────────┼───────────────┐
                     │               │               │
                     ▼               ▼               ▼
              ┌──────────┐    ┌──────────┐    ┌──────────┐
              │  SHOW UP │    │  CANCEL  │    │  NO-SHOW │
              │          │    │          │    │          │
              │ 100% +5% │    │ Policy   │    │ 100%     │
              │ refund   │    │ based    │    │ forfeit  │
              └──────────┘    └──────────┘    └──────────┘
```

### Credit Pricing & Tiers

```typescript
// src/lib/config.ts
credits: {
  valueNgn: 100,              // 1 credit = ₦100 value
  purchasePriceNgn: 100,      // Flat rate: ₦100 = 1 credit
  expiryMonths: 6,            // Credits expire after 6 months
  expiryReminderDays: 30,     // Reminder before expiry
  showupBonusPercent: 5,      // 5% bonus for showing up
  reviewBonusMin: 5,          // Min review reward
  reviewBonusMax: 10,         // Max review reward
  referralBonus: 20,          // Referral reward
  noShowVendorSharePercent: 0 // 100% of no-show goes to platform
}

reservations: {
  tiers: {
    standard: { minGuests: 1, maxGuests: 2, credits: 50 },   // ₦5,000
    group: { minGuests: 3, maxGuests: 6, credits: 100 },     // ₦10,000
    largeParty: { minGuests: 7, maxGuests: 999, credits: 200 } // ₦20,000
  },
  cancellation: {
    fullRefundHours: 24,      // 100% refund if >24h before
    partialRefundHours: 12,   // 50% refund if 12-24h before
    partialRefundPercent: 50  // <12h = 0% refund
  }
}
```

### Revenue Streams from Credit System

#### 1. No-Show Forfeiture (100% to Platform)

```typescript
// src/services/reservation.service.ts - markNoShow()
// When user doesn't show up:
// - 100% of deposited credits are forfeited
// - Vendor receives 0% (configurable via noShowVendorSharePercent)
// - Platform keeps all forfeited credits

Example:
- User books for 4 guests → 100 credits deposited
- User doesn't show up → 100 credits forfeited
- Platform revenue: ₦10,000
```

#### 2. Late Cancellation Forfeiture

```typescript
// Cancellation less than 12 hours before: 100% forfeit
// Cancellation 12-24 hours before: 50% forfeit
// Cancellation 24+ hours before: 0% forfeit

Example:
- User cancels 6 hours before → 100% forfeit
- User cancels 18 hours before → 50% forfeit
```

#### 3. Credit Breakage (Expired Credits)

```typescript
// Credits expire after 6 months
// Target breakage rate: 12%
// Reminder sent 30 days before expiry

Example:
- User purchases 500 credits
- User uses 400 credits over 6 months
- 100 credits expire → Platform revenue: ₦10,000
```

### Credit Service Functions

| Function | Purpose |
|----------|---------|
| `createCreditTransaction()` | Core transaction creator |
| `purchaseCredits()` | Handle credit purchase |
| `deductCredits()` | Deduct for reservation |
| `refundCredits()` | Refund on show-up/cancellation |
| `awardBonus()` | Award show-up/review bonus |
| `forfeitCredits()` | Forfeit on no-show |
| `calculateCreditsForPartySize()` | Determine required deposit |
| `calculateShowupBonus()` | Calculate 5% bonus |
| `calculateCancellationRefund()` | Determine refund amount |
| `getExpiringCredits()` | Find credits expiring soon |

### Vendor Wallet System

Vendors have a separate wallet for:
- **Redemption** - Credits from featured purchases
- **Featured spending** - Paying for premium placement
- **Marketing spending** - Future promotional features
- **Withdrawals** - Cash out to bank

```typescript
VendorWallet {
  balance: number,          // Current credit balance
  totalEarned: number,      // Lifetime earnings
  totalSpent: number,       // Lifetime spending
  totalWithdrawn: number,   // Cash withdrawn
  pendingWithdrawal: number // Pending withdrawals
}
```

---

## QA Audit Findings

### ✅ Strengths

1. **Robust Database Schema**
   - 28 well-designed models with proper relationships
   - Comprehensive indexes for performance
   - Soft deletes implemented throughout
   - Audit logging for compliance

2. **Comprehensive Test Coverage**
   - 52 test files covering:
     - Unit tests for services
     - Integration tests for APIs
     - E2E workflow tests
   - Testing infrastructure with Vitest

3. **Security Implementations**
   - JWT authentication with refresh tokens
   - Rate limiting middleware
   - Security headers middleware
   - Paystack webhook signature verification
   - PIN-based reservation verification

4. **Well-Structured Services**
   - Clean separation of concerns
   - Transaction support for data integrity
   - Configurable business rules

### ⚠️ Areas for Improvement

#### Critical Issues

1. **Credit Margin Not Implemented**
   ```typescript
   // Current: ₦100 = 1 credit (no margin)
   purchasePriceNgn: 100
   
   // Specification says: ₦120 = 1 credit (17% margin)
   // RECOMMENDATION: Update to purchasePriceNgn: 120
   ```

2. **Missing Credit Expiry Cron Job**
   - Credits have `expiresAt` but no automated expiry process
   - Need scheduled job to expire credits and notify users

3. **No Vendor Credit Earning from Redemptions**
   - Current implementation doesn't give vendors any credits from user reservations
   - Consider adding vendor loyalty rewards

#### Moderate Issues

4. **Duplicate User Portal**
   - `apps/user-portal/` exists but appears to be placeholder
   - Mobile app handles all user functionality
   - **Recommend: Remove or clarify purpose**

5. **Inconsistent Theme Usage**
   - Mobile app has own ThemeContext
   - Web portals use packages/theme
   - **Recommend: Unify theme system**

6. **Missing Push Notification Implementation**
   - Expo push token stored but no notification service
   - **Recommend: Implement push notification service**

#### Minor Issues

7. **Hardcoded Colors in Mobile App**
   - Some components still have hardcoded colors
   - Should use theme context consistently

8. **Missing API Rate Limit Headers**
   - Rate limiting exists but doesn't return headers
   - Clients can't know remaining limits

9. **No Pagination Cursor Support**
   - Only offset-based pagination
   - Consider cursor-based for large datasets

---

## Revenue Optimization Recommendations

### Immediate Improvements

#### 1. Implement Credit Purchase Margin
```typescript
// Change in config.ts
credits: {
  purchasePriceNgn: 120,  // ₦120 per credit (17% margin)
  // OR tiered pricing:
  // 50 credits: ₦6,000 (₦120 each)
  // 100 credits: ₦11,000 (₦110 each) - 8% discount
  // 200 credits: ₦20,000 (₦100 each) - 17% discount
}
```
**Revenue Impact:** 17% on all credit purchases

#### 2. Credit Package Bundles
```typescript
// Add package tiers with bonuses
packages: {
  starter: { credits: 50, price: 6000, bonus: 0 },
  value: { credits: 100, price: 11000, bonus: 10 },    // 10% bonus
  premium: { credits: 250, price: 25000, bonus: 50 },  // 20% bonus
}
```
**Revenue Impact:** Higher average purchase value

#### 3. Featured Placement Monetization
```typescript
// Already implemented, ensure active promotion:
FeaturedPackage {
  name: "Homepage Spotlight"
  creditsCost: 500        // ₦50,000 worth
  durationDays: 7
}
```

### Engagement Improvements

#### 4. Gamification System
```typescript
// Add user levels and streaks
UserLevel {
  bronze: { minBookings: 0, bonusPercent: 5 },
  silver: { minBookings: 5, bonusPercent: 7 },
  gold: { minBookings: 20, bonusPercent: 10 },
  platinum: { minBookings: 50, bonusPercent: 15 }
}

// Streak bonuses
if (consecutiveShowUps >= 3) {
  bonus += 5; // Extra 5 credits
}
```

#### 5. Referral Program Enhancement
```typescript
// Current: 20 credits for referral
// Enhanced:
referral: {
  referrerBonus: 30,      // Referrer gets 30 credits
  refereeBonus: 20,       // New user gets 20 credits
  tierBonus: {            // After X successful referrals
    5: 50,                // 50 bonus credits at 5 referrals
    10: 150,              // 150 bonus at 10 referrals
    25: 500               // 500 bonus at 25 referrals
  }
}
```

#### 6. Flash Sales & Promotions
```typescript
// Add promotion model
Promotion {
  type: 'flash_sale' | 'happy_hour' | 'new_user'
  discountPercent: 20
  validFrom: DateTime
  validUntil: DateTime
  maxUses: 100
  usedCount: 0
}
```

### Long-term Revenue Features

#### 7. Corporate Accounts (V2)
- Bulk credit purchases for companies
- Dedicated account management
- Monthly invoicing
- Employee meal programs

#### 8. Dynamic Pricing (V2)
- Peak hour surcharges
- Last-minute discounts
- Demand-based pricing

#### 9. Vendor Analytics Upsell
- Basic analytics in Pro tier
- Advanced insights in Premium
- Custom reports as add-on

---

## Cleanup & Refactoring Recommendations

### Files to Remove

```bash
# 1. Unused User Portal (if mobile-only)
rm -rf apps/user-portal/

# 2. Empty coverage directory
rm -rf coverage/

# 3. Duplicate/obsolete navigation files (mobile app)
# Check if these are still used:
# - src/navigation/RootNavigator.tsx (if using Expo Router)
# - src/navigation/MainNavigator.tsx (if using Expo Router)
# - src/navigation/types.ts (if using Expo Router)

# 4. Old/duplicate theme files if unified
# Review and consolidate theme systems
```

### Code Consolidation

#### 1. Unify API Response Handling (Mobile App)
```typescript
// Current: Different handling in different screens
// Consolidate to single utility:

// src/lib/api-utils.ts
export function extractPaginatedData<T>(response: any): {
  items: T[];
  total: number;
  page: number;
  limit: number;
} {
  if (Array.isArray(response)) {
    return { items: response, total: response.length, page: 1, limit: response.length };
  }
  if (response.data?.items) {
    return {
      items: response.data.items,
      total: response.data.pagination?.total ?? response.data.items.length,
      page: response.data.pagination?.page ?? 1,
      limit: response.data.pagination?.limit ?? 20,
    };
  }
  // ... handle other cases
}
```

#### 2. Create Shared Hooks Package
```typescript
// packages/hooks/
// - useDebounce.ts
// - usePagination.ts
// - useInfiniteScroll.ts
// - useAuth.ts (shared auth logic)
```

#### 3. Consolidate Vendor Portal & Admin Portal UI Components
```typescript
// Many duplicate components between portals:
// - DataTable
// - StatCard
// - PageHeader
// - ThemeToggle

// Move to packages/ui/ for sharing
```

### Performance Optimizations

#### 1. Add Database Query Optimization
```typescript
// Add connection pooling config
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Add for production:
  // directUrl = env("DIRECT_URL")
  // shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}

// Add query logging for slow queries
// Add indexes for frequently queried fields
```

#### 2. Implement Response Caching
```typescript
// Already have vendorCache, expand to:
// - userCache
// - reservationCache
// - menuCache
// Use Redis in production
```

#### 3. Image Optimization
```typescript
// Ensure Cloudinary transformations are used
// Add lazy loading for images
// Implement progressive loading
```

### Security Hardening

#### 1. Add Input Sanitization
```typescript
// Add DOMPurify or similar for user content
import DOMPurify from 'dompurify';

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}
```

#### 2. Implement Request Signing
```typescript
// For sensitive operations
// Add HMAC signature verification
```

#### 3. Add Audit Logging for All Admin Actions
```typescript
// Already have AuditLog model
// Ensure all admin actions are logged
```

---

## Technical Specifications

### Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=
JWT_REFRESH_SECRET=

# Paystack
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email (Resend)
RESEND_API_KEY=
EMAIL_FROM=

# SMS (Termii)
TERMII_API_KEY=
TERMII_SENDER_ID=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=

# Credits (optional - has defaults)
CREDIT_VALUE_NGN=100
CREDIT_PURCHASE_PRICE_NGN=100
CREDIT_EXPIRY_MONTHS=6
CREDIT_SHOWUP_BONUS_PERCENT=5
```

### API Authentication

```
Header: Authorization: Bearer <access_token>

Token Types:
- Access Token: 15 minutes expiry
- Refresh Token: 7 days expiry

Endpoints requiring auth:
- All /api/users/* except login/register
- All /api/vendor/*
- All /api/admin/*
- POST /api/reservations
- POST /api/orders
- POST /api/reviews
```

### Deployment Checklist

- [ ] Set all environment variables
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Run database seed (optional): `npx prisma db seed`
- [ ] Build all applications
- [ ] Configure CDN for static assets
- [ ] Set up monitoring (logs, errors, performance)
- [ ] Configure backup strategy
- [ ] Set up SSL certificates
- [ ] Configure rate limiting for production
- [ ] Test webhook endpoints
- [ ] Verify email/SMS delivery

---

## Appendix: Service File Reference

| Service | File | Purpose |
|---------|------|---------|
| Credit | `credit.service.ts` | All credit operations |
| Reservation | `reservation.service.ts` | Booking lifecycle |
| Payment | `payment.service.ts` | Paystack integration |
| Subscription | `subscription.service.ts` | Vendor subscriptions |
| Email | `email.service.ts` | Resend integration |
| SMS | `sms.service.ts` | Termii integration |
| QR Code | `qrcode.service.ts` | QR generation |
| Upload | `upload.service.ts` | Cloudinary uploads |
| Token | `token.service.ts` | JWT management |
| Order | `order.service.ts` | Takeout/delivery |

---

*Document generated during system audit on February 1, 2026*
