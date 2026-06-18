# BUCR Platform - Cleanup & Refactoring Guide

**Date:** February 1, 2026

---

## Overview

This document provides specific recommendations for cleaning up redundant files, consolidating code, and refactoring for optimal performance.

---

## 1. Files to Remove

### High Priority - Unused/Redundant

| File/Directory | Reason | Action |
|----------------|--------|--------|
| `apps/user-portal/` | Mobile app handles all user functionality. Placeholder web portal not in use. | **DELETE entire directory** |
| `apps/mobile-app/src/navigation/` | Old React Navigation files. App uses Expo Router (`app/` directory). | **DELETE entire directory** |
| `apps/mobile-app/src/screens/auth/` | Old screen files. Auth screens now in `app/(auth)/`. | **DELETE entire directory** |
| `apps/mobile-app/App.tsx` | Entry point for old navigation. Expo Router uses `app/_layout.tsx`. | **DELETE file** |
| `coverage/` | Empty coverage directory. Regenerated during tests. | **DELETE directory** |

### Commands to Execute

```bash
# Navigate to project root
cd /Users/grade/Desktop/official_bucr

# Remove unused user portal
rm -rf apps/user-portal/

# Remove old mobile navigation (verify Expo Router is working first!)
rm -rf apps/mobile-app/src/navigation/
rm -rf apps/mobile-app/src/screens/

# Remove old entry point (verify app works without it first!)
rm apps/mobile-app/App.tsx

# Remove empty coverage
rm -rf coverage/
```

**⚠️ WARNING:** Before deleting mobile app files, ensure:
1. The app runs correctly with Expo Router
2. No imports reference these files
3. Test the app thoroughly after deletion

---

## 2. Duplicate Code to Consolidate

### 2.1 UI Components (Admin & Vendor Portals)

Both portals have nearly identical components:

| Component | Admin Portal | Vendor Portal | Action |
|-----------|--------------|---------------|--------|
| StatCard | `src/components/ui/stat-card.tsx` | `src/components/ui/stat-card.tsx` | Move to `packages/ui/` |
| PageHeader | `src/components/ui/page-header.tsx` | `src/components/ui/page-header.tsx` | Move to `packages/ui/` |
| DataTable | `src/components/ui/data-table.tsx` | `src/components/ui/data-table.tsx` | Move to `packages/ui/` |
| ThemeToggle | `src/components/ui/theme-toggle.tsx` | `src/components/ui/theme-toggle.tsx` | Move to `packages/ui/` |
| Input | `src/components/ui/input.tsx` | `src/components/ui/input.tsx` | Move to `packages/ui/` |
| Button | `src/components/ui/button.tsx` | `src/components/ui/button.tsx` | Move to `packages/ui/` |
| Skeleton | - | `src/components/ui/skeleton.tsx` | Move to `packages/ui/` |

#### Implementation Steps

```bash
# 1. Create shared UI package
mkdir -p packages/ui/src/components
mkdir -p packages/ui/src/styles

# 2. Create package.json
cat > packages/ui/package.json << 'EOF'
{
  "name": "@bucr/ui",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "lucide-react": "^0.300.0"
  }
}
EOF

# 3. Move components and update imports in both portals
```

### 2.2 API Client Pattern

Both portals have similar API client setup:

```
apps/admin-portal/src/lib/api.ts  (272 lines)
apps/vendor-portal/src/lib/api.ts (473 lines)
apps/mobile-app/src/lib/api.ts    (323 lines)
```

#### Recommendation

Create a shared API client factory:

```typescript
// packages/api-client/src/create-client.ts
export function createApiClient(config: {
  baseURL: string;
  getToken: () => Promise<string | null>;
  onTokenRefresh: (newToken: string) => void;
  onLogout: () => void;
}) {
  const client = axios.create({ baseURL: config.baseURL });
  
  // Add interceptors
  client.interceptors.request.use(/* ... */);
  client.interceptors.response.use(/* ... */);
  
  return client;
}
```

### 2.3 Date Formatting Utilities

Duplicate implementations across portals:

