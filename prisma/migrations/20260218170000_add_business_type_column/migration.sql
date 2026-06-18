-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('restaurant', 'bar', 'cafe', 'lounge', 'hotel', 'club', 'bakery', 'food_truck', 'catering', 'other');

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN "business_type" "BusinessType" NOT NULL DEFAULT 'restaurant';
