-- CreateTable
CREATE TABLE "offline_order_audit_logs" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "actor_id" TEXT,
    "actor_name" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offline_order_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offline_order_audit_logs_order_id_idx" ON "offline_order_audit_logs"("order_id");

-- CreateIndex
CREATE INDEX "offline_order_audit_logs_created_at_idx" ON "offline_order_audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "offline_order_audit_logs" ADD CONSTRAINT "offline_order_audit_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "offline_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
