-- 005: 用户档案表（当前承载个人中心的「自我评价」）
-- 一个用户一行，主键即 user_id，便于前端 upsert 免查再插。
-- 在 Supabase Dashboard 的 SQL Editor 中执行本文件。

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  self_evaluation TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS：只能读写自己那一行
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_profile" ON user_profiles;
CREATE POLICY "own_profile" ON user_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- updated_at 复用 001 的触发器函数；先删后建，方便重复执行
DROP TRIGGER IF EXISTS trg_user_profiles_updated ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
