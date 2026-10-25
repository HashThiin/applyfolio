import { supabase } from '@/lib/supabase'
import { RESUME_MAX_BYTES } from './schema'
import type { UserProfile } from './schema'

const RESUME_BUCKET = 'resumes'

/** 读取当前用户档案；首次使用还没有行时返回 null */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as UserProfile | null
}

/** 保存自我评价：首次写入插入新行，之后覆盖同一行 */
export async function saveSelfEvaluation(
  userId: string,
  selfEvaluation: string,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: userId,
        self_evaluation: selfEvaluation,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single()

  if (error) throw error
  return data as UserProfile
}

// ============================================================
// 简历：原件存 Storage（私有桶），文本供 AI 读取
// ============================================================

/**
 * 上传简历原件。路径固定为 `${uid}/resume.${ext}`，重新上传即覆盖，
 * 保证一个用户只留一份，不必清理历史文件。
 */
export async function uploadResumeFile(userId: string, file: File): Promise<string> {
  if (file.size > RESUME_MAX_BYTES) {
    throw new Error(`简历文件超过 ${Math.round(RESUME_MAX_BYTES / 1024 / 1024)} MB`)
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
  const path = `${userId}/resume.${ext}`

  const { error } = await supabase.storage
    .from(RESUME_BUCKET)
    .upload(path, file, { cacheControl: '60', upsert: true })

  if (error) throw error
  return path
}

/** 删除简历原件；失败不阻断档案字段的清空 */
export async function deleteResumeFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(RESUME_BUCKET).remove([path])
  if (error) throw error
}

/**
 * 保存简历档案字段。传 undefined 表示不动该字段（upsert 只更新给出的列），
 * 传 null / '' 表示清空。
 */
export async function saveResumeMeta(
  userId: string,
  patch: {
    resume_path?: string | null
    resume_filename?: string | null
    resume_text?: string
  },
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: userId,
        ...patch,
        resume_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single()

  if (error) throw error
  return data as UserProfile
}
