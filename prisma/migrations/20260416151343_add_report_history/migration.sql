-- CreateTable
CREATE TABLE "report_history" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "generated_by" TEXT NOT NULL,
    "admin_id" TEXT,
    "parameters" JSONB,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "file_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_history_admin_id_idx" ON "report_history"("admin_id");

-- CreateIndex
CREATE INDEX "report_history_type_idx" ON "report_history"("type");

-- CreateIndex
CREATE INDEX "report_history_created_at_idx" ON "report_history"("created_at");