```
apps/admin-portal/src/lib/utils.ts   - formatDate, formatDateTime
apps/vendor-portal/src/lib/utils.ts  - formatDate, formatDateTime
```

#### Recommendation

Move to shared package:

```typescript
// packages/utils/src/date.ts
export function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  try {
    return format(new Date(date), 'MMM d, yyyy');
  } catch {
    return '-';
  }
}
```

---

## 3. Code Refactoring Recommendations

### 3.1 Mobile App - API Response Handling

**Current Problem:** Inconsistent handling of paginated API responses

**Location:** Multiple files in `apps/mobile-app/app/(tabs)/`

**Fix:**

```typescript
// apps/mobile-app/src/lib/api-utils.ts (NEW FILE)
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export function extractData<T>(response: any): T[] {
  // Handle direct array
  if (Array.isArray(response)) return response;
  
  // Handle { data: [...] }
  if (Array.isArray(response?.data)) return response.data;
  
  // Handle { data: { items: [...] } }
  if (Array.isArray(response?.data?.items)) return response.data.items;
  
  return [];
}

export function extractPagination(response: any) {
  return response?.data?.pagination ?? {
    total: extractData(response).length,
    page: 1,
    limit: 20,
    pages: 1,
  };
}
```

### 3.2 Backend - Add Missing Credit Expiry Job

**Current Problem:** Credits have `expiresAt` but no automated expiry process

**Fix:** Add a cron job or scheduled function

```typescript
// src/services/credit.service.ts - ADD THIS FUNCTION

export async function processExpiredCredits() {
  const now = new Date();
  
  // Find unexpired transactions that have passed their expiry date
  const expiredTransactions = await db.creditTransaction.findMany({
    where: {
      type: 'purchase',
      expiresAt: { lte: now },
      expiredAt: null,
    },
    include: {
      user: { select: { id: true, creditsBalance: true, email: true } },
    },
  });
  
  for (const transaction of expiredTransactions) {
    // Calculate remaining credits from this purchase
    // This is simplified - actual implementation needs to track usage per transaction
    await db.$transaction([
      db.creditTransaction.update({
        where: { id: transaction.id },
        data: { expiredAt: now },
      }),
      // Create expiry record
      db.creditTransaction.create({
        data: {
          userId: transaction.userId,
          type: 'expire',
          amount: -transaction.amount, // Full amount for simplicity
          balanceAfter: transaction.user.creditsBalance - transaction.amount,
          referenceType: 'credit_transaction',
          referenceId: transaction.id,
          description: 'Credits expired',
        },
      }),
    ]);
    
    // Send notification email
    // await sendCreditExpiryEmail(transaction.user.email, transaction.amount);
  }
  
  return { processed: expiredTransactions.length };
}
```

### 3.3 Backend - Implement Credit Margin

**Current Problem:** Credits sold at ₦100 = 1 credit (no margin)

**Specification:** Should be ₦120 = 1 credit (17% margin)

**Fix:**

```typescript
// src/lib/config.ts - UPDATE
credits: {
  valueNgn: 100,           // 1 credit = ₦100 value
  purchasePriceNgn: 120,   // ₦120 = 1 credit (17% margin)
  // ...
}

// src/services/payment.service.ts - UPDATE processCompletedPayment
case 'credit_purchase': {
  // Current: credits = amountKobo / (100 * 100)
  // Fixed:   credits = amountKobo / (120 * 100)
  const credits = Math.floor(payment.amountKobo / (config.credits.purchasePriceNgn * 100));
  // ...
}
```

### 3.4 Add Request Caching Headers

**Current Problem:** No cache headers on GET requests

**Fix:**

```typescript
// src/lib/utils/api-response.ts - UPDATE successResponse
export function successResponse<T>(
  data: T, 
  options?: { 
    status?: number;
    cache?: { maxAge: number; staleWhileRevalidate?: number };
  }
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (options?.cache) {
    const swr = options.cache.staleWhileRevalidate ?? 60;
    headers['Cache-Control'] = `public, max-age=${options.cache.maxAge}, stale-while-revalidate=${swr}`;
  }
  
  return new Response(JSON.stringify({ success: true, data }), {
    status: options?.status ?? 200,
    headers,
  });
}
```

