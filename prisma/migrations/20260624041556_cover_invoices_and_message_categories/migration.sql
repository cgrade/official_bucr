-- AlterTable
ALTER TABLE "cover_charges" ADD COLUMN     "invoice_id" TEXT;

-- AlterTable
ALTER TABLE "vendor_messages" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'message',
ADD COLUMN     "link" TEXT;

-- CreateTable
CREATE TABLE "cover_invoices" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "amount_ngn" INTEGER NOT NULL,
    "cover_count" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMP(3) NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    "last_reminder_at" TIMESTAMP(3),
    "payment_reference" TEXT,

    CONSTRAINT "cover_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cover_invoices_vendor_id_status_idx" ON "cover_invoices"("vendor_id", "status");

-- CreateIndex
CREATE INDEX "cover_invoices_status_due_date_idx" ON "cover_invoices"("status", "due_date");

-- CreateIndex
CREATE INDEX "cover_charges_invoice_id_idx" ON "cover_charges"("invoice_id");

-- AddForeignKey
ALTER TABLE "cover_invoices" ADD CONSTRAINT "cover_invoices_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_charges" ADD CONSTRAINT "cover_charges_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "cover_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

