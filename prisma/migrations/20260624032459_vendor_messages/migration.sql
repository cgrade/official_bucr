-- CreateTable
CREATE TABLE "vendor_messages" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sent_by_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendor_messages_vendor_id_is_read_idx" ON "vendor_messages"("vendor_id", "is_read");

-- CreateIndex
CREATE INDEX "vendor_messages_created_at_idx" ON "vendor_messages"("created_at");

-- AddForeignKey
ALTER TABLE "vendor_messages" ADD CONSTRAINT "vendor_messages_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

