-- ============================================================================
-- BUCR Phase 1–10: Economics, no-show split, elite tier, venueType,
-- per-cover fee, platform revenue, gifting, menu availability, reliability score
--
-- NOTE: The SubscriptionTier enum rename (premium → elite) is done via
-- type recreation to avoid the PostgreSQL "new enum value must be committed"
-- restriction. The USING clause remaps existing 'premium' rows to 'elite'.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. SubscriptionTier: rename 'premium' → 'elite' (type recreation approach)
-- ---------------------------------------------------------------------------

-- Temporarily drop the default so the column can change type
ALTER TABLE "vendors"
  ALTER COLUMN "subscription_tier" DROP DEFAULT;
ALTER TABLE "vendor_subscriptions"
  ALTER COLUMN "tier" DROP DEFAULT;

-- Create the new enum type
CREATE TYPE "SubscriptionTier_new" AS ENUM ('basic', 'pro', 'elite');

-- Migrate vendors
ALTER TABLE "vendors"
  ALTER COLUMN "subscription_tier" TYPE "SubscriptionTier_new"
    USING CASE WHEN "subscription_tier"::text = 'premium' THEN 'elite'
               ELSE "subscription_tier"::text
          END::"SubscriptionTier_new";

-- Migrate vendor_subscriptions
ALTER TABLE "vendor_subscriptions"
  ALTER COLUMN "tier" TYPE "SubscriptionTier_new"
    USING CASE WHEN "tier"::text = 'premium' THEN 'elite'
               ELSE "tier"::text
          END::"SubscriptionTier_new";

-- Drop old type and rename new type
DROP TYPE "SubscriptionTier";
ALTER TYPE "SubscriptionTier_new" RENAME TO "SubscriptionTier";

-- Restore defaults
ALTER TABLE "vendors"
  ALTER COLUMN "subscription_tier" SET DEFAULT 'basic';
ALTER TABLE "vendor_subscriptions"
  ALTER COLUMN "tier" SET DEFAULT 'basic';

-- ---------------------------------------------------------------------------
-- 2. VenueType enum and column on vendors (Phase 6)
-- ---------------------------------------------------------------------------
CREATE TYPE "VenueType" AS ENUM ('fine_dining', 'upscale_casual', 'lounge', 'casual');
ALTER TABLE "vendors"
  ADD COLUMN IF NOT EXISTS "venue_type" "VenueType" NOT NULL DEFAULT 'upscale_casual';

-- ---------------------------------------------------------------------------
-- 3. Vendor reliability score fields (Phase 10)
-- ---------------------------------------------------------------------------
ALTER TABLE "vendors"
  ADD COLUMN IF NOT EXISTS "reliability_score"      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "book_with_confidence"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "badge_qualifying_since" TIMESTAMP(3);

-- ---------------------------------------------------------------------------
-- 4. Menu: temporary unavailability ("86") field (Phase 9)
-- ---------------------------------------------------------------------------
ALTER TABLE "menus"
  ADD COLUMN IF NOT EXISTS "unavailable_until" TIMESTAMP(3);

-- ---------------------------------------------------------------------------
-- 5. AuditLog: add vendor_id column (extended audit)
-- ---------------------------------------------------------------------------
ALTER TABLE "audit_logs"
  ADD COLUMN IF NOT EXISTS "vendor_id" TEXT;

-- 6. PaymentPurpose: cover_fee was already added during a prior partial migration run;
--    ADD VALUE IF NOT EXISTS is a no-op when the value already exists (PostgreSQL 9.3+).
ALTER TYPE "PaymentPurpose" ADD VALUE IF NOT EXISTS 'cover_fee';

-- ---------------------------------------------------------------------------
-- 7. GiftStatus enum
-- ---------------------------------------------------------------------------
CREATE TYPE "GiftStatus" AS ENUM ('pending', 'claimed', 'expired');

-- ---------------------------------------------------------------------------
-- 8. PlatformRevenueType enum
-- ---------------------------------------------------------------------------
CREATE TYPE "PlatformRevenueType" AS ENUM (
  'credit_spread',
  'breakage',
  'cover_fee',
  'gift_fee',
  'noshow_platform_share',
  'subscription',
  'featured'
);

