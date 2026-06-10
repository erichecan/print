-- CreateTable
CREATE TABLE "user_uploads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "guest_token" TEXT,
    "url" TEXT NOT NULL,
    "gcs_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_uploads_user_id_created_at_idx" ON "user_uploads"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "user_uploads_guest_token_created_at_idx" ON "user_uploads"("guest_token", "created_at");
