-- AlterTable
ALTER TABLE "vendor_branches" ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'Nigeria';

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "price_level" INTEGER NOT NULL DEFAULT 2;

-- CreateIndex
CREATE INDEX "vendor_branches_country_city_idx" ON "vendor_branches"("country", "city");

-- CreateIndex
CREATE INDEX "vendors_price_level_idx" ON "vendors"("price_level");

-- Backfill diner-facing price level from venue type for existing vendors
-- (1=₦ casual … 4=₦₦₦₦ fine dining). New rows keep the default of 2.
UPDATE "vendors" SET "price_level" = CASE "venue_type"
  WHEN 'fine_dining'    THEN 4
  WHEN 'upscale_casual' THEN 3
  WHEN 'lounge'         THEN 2
  WHEN 'casual'         THEN 1
  ELSE 2
END;