-- ---------------------------------------------------------------------------
-- 9. CoverCharge table (Phase 6)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "cover_charges" (
  "id"             TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "vendor_id"      TEXT        NOT NULL,
  "reservation_id" TEXT        NOT NULL,
  "party_size"     INTEGER     NOT NULL,
  "fee_charged"    INTEGER     NOT NULL,
  "venue_type"     TEXT        NOT NULL,
  "tier_at_time"   TEXT        NOT NULL,
  "billing_month"  TEXT        NOT NULL,
  "status"         TEXT        NOT NULL DEFAULT 'accrued',
  "invoiced_at"    TIMESTAMP(3),
  "paid_at"        TIMESTAMP(3),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cover_charges_pkey"             PRIMARY KEY ("id"),
  CONSTRAINT "cover_charges_reservation_id_key" UNIQUE ("reservation_id")
);

CREATE INDEX IF NOT EXISTS "cover_charges_vendor_id_idx"             ON "cover_charges"("vendor_id");
CREATE INDEX IF NOT EXISTS "cover_charges_billing_month_idx"         ON "cover_charges"("billing_month");
CREATE INDEX IF NOT EXISTS "cover_charges_status_idx"                ON "cover_charges"("status");
CREATE INDEX IF NOT EXISTS "cover_charges_vendor_billing_status_idx" ON "cover_charges"("vendor_id","billing_month","status");

ALTER TABLE "cover_charges"
  ADD CONSTRAINT "cover_charges_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cover_charges"
  ADD CONSTRAINT "cover_charges_reservation_id_fkey"
    FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 10. PlatformRevenue table (Phase 7)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "platform_revenue" (
  "id"             TEXT                   NOT NULL DEFAULT gen_random_uuid()::text,
  "type"           "PlatformRevenueType"  NOT NULL,
  "amount_ngn"     INTEGER                NOT NULL,
  "amount_credits" INTEGER,
  "source_type"    TEXT                   NOT NULL,
  "source_id"      TEXT                   NOT NULL,
  "vendor_id"      TEXT,
  "user_id"        TEXT,
  "billing_month"  TEXT                   NOT NULL,
  "recognized_at"  TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_revenue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "platform_revenue_type_idx"          ON "platform_revenue"("type");
CREATE INDEX IF NOT EXISTS "platform_revenue_billing_month_idx" ON "platform_revenue"("billing_month");
CREATE INDEX IF NOT EXISTS "platform_revenue_vendor_id_idx"     ON "platform_revenue"("vendor_id");
CREATE INDEX IF NOT EXISTS "platform_revenue_type_month_idx"    ON "platform_revenue"("type","billing_month");

ALTER TABLE "platform_revenue"
  ADD CONSTRAINT "platform_revenue_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 11. Gift table (Phase 8)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "gifts" (
  "id"                TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "sender_id"         TEXT         NOT NULL,
  "recipient_user_id" TEXT,
  "recipient_email"   TEXT,
  "recipient_phone"   TEXT,
  "credit_amount"     INTEGER      NOT NULL,
  "fee_credits"       INTEGER      NOT NULL,
  "message"           TEXT,
  "status"            "GiftStatus" NOT NULL DEFAULT 'pending',
  "expires_at"        TIMESTAMP(3) NOT NULL,
  "claimed_at"        TIMESTAMP(3),
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gifts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "gifts_sender_id_idx"         ON "gifts"("sender_id");
CREATE INDEX IF NOT EXISTS "gifts_recipient_user_id_idx" ON "gifts"("recipient_user_id");
CREATE INDEX IF NOT EXISTS "gifts_status_idx"            ON "gifts"("status");
CREATE INDEX IF NOT EXISTS "gifts_expires_at_idx"        ON "gifts"("expires_at");

ALTER TABLE "gifts"
  ADD CONSTRAINT "gifts_sender_id_fkey"
    FOREIGN KEY ("sender_id") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gifts"
  ADD CONSTRAINT "gifts_recipient_user_id_fkey"
    FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 12. New indexes on existing tables
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "vendors_venue_type_idx"      ON "vendors"("venue_type");
CREATE INDEX IF NOT EXISTS "menus_is_available_idx"      ON "menus"("is_available");
CREATE INDEX IF NOT EXISTS "menus_unavailable_until_idx" ON "menus"("unavailable_until");
CREATE INDEX IF NOT EXISTS "audit_logs_vendor_id_idx"    ON "audit_logs"("vendor_id");
