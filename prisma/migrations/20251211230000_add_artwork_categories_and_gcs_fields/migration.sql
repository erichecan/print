-- [2025-12-11 23:00:00] Add artwork_categories table and extend art_assets table
-- Migration: add_artwork_categories_and_gcs_fields

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create artwork_categories table
CREATE TABLE IF NOT EXISTS "artwork_categories" (
    "id" UUID NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL UNIQUE,
    "parent_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "artwork_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "artwork_categories"("id") ON DELETE CASCADE
);

-- Create indexes for artwork_categories
CREATE INDEX IF NOT EXISTS "idx_artwork_categories_parent_id" ON "artwork_categories"("parent_id");
CREATE INDEX IF NOT EXISTS "idx_artwork_categories_slug" ON "artwork_categories"("slug");
CREATE INDEX IF NOT EXISTS "idx_artwork_categories_is_active" ON "artwork_categories"("is_active");

-- Create art_assets table if it doesn't exist
CREATE TABLE IF NOT EXISTS "art_assets" (
    "id" UUID NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    "category" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "thumbnail_url" VARCHAR(500),
    "file_size" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "mime_type" VARCHAR(100),
    "is_active" BOOLEAN DEFAULT true,
    "sort_order" INTEGER DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for existing art_assets columns
CREATE INDEX IF NOT EXISTS "idx_art_assets_category" ON "art_assets"("category");
CREATE INDEX IF NOT EXISTS "idx_art_assets_created_at" ON "art_assets"("created_at");
CREATE INDEX IF NOT EXISTS "idx_art_assets_is_active" ON "art_assets"("is_active");
CREATE INDEX IF NOT EXISTS "idx_art_assets_sort_order" ON "art_assets"("sort_order");

-- Extend art_assets table with new columns
ALTER TABLE "art_assets" 
ADD COLUMN IF NOT EXISTS "slug" VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "top_category_id" UUID,
ADD COLUMN IF NOT EXISTS "sub_category_id" UUID,
ADD COLUMN IF NOT EXISTS "gcs_key" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "gcs_bucket" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "source_url" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "license" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "attribution" TEXT,
ADD COLUMN IF NOT EXISTS "dominant_color" VARCHAR(7),
ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) DEFAULT 'active';

-- Add foreign key constraints (only if columns exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'art_assets' AND column_name = 'top_category_id') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'art_assets_top_category_id_fkey') THEN
            ALTER TABLE "art_assets"
            ADD CONSTRAINT "art_assets_top_category_id_fkey" 
                FOREIGN KEY ("top_category_id") REFERENCES "artwork_categories"("id") ON DELETE SET NULL;
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'art_assets' AND column_name = 'sub_category_id') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'art_assets_sub_category_id_fkey') THEN
            ALTER TABLE "art_assets"
            ADD CONSTRAINT "art_assets_sub_category_id_fkey" 
                FOREIGN KEY ("sub_category_id") REFERENCES "artwork_categories"("id") ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Create indexes for new art_assets columns
CREATE INDEX IF NOT EXISTS "idx_art_assets_top_category_id" ON "art_assets"("top_category_id");
CREATE INDEX IF NOT EXISTS "idx_art_assets_sub_category_id" ON "art_assets"("sub_category_id");
CREATE INDEX IF NOT EXISTS "idx_art_assets_gcs_key" ON "art_assets"("gcs_key");
CREATE INDEX IF NOT EXISTS "idx_art_assets_status" ON "art_assets"("status");

-- Create GIN index for tags array
CREATE INDEX IF NOT EXISTS "idx_art_assets_tags" ON "art_assets" USING GIN("tags");

-- [2025-12-11 23:00:00] Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_artwork_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_artwork_categories_updated_at_trigger ON "artwork_categories";
CREATE TRIGGER update_artwork_categories_updated_at_trigger
    BEFORE UPDATE ON "artwork_categories"
    FOR EACH ROW
    EXECUTE FUNCTION update_artwork_categories_updated_at();
