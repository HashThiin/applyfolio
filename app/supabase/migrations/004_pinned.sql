-- 004: 新增置顶字段
-- 允许用户把重要的投递记录钉在列表最顶部。

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;

-- 加速「按用户 + 置顶」读取
CREATE INDEX IF NOT EXISTS idx_applications_user_pinned
  ON applications(user_id, pinned DESC, applied_at DESC);