---

## 4. Performance Optimizations

### 4.1 Database Query Optimization

Add indexes for frequently queried fields:

```prisma
// prisma/schema.prisma - ADD INDEXES

model Reservation {
  // ... existing fields
  
  @@index([date, status])           // For vendor dashboard queries
  @@index([userId, status])         // For user reservation list
  @@index([vendorId, date])         // For vendor calendar view
}

model CreditTransaction {
  // ... existing fields
  
  @@index([userId, createdAt])      // For transaction history
  @@index([expiresAt, expiredAt])   // For expiry processing
}

model Review {
  // ... existing fields
  
  @@index([vendorId, createdAt])    // For vendor reviews list
  @@index([userId, createdAt])      // For user reviews history
}
```

### 4.2 Image Lazy Loading

```typescript
// apps/mobile-app - Add lazy loading for vendor images
import { Image } from 'expo-image';

// Instead of:
<Image source={{ uri: vendor.logo }} style={styles.logo} />

// Use:
<Image 
  source={{ uri: vendor.logo }} 
  style={styles.logo}
  placeholder={require('../assets/placeholder.png')}
  transition={200}
  contentFit="cover"
/>
```

### 4.3 API Response Compression

```typescript
// next.config.js - ADD
module.exports = {
  compress: true,
  // ...
}
```

---

## 5. Security Improvements

### 5.1 Add Input Sanitization

```bash
npm install isomorphic-dompurify
```

```typescript
// src/lib/utils/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input);
}

export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}
```

### 5.2 Add Rate Limit Headers

```typescript
// src/lib/middleware/rate-limiter.ts - UPDATE
export function rateLimitResponse(remaining: number, reset: number) {
  return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString(),
      'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
    },
  });
}
```

---

## 6. Testing Improvements

### 6.1 Add Missing Test Coverage

Priority areas for additional tests:

| Service | Current Coverage | Recommended |
|---------|-----------------|-------------|
| credit.service.ts | Unit tests exist | Add edge cases |
| reservation.service.ts | Unit tests exist | Add concurrent booking tests |
| payment.service.ts | Unit tests exist | Add webhook failure scenarios |
| email.service.ts | No tests | Add template rendering tests |
| sms.service.ts | No tests | Add delivery confirmation tests |

### 6.2 Add E2E Test for Full Booking Flow

```typescript
// tests/e2e/booking-flow.test.ts
test('complete booking flow', async () => {
  // 1. User purchases credits
  // 2. User browses vendors
  // 3. User makes reservation
  // 4. Vendor verifies and checks in
  // 5. User receives refund + bonus
  // 6. User writes review
});
```

---

## 7. Documentation Updates Needed

| Document | Status | Action |
|----------|--------|--------|
| README.md | Exists | Update with current setup instructions |
| API documentation | Missing | Generate from OpenAPI/Swagger |
| Mobile app setup | Missing | Add Expo development guide |
| Deployment guide | Missing | Add production deployment steps |
| Environment variables | Partial | Document all required env vars |

---

## 8. Dependency Updates

Check for outdated dependencies:

```bash
# Check outdated packages
npm outdated

# Recommended updates:
# - next: 14.0.4 → 14.x.x (latest)
# - @tanstack/react-query: 5.17.19 → 5.x.x (latest)
# - expo: current → latest SDK
```

---

## Implementation Priority

### Phase 1 (Immediate - This Week)
1. ✅ Delete unused user-portal
2. ✅ Delete old mobile navigation files (after verification)
3. ⬜ Implement credit purchase margin (revenue impact)
4. ⬜ Add credit expiry cron job

### Phase 2 (Short-term - 2 Weeks)
1. ⬜ Create shared UI package
2. ⬜ Consolidate API client
3. ⬜ Add missing indexes
4. ⬜ Standardize API response handling

### Phase 3 (Medium-term - 1 Month)
1. ⬜ Add comprehensive E2E tests
2. ⬜ Generate API documentation
3. ⬜ Implement push notifications
4. ⬜ Security hardening

---

*Document created during system audit on February 1, 2026*
