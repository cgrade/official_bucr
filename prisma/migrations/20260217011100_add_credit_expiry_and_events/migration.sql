-- CreateEnum
CREATE TYPE "CreditStatus" AS ENUM ('active', 'expired', 'redeemed');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('dining', 'concert', 'wedding', 'corporate', 'festival', 'other');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('draft', 'published', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "EventTicketStatus" AS ENUM ('pending', 'confirmed', 'checked_in', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "BundleStatus" AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- AlterTable: Add credit expiry fields to credit_transactions
ALTER TABLE "credit_transactions" ADD COLUMN "status" "CreditStatus" NOT NULL DEFAULT 'active';
ALTER TABLE "credit_transactions" ADD COLUMN "remaining_amount" INTEGER;

-- CreateIndex
CREATE INDEX "credit_transactions_status_idx" ON "credit_transactions"("status");

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "location" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "capacity" INTEGER NOT NULL,
    "ticket_price" INTEGER NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" "EventCategory" NOT NULL DEFAULT 'dining',
    "status" "EventStatus" NOT NULL DEFAULT 'draft',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "bundle_discount" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_tickets" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "total_credits" INTEGER NOT NULL,
    "status" "EventTicketStatus" NOT NULL DEFAULT 'pending',
    "qr_code" TEXT,
    "checked_in_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_bundles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "reservation_id" TEXT,
    "total_credits" INTEGER NOT NULL,
    "deposit_credits" INTEGER NOT NULL,
    "bonus_credits" INTEGER NOT NULL DEFAULT 0,
    "status" "BundleStatus" NOT NULL DEFAULT 'pending',
    "qr_code" TEXT,
    "checked_in_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_vendor_id_idx" ON "events"("vendor_id");
CREATE INDEX "events_date_idx" ON "events"("date");
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "event_tickets_event_id_idx" ON "event_tickets"("event_id");
CREATE INDEX "event_tickets_user_id_idx" ON "event_tickets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_bundles_reservation_id_key" ON "event_bundles"("reservation_id");
CREATE INDEX "event_bundles_event_id_idx" ON "event_bundles"("event_id");
CREATE INDEX "event_bundles_user_id_idx" ON "event_bundles"("user_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_tickets" ADD CONSTRAINT "event_tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_tickets" ADD CONSTRAINT "event_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_bundles" ADD CONSTRAINT "event_bundles_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_bundles" ADD CONSTRAINT "event_bundles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_bundles" ADD CONSTRAINT "event_bundles_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: Set existing purchase credits to active with remaining_amount
UPDATE "credit_transactions"
SET "remaining_amount" = "amount",
    "status" = 'active'
WHERE "type" = 'purchase' AND "amount" > 0 AND "expired_at" IS NULL;

-- Backfill: Set already-expired credits
UPDATE "credit_transactions"
SET "status" = 'expired',
    "remaining_amount" = 0
WHERE "expired_at" IS NOT NULL;
