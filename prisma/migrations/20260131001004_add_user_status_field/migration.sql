-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'vendor', 'admin');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('basic', 'pro', 'premium');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('pending', 'confirmed', 'checked_in', 'completed', 'no_show', 'cancelled');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('pickup', 'delivery');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('purchase', 'refund', 'bonus', 'forfeit', 'redeem', 'expire', 'adjustment');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('cac', 'tin', 'food_safety');

-- CreateEnum
CREATE TYPE "DeliveryFeeType" AS ENUM ('flat', 'zone_based');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('waiting', 'notified', 'claimed', 'expired');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'declined');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'banned');

-- CreateEnum
CREATE TYPE "PaymentChannel" AS ENUM ('card', 'bank', 'bank_transfer', 'ussd', 'qr', 'mobile_money');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('credit_purchase', 'subscription', 'order_payment');

-- CreateEnum
CREATE TYPE "VendorCreditType" AS ENUM ('redemption', 'no_show_share', 'review_response', 'featured_spend', 'marketing_spend', 'withdrawal', 'adjustment', 'bonus');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "suspended_reason" TEXT,
    "credits_balance" INTEGER NOT NULL DEFAULT 0,
    "dietary_restrictions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seating_preferences" TEXT,
    "special_occasions" JSONB,
    "referral_code" TEXT,
    "referred_by" TEXT,
    "push_token" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "phone_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'sub_admin',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "cuisine_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subscription_tier" "SubscriptionTier" NOT NULL DEFAULT 'basic',
    "subscription_expires_at" TIMESTAMP(3),
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "bank_name" TEXT,
    "bank_account_number" TEXT,
    "bank_account_name" TEXT,
    "paystack_link" TEXT,
    "delivery_enabled" BOOLEAN NOT NULL DEFAULT false,
    "delivery_fee_type" "DeliveryFeeType",
    "delivery_flat_fee" INTEGER,
    "delivery_zones" JSONB,
    "min_delivery_order" INTEGER,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "total_bookings" INTEGER NOT NULL DEFAULT 0,
    "no_show_count" INTEGER NOT NULL DEFAULT 0,
    "average_rating" DOUBLE PRECISION,
    "total_reviews" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_branches" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "operating_hours" JSONB,
    "phone" TEXT,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_main_branch" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vendor_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_documents" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_categories" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "category_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "image" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "available_for_dine_in" BOOLEAN NOT NULL DEFAULT true,
    "available_for_takeout" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_images" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "category" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "experience_id" TEXT,
    "reference" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "party_size" INTEGER NOT NULL,
    "special_requests" TEXT,
    "occasion" TEXT,
    "credits_deposited" INTEGER NOT NULL,
    "credits_refunded" INTEGER NOT NULL DEFAULT 0,
    "bonus_credits" INTEGER NOT NULL DEFAULT 0,
    "status" "ReservationStatus" NOT NULL DEFAULT 'pending',
    "qr_code" TEXT,
    "pin" TEXT,
    "checked_in_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "inviter_id" TEXT NOT NULL,
    "invitee_name" TEXT NOT NULL,
    "invitee_contact" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "desired_date" TIMESTAMP(3) NOT NULL,
    "desired_time" TEXT NOT NULL,
    "party_size" INTEGER NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'waiting',
    "notified_at" TIMESTAMP(3),
    "claim_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "takeout_orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "reference" TEXT NOT NULL,
    "order_type" "OrderType" NOT NULL,
    "items" JSONB NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "delivery_fee" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "delivery_address" TEXT,
    "delivery_city" TEXT,
    "delivery_notes" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "scheduled_time" TIMESTAMP(3),
    "payment_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "payment_confirmed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "takeout_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_wallets" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "total_earned" INTEGER NOT NULL DEFAULT 0,
    "total_spent" INTEGER NOT NULL DEFAULT 0,
    "total_withdrawn" INTEGER NOT NULL DEFAULT 0,
    "pending_withdrawal" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_credit_transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "type" "VendorCreditType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "bank_name" TEXT,
    "bank_account" TEXT,
    "withdrawal_status" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "paystack_reference" TEXT,
    "amount_paid_kobo" INTEGER,
    "expires_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "reservation_id" TEXT,
    "order_id" TEXT,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "credits_earned" INTEGER NOT NULL DEFAULT 0,
    "vendor_response" TEXT,
    "responded_at" TIMESTAMP(3),
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "credits_required" INTEGER NOT NULL,
    "capacity" INTEGER,
    "duration" INTEGER,
    "available_dates" JSONB,
    "available_days" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "start_time" TEXT,
    "end_time" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "badge_type" TEXT,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_profiles" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "visit_count" INTEGER NOT NULL DEFAULT 0,
    "total_spend" INTEGER NOT NULL DEFAULT 0,
    "last_visit" TIMESTAMP(3),
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferences" JSONB,
    "is_vip" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "vendor_id" TEXT,
    "channel" "PaymentChannel",
    "purpose" "PaymentPurpose" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "amount_kobo" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "reference" TEXT NOT NULL,
    "provider_reference" TEXT,
    "metadata" JSONB,
    "bank_name" TEXT,
    "account_number" TEXT,
    "account_name" TEXT,
    "paid_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_subscriptions" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "amount_paid_kobo" INTEGER NOT NULL,
    "payment_id" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_slug_key" ON "vendors"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_documents_vendor_id_type_key" ON "vendor_documents"("vendor_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_reference_key" ON "reservations"("reference");

-- CreateIndex
CREATE INDEX "reservations_user_id_idx" ON "reservations"("user_id");

-- CreateIndex
CREATE INDEX "reservations_vendor_id_idx" ON "reservations"("vendor_id");

-- CreateIndex
CREATE INDEX "reservations_date_idx" ON "reservations"("date");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "takeout_orders_reference_key" ON "takeout_orders"("reference");

-- CreateIndex
CREATE INDEX "takeout_orders_user_id_idx" ON "takeout_orders"("user_id");

-- CreateIndex
CREATE INDEX "takeout_orders_vendor_id_idx" ON "takeout_orders"("vendor_id");

-- CreateIndex
CREATE INDEX "takeout_orders_status_idx" ON "takeout_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_wallets_vendor_id_key" ON "vendor_wallets"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_credit_transactions_wallet_id_idx" ON "vendor_credit_transactions"("wallet_id");

-- CreateIndex
CREATE INDEX "vendor_credit_transactions_type_idx" ON "vendor_credit_transactions"("type");

-- CreateIndex
CREATE INDEX "vendor_credit_transactions_created_at_idx" ON "vendor_credit_transactions"("created_at");

-- CreateIndex
CREATE INDEX "credit_transactions_user_id_idx" ON "credit_transactions"("user_id");

-- CreateIndex
CREATE INDEX "credit_transactions_type_idx" ON "credit_transactions"("type");

-- CreateIndex
CREATE INDEX "credit_transactions_expires_at_idx" ON "credit_transactions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_reservation_id_key" ON "reviews"("reservation_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_order_id_key" ON "reviews"("order_id");

-- CreateIndex
CREATE INDEX "reviews_vendor_id_idx" ON "reviews"("vendor_id");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "guest_profiles_vendor_id_user_id_key" ON "guest_profiles"("vendor_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_vendor_id_key" ON "favorites"("user_id", "vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_vendor_id_idx" ON "payments"("vendor_id");

-- CreateIndex
CREATE INDEX "payments_reference_idx" ON "payments"("reference");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "vendor_subscriptions_vendor_id_idx" ON "vendor_subscriptions"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_subscriptions_status_idx" ON "vendor_subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey
ALTER TABLE "vendor_branches" ADD CONSTRAINT "vendor_branches_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_documents" ADD CONSTRAINT "vendor_documents_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_documents" ADD CONSTRAINT "vendor_documents_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "menu_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "vendor_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "vendor_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "takeout_orders" ADD CONSTRAINT "takeout_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "takeout_orders" ADD CONSTRAINT "takeout_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "takeout_orders" ADD CONSTRAINT "takeout_orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "vendor_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_wallets" ADD CONSTRAINT "vendor_wallets_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_credit_transactions" ADD CONSTRAINT "vendor_credit_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "vendor_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "takeout_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_profiles" ADD CONSTRAINT "guest_profiles_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_profiles" ADD CONSTRAINT "guest_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
