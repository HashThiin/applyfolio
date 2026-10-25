-- ApplyFolio 006：「收录意向」的岗位要求 + AI 简历建议 + 简历原件
-- 在 Supabase Dashboard → SQL Editor 执行本文件（可重复执行）

-- ============================================================
-- 1. 投递记录：岗位要求原文与 AI 建议
-- ============================================================
ALTER TABLE applications ADD COLUMN IF NOT EXISTS jd_text TEXT NOT NULL DEFAULT '';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS advice JSONB;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS advice_at TIMESTAMPTZ;

COMMENT ON COLUMN applications.jd_text IS '岗位要求原文，收录意向时粘贴/抓取，供 AI 分析';
COMMENT ON COLUMN applications.advice IS 'AI 简历建议，结构见 src/db/schema.ts 的 Advice';

-- ============================================================
-- 2. 用户档案：简历原件与文本
-- ============================================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS resume_path TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS resume_filename TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS resume_text TEXT NOT NULL DEFAULT '';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS resume_updated_at TIMESTAMPTZ;

-- ============================================================
-- 3. 简历私有桶（一个用户一份，路径首段 = uid）
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- 重新上传会 upsert 同一路径，因此 INSERT 与 UPDATE 策略都要建
DROP POLICY IF EXISTS "own_resume_insert" ON storage.objects;
CREATE POLICY "own_resume_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "own_resume_select" ON storage.objects;
CREATE POLICY "own_resume_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "own_resume_update" ON storage.objects;
CREATE POLICY "own_resume_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "own_resume_delete" ON storage.objects;
CREATE POLICY "own_resume_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
