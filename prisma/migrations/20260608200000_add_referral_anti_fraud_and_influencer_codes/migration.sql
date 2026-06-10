-- Add FROZEN to ReferralRewardStatus enum
ALTER TYPE "ReferralRewardStatus" ADD VALUE IF NOT EXISTS 'FROZEN';

-- Add anti-fraud columns to referral_links
ALTER TABLE "referral_links"
  ADD COLUMN IF NOT EXISTS "client_ip"     VARCHAR(45),
  ADD COLUMN IF NOT EXISTS "client_id"     VARCHAR(36),
  ADD COLUMN IF NOT EXISTS "frozen_until"  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "frozen_reason" VARCHAR(200);

CREATE INDEX IF NOT EXISTS "referral_links_client_ip_idx" ON "referral_links"("client_ip");
CREATE INDEX IF NOT EXISTS "referral_links_client_id_idx" ON "referral_links"("client_id");

-- InfluencerCode
CREATE TABLE IF NOT EXISTS "influencer_codes" (
  "id"             TEXT          NOT NULL PRIMARY KEY,
  "code"           VARCHAR(30)   NOT NULL,
  "owner_user_id"  TEXT          NOT NULL,
  "label"          VARCHAR(100)  NOT NULL DEFAULT '',
  "discount_pct"   INTEGER       NOT NULL DEFAULT 0,
  "commission_pct" INTEGER       NOT NULL DEFAULT 10,
  "monthly_limit"  INTEGER       NOT NULL DEFAULT 50,
  "is_active"      BOOLEAN       NOT NULL DEFAULT TRUE,
  "created_at"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "influencer_codes_code_key" ON "influencer_codes"("code");
CREATE INDEX IF NOT EXISTS "influencer_codes_owner_user_id_idx" ON "influencer_codes"("owner_user_id");

-- InfluencerRewardStatus enum
DO $$ BEGIN
  CREATE TYPE "InfluencerRewardStatus" AS ENUM ('PENDING', 'FROZEN', 'PAID', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- InfluencerCodeUsage
CREATE TABLE IF NOT EXISTS "influencer_code_usages" (
  "id"                TEXT                     NOT NULL PRIMARY KEY,
  "code_id"           TEXT                     NOT NULL REFERENCES "influencer_codes"("id"),
  "buyer_user_id"     TEXT,
  "order_id"          TEXT                     NOT NULL,
  "order_amount"      DECIMAL(10,2)            NOT NULL,
  "commission_amount" DECIMAL(10,2)            NOT NULL,
  "discount_amount"   DECIMAL(10,2)            NOT NULL DEFAULT 0,
  "reward_status"     "InfluencerRewardStatus" NOT NULL DEFAULT 'PENDING',
  "client_ip"         VARCHAR(45),
  "client_id"         VARCHAR(36),
  "frozen_until"      TIMESTAMPTZ,
  "frozen_reason"     VARCHAR(200),
  "paid_at"           TIMESTAMPTZ,
  "created_at"        TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "influencer_code_usages_order_id_key" ON "influencer_code_usages"("order_id");
CREATE INDEX IF NOT EXISTS "influencer_code_usages_code_id_idx"      ON "influencer_code_usages"("code_id");
CREATE INDEX IF NOT EXISTS "influencer_code_usages_buyer_user_id_idx" ON "influencer_code_usages"("buyer_user_id");
CREATE INDEX IF NOT EXISTS "influencer_code_usages_client_ip_idx"    ON "influencer_code_usages"("client_ip");
CREATE INDEX IF NOT EXISTS "influencer_code_usages_client_id_idx"    ON "influencer_code_usages"("client_id");
