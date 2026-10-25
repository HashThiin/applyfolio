import { supabase } from '@/lib/supabase'
import type { Application, ApplicationInput, ApplicationStatus } from './schema'

export async function getAllApplications(userId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .order('applied_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Application[]
}

export async function createApplication(
  userId: string,
  input: ApplicationInput,
): Promise<Application> {
  const { data, error } = await supabase
    .from('applications')
    .insert({ ...input, user_id: userId })
    .select()
    .single()

  if (error) throw error
  return data as Application
}

export async function updateApplication(
  id: string,
  patch: Partial<ApplicationInput>,
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function updateStatus(
  id: string,
  status: ApplicationStatus,
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

/** 切换置顶状态 */
export async function togglePin(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ pinned, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteApplication(id: string): Promise<void> {
  const { error } = await supabase.from('applications').delete().eq('id', id)
  if (error) throw error
}

/** 撤销删除：重新插入原记录 */
export async function restoreApplication(record: Application): Promise<void> {
  const { error } = await supabase.from('applications').insert(record)
  if (error) throw error
}
