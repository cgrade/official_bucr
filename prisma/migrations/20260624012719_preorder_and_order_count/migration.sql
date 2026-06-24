-- AlterTable
ALTER TABLE "menus" ADD COLUMN     "order_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "preorder_items" JSONB;

