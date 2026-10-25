// Supabase Edge Function: analyze-job
//
// 作用：读当前用户的简历（优先用户粘贴的文本，否则读 Storage 里的原件）+ 本次岗位要求，
//      调用 DeepSeek 产出结构化简历建议。密钥只存在服务端。
//
// 部署：
//   supabase functions deploy analyze-job
//   supabase secrets set DEEPSEEK_API_KEY=sk-xxx
// 未配置密钥时返回 503 AI_NOT_CONFIGURED，前端据此降级为「只收录、不分析」。
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MIN_JD_LENGTH = 40
const MAX_JD_LENGTH = 8000
const MAX_RESUME_LENGTH = 24000
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'
const RESUME_BUCKET = 'resumes'

interface AdviceEdit {
  section: string
  suggestion: string
}

interface Advice {
  matchScore: number
  summary: string
  strengths: string[]
  gaps: string[]
  keywords: string[]
  resumeEdits: AdviceEdit[]
  nextSteps: string[]
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function fail(code: string, message: string, status: number): Response {
  return json({ code, message }, status)
}

function asString(value: unknown, maxChars: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxChars)
}

function asStringList(value: unknown, limit: number, maxChars: number): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    const text = asString(item, maxChars)
    if (text) out.push(text)
    if (out.length >= limit) break
  }
  return out
}

/** 模型输出不可全信：逐字段收敛类型与长度，避免脏数据进库 */
function normalizeAdvice(raw: unknown): Advice | null {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  const summary = asString(source.summary, 300)
  if (!summary) return null

  const scoreRaw = Number(source.matchScore)
  const matchScore = Number.isFinite(scoreRaw)
    ? Math.max(0, Math.min(100, Math.round(scoreRaw)))
    : 0

  const editsRaw = Array.isArray(source.resumeEdits) ? source.resumeEdits : []
  const resumeEdits: AdviceEdit[] = []
  for (const item of editsRaw) {
    if (!item || typeof item !== 'object') continue
    const edit = item as Record<string, unknown>
    const section = asString(edit.section, 40)
    const suggestion = asString(edit.suggestion, 300)
    if (section && suggestion) resumeEdits.push({ section, suggestion })
    if (resumeEdits.length >= 6) break
  }

  return {
    matchScore,
    summary,
    strengths: asStringList(source.strengths, 5, 120),
    gaps: asStringList(source.gaps, 5, 120),
    keywords: asStringList(source.keywords, 12, 40),
    resumeEdits,
    nextSteps: asStringList(source.nextSteps, 4, 160),
  }
}

/** 从 Storage 原件抽文字：TXT/MD 直接解码，PDF 用 unpdf（按需动态载入，省冷启动） */
async function readResumeFile(
  supabase: ReturnType<typeof createClient>,
  path: string,
): Promise<string> {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const { data, error } = await supabase.storage.from(RESUME_BUCKET).download(path)
  if (error || !data) throw new Error('简历原件读取失败，请重新上传')

  if (ext === 'txt' || ext === 'md') {
    return (await data.text()).slice(0, MAX_RESUME_LENGTH)
  }
  if (ext !== 'pdf') throw new Error('简历格式不支持，请上传 PDF / TXT / MD')

  const bytes = new Uint8Array(await data.arrayBuffer())
  const { extractText, getDocumentProxy } = await import('npm:unpdf')
  const pdf = await getDocumentProxy(bytes)
  const { text } = await extractText(pdf, { mergePages: true })
  return String(text ?? '').slice(0, MAX_RESUME_LENGTH)
}

