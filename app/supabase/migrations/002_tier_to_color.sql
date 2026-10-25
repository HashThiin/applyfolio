-- 002: 分级字段 tier(A/B/C 枚举) → color(自定义 hex 色值)
-- 如果你已经执行过旧版 001_init.sql（含 tier 列），请再执行本文件；
-- 如果还没执行过任何迁移，直接执行更新后的 001_init.sql 即可，无需本文件。

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_tier_check;
ALTER TABLE applications DROP COLUMN IF EXISTS tier;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS color TEXT CHECK (color IS NULL OR color ~ '^#[0-9a-fA-F]{6}$');
