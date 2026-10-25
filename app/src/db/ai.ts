import { supabase } from '@/lib/supabase'
import type { Advice } from './schema'

export type AnalyzeOutcome =
  | { ok: true; advice: Advice }
  | { ok: false; code: string; message: string }

export interface AnalyzeInput {
  jdText: string
  company?: string
  role?: string
}

/**
 * 调 Edge Function 做岗位匹配分析。
 * 服务端的各种「没配好」都当成可展示的原因返回，调用方据此降级为「只收录」。
 */
export async function analyzeJob(input: AnalyzeInput): Promise<AnalyzeOutcome> {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-job', { body: input })
    if (error) {
      const { code, message } = await readError(error)
      return { ok: false, code, message }
    }
    const advice = (data as { advice?: Advice } | null)?.advice
    if (!advice || typeof advice.summary !== 'string') {
      return { ok: false, code: 'AI_BAD_RESPONSE', message: '分析结果为空，请重试' }
    }
    return { ok: true, advice }
  } catch {
    return {
      ok: false,
      code: 'AI_UNAVAILABLE',
      message: '无法连接分析服务（Edge Function 可能还没部署）',
    }
  }
}

/** FunctionsHttpError 把响应放在 context 里，错误码与文案都由 Edge Function 给出 */
async function readError(error: unknown): Promise<{ code: string; message: string }> {
  const context = (error as { context?: Response }).context
  if (context && typeof context.json === 'function') {
    try {
      const body = (await context.json()) as { code?: string; message?: string }
      if (body?.message) return { code: body.code ?? 'AI_CALL_FAILED', message: body.message }
    } catch {
      /* 非 JSON 错误体，继续走下面的兜底 */
    }
  }
  const message = error instanceof Error ? error.message : ''
  if (/failed to send|fetch|network/i.test(message)) {
    return { code: 'AI_UNAVAILABLE', message: '分析服务未部署或网络不通' }
  }
  return { code: 'AI_CALL_FAILED', message: '分析失败，稍后重试' }
}
