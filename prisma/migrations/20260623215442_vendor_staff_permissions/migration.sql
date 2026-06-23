-- AlterTable
ALTER TABLE "vendor_staff" ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];

