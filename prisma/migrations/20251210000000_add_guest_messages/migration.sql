-- CreateEnum
CREATE TYPE "GuestMessageStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

-- CreateTable
CREATE TABLE "guest_messages" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "order_number" TEXT,
    "status" "GuestMessageStatus" NOT NULL DEFAULT 'UNREAD',
    "read_at" TIMESTAMP(3),
    "read_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guest_messages_status_idx" ON "guest_messages"("status");

-- CreateIndex
CREATE INDEX "guest_messages_created_at_idx" ON "guest_messages"("created_at");

-- CreateIndex
CREATE INDEX "guest_messages_read_by_idx" ON "guest_messages"("read_by");

-- AddForeignKey
ALTER TABLE "guest_messages" ADD CONSTRAINT "guest_messages_read_by_fkey" FOREIGN KEY ("read_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

