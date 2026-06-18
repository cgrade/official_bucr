# BUCR QA Audit — Execution Plan (By Priority)

## Phase 1: Security & Data Integrity (Week 1)

**1.1 Add `role` to User model**
- Add `role UserRole @default(user)` to `User` in `prisma/schema.prisma`
- Set role during registration in `auth/register/route.ts` and `auth/vendor/register/route.ts`
- Include role in JWT payload; update `authenticateRequest` to verify from DB
- Run migration; backfill existing users (vendors→vendor, admins→admin)

**1.2 Migrate token store to Redis**
- Replace in-memory `Map` in `token.service.ts` with Redis `SETEX` operations
- Keep memory fallback for dev; remove `cleanupExpiredTokens()`

**1.3 Fix order_payment handler**
- In `payment.service.ts:416`, call `confirmOrderPayment()` in the `order_payment` case
- Store orderId in payment.metadata during initialization

## Phase 2: Broken Mobile Flows (Week 1-2)

**2.1 Fix mobile API mismatches**
- `favoritesApi.remove`: Change to `DELETE /users/favorites/{id}` or fix backend to accept vendorId query
- `usersApi.updateProfile`: Change `PUT` → `PATCH` in mobile `api.ts`

**2.2 Add ordersApi to mobile**
- Create `GET /api/users/orders` route
- Add `ordersApi` to `apps/mobile-app/src/lib/api.ts` (create, getAll, getById, cancel)
- Wire up `settings/orders.tsx` and `order/[id].tsx`

**2.3 Fix vendor portal login response**
- Update `authApi.login` in `apps/vendor-portal/src/lib/api.ts` to match backend shape `{tokens: {accessToken, refreshToken}}`
- Update `auth.store.ts` token extraction

## Phase 3: Notifications & Guest Profiles (Week 2)

**3.1 Wire up email/SMS notifications**
- Call `sendReservationConfirmation` in `createReservation`
- Call `sendReservationReminder` 24h before (scheduling needed)
- Call `sendOrderConfirmation` in `createOrder`
- Call `sendCreditExpiryReminder` from credit expiry cron

**3.2 Update GuestProfile on check-in/no-show**
- In `checkInReservation`: increment `visitCount`, set `lastVisit`, add `totalSpent`
- In `markNoShow`: increment `noShowCount`, set `lastVisit`

**3.3 Add credit adjustment functions**
- Add `adjustUserCredits()` and `adjustVendorCredits()` to `credit.service.ts`
- Wire to admin credit adjustment routes

## Phase 4: Performance — DB Indexes (Week 2-3)

**4.1 Add missing indexes** (single migration)
```
VendorBranch:  @@index([vendorId])
MenuCategory:  @@index([vendorId])
Menu:          @@index([vendorId])
GalleryImage:  @@index([vendorId])
Experience:    @@index([vendorId]), @@index([isActive])
VendorDocument:@@index([vendorId])
GuestProfile:  @@index([vendorId])
Achievement:   @@index([vendorId])
SpecialOffer:  @@index([vendorId]), @@index([isActive])
Invitation:    @@index([reservationId])
Waitlist:      @@index([vendorId]), @@index([status])
Review:        @@index([userId])
Favorite:      @@index([userId])
VendorSubscription: @@index([subscriptionExpiresAt, subscriptionTier])
```
- Run `npx prisma migrate dev --name add-missing-indexes`

## Phase 5: Cron Jobs & Missing API Endpoints (Week 3)

**5.1 Set up cron scheduler**
- Add `vercel.json` cron config for `/api/cron/credits` (daily)
- Add cron route for `checkExpiredSubscriptions`
- Add cron route for reservation reminders

**5.2 Add missing API endpoints**
- `POST /waitlist` — join waitlist
- `DELETE /waitlist/[id]` — leave waitlist
- `POST /reservations/[id]/invite` — invite guests
- `GET /experiences` — add vendorId/featured query filters

## Phase 6: Service Refactoring (Week 3-4)

**6.1 Extract inline route logic to services**
- Create `review.service.ts` (create, getByVendor, respond, report)
- Create `guest-profile.service.ts` (getAll, getById, updateNotes)
- Create `experience.service.ts` (getAll, create, update, toggleActive)

**6.2 Remove unused functions**
- Remove `generateQRCodeBuffer` from `qrcode.service.ts`
- Remove `uploadFromUrl` from `upload.service.ts`

## Phase 7: Frontend Completeness (Week 4)

**7.1 Vendor Portal**
- Add branch management page (`/branches`)
- Wire dashboard change values to real analytics data
- Wire notification bell to real count
- Add loading skeletons to all pages

**7.2 Admin Portal**
- Add branch management page
- Add audit log viewer page
- Verify reports export (CSV/PDF) works

**7.3 Mobile App**
- Add `waitlistApi` to `api.ts`
- Add phone-based password reset route
- Add push notification listener (Expo Notifications)
- Configure Paystack deep-link callback
- Add credit-insufficient UI in booking flow
- Consolidate duplicate settings screens

---

## Quick Wins (Can do immediately)

| Task | Effort | Impact |
|------|--------|--------|
| Change `PUT` → `PATCH` in mobile api.ts | 1 line | Fixes profile update |
| Fix favorites remove URL | 2 lines | Fixes favorites removal |
| Call confirmOrderPayment in payment handler | 5 lines | Fixes order payment flow |
| Add vendorId filter to /experiences route | 3 lines | Fixes mobile experience browsing |