const SYSTEM_PROMPT = [
  '你是资深技术招聘官兼简历顾问，熟悉中国校招与社招的筛选标准。',
  '你的任务：把候选人的简历与目标岗位要求逐条比对，给出可执行的修改建议。',
  '只输出一个 JSON 对象，不要 markdown、不要解释、不要代码块。',
  'JSON 字段如下：',
  '{"matchScore": 0到100的整数, "summary": "一句话结论",',
  ' "strengths": ["已具备、且岗位明确要求的优势"],',
  ' "gaps": ["岗位要求里候选人明显缺失的点"],',
  ' "keywords": ["应当出现在简历里的岗位关键词"],',
  ' "resumeEdits": [{"section": "简历里的哪个部分", "suggestion": "具体怎么改"}],',
  ' "nextSteps": ["投递前或面试前该做的事"]}',
  '要求：summary ≤ 60 字；strengths 3-5 条；gaps 2-5 条；keywords 5-12 个；',
  'resumeEdits 3-6 条且必须指向简历的具体段落；nextSteps 2-4 条。',
  '不要编造候选人没有的经历；缺什么就直说。',
].join('\n')

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return fail('METHOD_NOT_ALLOWED', '只支持 POST', 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return fail('UNAUTHORIZED', '请先登录', 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    return fail('SERVER_MISCONFIGURED', 'Edge Function 缺少 SUPABASE_URL / SUPABASE_ANON_KEY', 500)
  }

  // 用调用者的 JWT 建客户端：读档案、下载简历都走 RLS，不越权
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser()
  const user = userData?.user
  if (userError || !user) return fail('UNAUTHORIZED', '登录状态已失效，请重新登录', 401)

  let payload: Record<string, unknown>
  try {
    payload = (await req.json()) as Record<string, unknown>
  } catch {
    return fail('BAD_REQUEST', '请求体不是合法 JSON', 400)
  }

  const jdText = asString(payload.jdText, MAX_JD_LENGTH)
  if (jdText.length < MIN_JD_LENGTH) {
    return fail('JD_TOO_SHORT', `岗位要求至少 ${MIN_JD_LENGTH} 字，粘贴完整一些再分析`, 422)
  }

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
  if (!apiKey) {
    return fail(
      'AI_NOT_CONFIGURED',
      '分析服务未配置：请为 Edge Function 设置 DEEPSEEK_API_KEY 后重试',
      503,
    )
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('resume_text,resume_path')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) return fail('PROFILE_READ_FAILED', '读取简历失败，请重试', 500)

  let resumeText = asString(profile?.resume_text, MAX_RESUME_LENGTH)
  if (!resumeText && profile?.resume_path) {
    try {
      resumeText = asString(await readResumeFile(supabase, profile.resume_path), MAX_RESUME_LENGTH)
    } catch (error) {
      const message = error instanceof Error ? error.message : '简历原件读取失败'
      return fail('RESUME_UNREADABLE', `${message}；也可在个人中心粘贴简历文本`, 422)
    }
  }

  if (!resumeText) {
    return fail('RESUME_MISSING', '还没有简历：请到个人中心上传简历或粘贴简历文本', 422)
  }

  const jobLine = [
    asString(payload.company, 60) ? `公司：${asString(payload.company, 60)}` : '',
    asString(payload.role, 80) ? `岗位：${asString(payload.role, 80)}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const userPrompt = [
    jobLine,
    '以下是岗位要求原文（可能含招聘页噪音，请自行抓重点）：',
    '"""',
    jdText,
    '"""',
    '以下是候选人简历：',
    '"""',
    resumeText,
    '"""',
  ]
    .filter(Boolean)
    .join('\n')

  let upstream: Response
  try {
    upstream = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        temperature: 0.3,
        max_tokens: 1600,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(90_000),
    })
  } catch {
    return fail('AI_UPSTREAM_ERROR', '分析服务连接超时，请稍后重试', 502)
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '')
    console.error('deepseek error', upstream.status, detail.slice(0, 500))
    const hint =
      upstream.status === 401 || upstream.status === 403
        ? 'API Key 无效或额度不足'
        : upstream.status === 429
          ? '调用过于频繁，请稍后再试'
          : `分析服务返回 ${upstream.status}`
    return fail('AI_UPSTREAM_ERROR', hint, 502)
  }

  const completion = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = completion.choices?.[0]?.message?.content ?? ''

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    console.error('deepseek returned non-json', content.slice(0, 300))
    return fail('AI_BAD_RESPONSE', '分析结果解析失败，请重试', 502)
  }

  const advice = normalizeAdvice(parsed)
  if (!advice) return fail('AI_BAD_RESPONSE', '分析结果不完整，请重试', 502)

  return json({ advice })
})
