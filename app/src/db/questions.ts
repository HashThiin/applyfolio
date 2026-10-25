import { supabase } from '@/lib/supabase'
import type { QuestionRecord, QuestionInput } from './schema'

const BUCKET = 'question-images'

export async function getQuestionRecords(
  applicationId: string,
): Promise<QuestionRecord[]> {
  const { data, error } = await supabase
    .from('question_records')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as QuestionRecord[]
}

export async function createQuestionRecord(
  userId: string,
  input: QuestionInput,
): Promise<QuestionRecord> {
  const { data, error } = await supabase
    .from('question_records')
    .insert({ ...input, user_id: userId })
    .select()
    .single()

  if (error) throw error
  return data as QuestionRecord
}

export async function updateQuestionRecord(
  id: string,
  patch: Partial<QuestionInput>,
): Promise<void> {
  const { error } = await supabase
    .from('question_records')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function deleteQuestionRecord(id: string): Promise<void> {
  const { error } = await supabase.from('question_records').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// 图片上传 / 删除 / 获取签名 URL
// ============================================================

/**
 * 上传图片到 Supabase Storage
 * @param userId 用户 ID（路径第一段）
 * @param applicationId 关联投递 ID（路径第二段）
 * @param file 图片文件
 * @returns 存储路径
 */
export async function uploadQuestionImage(
  userId: string,
  applicationId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'png'
  const timestamp = Date.now()
  const path = `${userId}/${applicationId}/${timestamp}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw error
  return path
}

/**
 * 获取图片的临时签名 URL（私有 Bucket）
 */
export async function getImageUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600) // 1 hour expiry

  if (error) throw error
  return data.signedUrl
}

/**
 * 批量获取签名 URL
 */
export async function getImageUrls(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  await Promise.all(
    paths.map(async (p) => {
      try {
        const url = await getImageUrl(p)
        map.set(p, url)
      } catch {
        map.set(p, '')
      }
    }),
  )
  return map
}

/**
 * 删除图片
 */
export async function deleteImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}
