-- CreateEnum
CREATE TYPE "VendorStaffRole" AS ENUM ('manager', 'staff');

-- CreateEnum
CREATE TYPE "VendorStaffStatus" AS ENUM ('pending', 'active', 'disabled');

-- CreateTable
CREATE TABLE "vendor_staff" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" "VendorStaffRole" NOT NULL DEFAULT 'staff',
    "status" "VendorStaffStatus" NOT NULL DEFAULT 'pending',
    "invite_token" TEXT,
    "invite_expires_at" TIMESTAMP(3),
    "invited_by_id" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vendor_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendor_staff_invite_token_key" ON "vendor_staff"("invite_token");

-- CreateIndex
CREATE INDEX "vendor_staff_vendor_id_idx" ON "vendor_staff"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_staff_invite_token_idx" ON "vendor_staff"("invite_token");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_staff_vendor_id_email_key" ON "vendor_staff"("vendor_id", "email");

-- AddForeignKey
ALTER TABLE "vendor_staff" ADD CONSTRAINT "vendor_staff_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

