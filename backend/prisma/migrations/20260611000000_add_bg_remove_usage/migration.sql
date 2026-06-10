CREATE TABLE "bg_remove_usage" (
    "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"         TEXT,
    "guest_token"     TEXT,
    "ip_address"      TEXT NOT NULL,
    "result_gcs_key"  TEXT NOT NULL DEFAULT '',
    "result_url"      TEXT NOT NULL DEFAULT '',
    "is_processing"   BOOLEAN NOT NULL DEFAULT false,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bg_remove_usage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bg_remove_usage_user_id_idx"    ON "bg_remove_usage"("user_id");
CREATE INDEX "bg_remove_usage_guest_token_idx" ON "bg_remove_usage"("guest_token");
CREATE INDEX "bg_remove_usage_created_at_idx"  ON "bg_remove_usage"("created_at");
