-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'suspend', 'restore', 'adjust_credits', 'verify', 'export');

-- CreateEnum
CREATE TYPE "FeaturedType" AS ENUM ('restaurant', 'experience', 'offer');

-- AlterEnum
ALTER TYPE "CreditStatus" ADD VALUE 'pending';

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'owner_id';

-- DropIndex
DROP INDEX "credit_transactions_status_idx";

-- AlterTable
ALTER TABLE "guest_profiles" ADD COLUMN     "no_show_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "is_reported" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "report_reason" TEXT,
ADD COLUMN     "reported_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'user';

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "featured_at" TIMESTAMP(3),
ADD COLUMN     "featured_until" TIMESTAMP(3),
ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "promo_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "promo_message" TEXT,
ADD COLUMN     "show_achievements" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_experiences" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_gallery" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_menu" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_reviews" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_special_offers" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "special_offers" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "video_url" TEXT,
    "discount_type" TEXT,
    "discount_value" INTEGER,
    "terms" TEXT,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "special_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "otp" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT,
    "user_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featured_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FeaturedType" NOT NULL,
    "description" TEXT,
    "credits_cost" INTEGER NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featured_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featured_spots" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "type" "FeaturedType" NOT NULL,
    "experience_id" TEXT,
    "offer_id" TEXT,
    "credits_paid" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "added_by_admin" BOOLEAN NOT NULL DEFAULT false,
    "admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featured_spots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "special_offers_vendor_id_idx" ON "special_offers"("vendor_id");

-- CreateIndex
CREATE INDEX "special_offers_is_active_idx" ON "special_offers"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE INDEX "verification_tokens_user_id_type_idx" ON "verification_tokens"("user_id", "type");

-- CreateIndex
CREATE INDEX "verification_tokens_expires_at_idx" ON "verification_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "audit_logs_admin_id_idx" ON "audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_resource_action_idx" ON "audit_logs"("resource", "action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "featured_spots_vendor_id_idx" ON "featured_spots"("vendor_id");

-- CreateIndex
CREATE INDEX "featured_spots_type_idx" ON "featured_spots"("type");

-- CreateIndex
CREATE INDEX "featured_spots_start_date_end_date_idx" ON "featured_spots"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "featured_spots_is_active_idx" ON "featured_spots"("is_active");

-- CreateIndex
CREATE INDEX "achievements_vendor_id_idx" ON "achievements"("vendor_id");

-- CreateIndex
CREATE INDEX "credit_transactions_user_id_created_at_idx" ON "credit_transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "credit_transactions_expires_at_expired_at_idx" ON "credit_transactions"("expires_at", "expired_at");

-- CreateIndex
CREATE INDEX "experiences_vendor_id_idx" ON "experiences"("vendor_id");

-- CreateIndex
CREATE INDEX "experiences_is_active_idx" ON "experiences"("is_active");

-- CreateIndex
CREATE INDEX "favorites_user_id_idx" ON "favorites"("user_id");

-- CreateIndex
CREATE INDEX "gallery_images_vendor_id_idx" ON "gallery_images"("vendor_id");

-- CreateIndex
CREATE INDEX "invitations_reservation_id_idx" ON "invitations"("reservation_id");

-- CreateIndex
CREATE INDEX "menu_categories_vendor_id_idx" ON "menu_categories"("vendor_id");

-- CreateIndex
CREATE INDEX "menus_vendor_id_idx" ON "menus"("vendor_id");

-- CreateIndex
CREATE INDEX "reservations_date_status_idx" ON "reservations"("date", "status");

-- CreateIndex
CREATE INDEX "reservations_user_id_status_idx" ON "reservations"("user_id", "status");

-- CreateIndex
CREATE INDEX "reservations_vendor_id_date_status_idx" ON "reservations"("vendor_id", "date", "status");

-- CreateIndex
CREATE INDEX "reservations_reference_idx" ON "reservations"("reference");

-- CreateIndex
CREATE INDEX "reviews_user_id_idx" ON "reviews"("user_id");

-- CreateIndex
CREATE INDEX "vendor_branches_vendor_id_idx" ON "vendor_branches"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_subscriptions_expires_at_status_idx" ON "vendor_subscriptions"("expires_at", "status");

-- CreateIndex
CREATE INDEX "vendors_verification_status_deleted_at_idx" ON "vendors"("verification_status", "deleted_at");

-- CreateIndex
CREATE INDEX "vendors_slug_idx" ON "vendors"("slug");

-- CreateIndex
CREATE INDEX "waitlist_vendor_id_idx" ON "waitlist"("vendor_id");

-- CreateIndex
CREATE INDEX "waitlist_user_id_idx" ON "waitlist"("user_id");

-- CreateIndex
CREATE INDEX "waitlist_status_idx" ON "waitlist"("status");

-- AddForeignKey
ALTER TABLE "special_offers" ADD CONSTRAINT "special_offers_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_spots" ADD CONSTRAINT "featured_spots_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_spots" ADD CONSTRAINT "featured_spots_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "featured_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
