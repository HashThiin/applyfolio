-- JobCompass Supabase 初始化迁移
-- 在 Supabase Dashboard 的 SQL Editor 中执行本文件
-- 或放在 supabase/migrations/ 下用 supabase db push 推送

-- ============================================================
-- 1. 投递记录表
-- ============================================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  url TEXT,
  applied_at DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied','screening','assessment','ai_interview','written','group_interview','interview','offer','rejected','withdrawn')),
  channel TEXT,
  color TEXT CHECK (color IS NULL OR color ~ '^#[0-9a-fA-F]{6}$'),
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. 题目记录表（替代旧 note 字段）
-- ============================================================
CREATE TABLE question_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_paths TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. 行级安全策略 (RLS)
-- ============================================================
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_applications" ON applications FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "own_questions" ON question_records FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. 索引
-- ============================================================
CREATE INDEX idx_applications_user ON applications(user_id, applied_at DESC);
CREATE INDEX idx_applications_status ON applications(user_id, status);
CREATE INDEX idx_questions_app ON question_records(application_id);

-- ============================================================
-- 5. Storage Bucket（需在 Dashboard 手动创建或 uncomment 下方）
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('question-images', 'question-images', false);

-- Storage RLS 策略
CREATE POLICY "own_images_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'question-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "own_images_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'question-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "own_images_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'question-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 6. 自动更新 updated_at 触发器
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_applications_updated
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_questions_updated
  BEFORE UPDATE ON question_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
