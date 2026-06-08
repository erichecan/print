-- AddColumn: filter_tags to categories
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "filter_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateTable: tag_groups
CREATE TABLE IF NOT EXISTS "tag_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tag_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tag_groups_slug_key" ON "tag_groups"("slug");
CREATE INDEX IF NOT EXISTS "tag_groups_slug_idx" ON "tag_groups"("slug");
