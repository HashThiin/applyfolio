import { supabase } from '@/lib/supabase'
import type { UserProfile } from './schema'

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
