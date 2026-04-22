-- [2025-12-08] AddDesignShareFields
-- 为Design表添加分享相关字段

-- AddColumn: shareToken
ALTER TABLE "designs" ADD COLUMN IF NOT EXISTS "share_token" TEXT;

-- AddColumn: isPublic
ALTER TABLE "designs" ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN DEFAULT false;

-- CreateIndex: shareToken (unique)
CREATE UNIQUE INDEX IF NOT EXISTS "designs_share_token_key" ON "designs"("share_token");

-- CreateIndex: shareToken (for queries)
CREATE INDEX IF NOT EXISTS "designs_share_token_idx" ON "designs"("share_token");

