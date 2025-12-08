-- [2025-12-08] CreateDesignLabAnalytics
-- 创建Design Lab Analytics相关表

-- CreateTable: design_lab_analytics_events
CREATE TABLE IF NOT EXISTS "design_lab_analytics_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "design_id" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_lab_analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "design_lab_analytics_events_user_id_idx" ON "design_lab_analytics_events"("user_id");
CREATE INDEX IF NOT EXISTS "design_lab_analytics_events_session_id_idx" ON "design_lab_analytics_events"("session_id");
CREATE INDEX IF NOT EXISTS "design_lab_analytics_events_event_type_idx" ON "design_lab_analytics_events"("event_type");
CREATE INDEX IF NOT EXISTS "design_lab_analytics_events_timestamp_idx" ON "design_lab_analytics_events"("timestamp");

-- CreateTable: design_lab_upload_ratings
CREATE TABLE IF NOT EXISTS "design_lab_upload_ratings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "upload_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_lab_upload_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "design_lab_upload_ratings_user_id_idx" ON "design_lab_upload_ratings"("user_id");
CREATE INDEX IF NOT EXISTS "design_lab_upload_ratings_upload_id_idx" ON "design_lab_upload_ratings"("upload_id");
CREATE INDEX IF NOT EXISTS "design_lab_upload_ratings_created_at_idx" ON "design_lab_upload_ratings"("created_at");

