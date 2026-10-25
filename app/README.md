# ApplyFolio

> 求职投递工作台：搜索岗位、收录意向、AI 简历建议、投递进度追踪。Supabase 云端存储，多设备同步，可安装为桌面/手机应用。

- **云端版 v3.0**：邮箱注册登录，数据存 Supabase PostgreSQL，换浏览器/设备不丢数据
- **投递闭环**：主按钮「投递」→ 搜岗位/贴网址（新标签浏览招聘站）→ 回来粘贴岗位要求 → 收录意向即落一条「投递」记录 → 列表点「已投出」进入初筛
- **AI 简历建议**：Edge Function + DeepSeek 拿你的简历与岗位要求比对，给出匹配分、关键词、缺口与逐条改法
- **岗位与网址**：同公司下每个岗位各自一条记录、各自一个招聘页网址
- **优先级颜色标记**：红橙黄绿自定义色，编辑区与列表同一色阶，选中所见即列表所见
- **题目记录**：每条投递可记笔试/面试题目，支持截图上传与放大查看
- **个人主页**：账号信息、**自我评价**（最多 1000 字）、**简历**（私有桶上传 PDF/TXT/MD 或粘贴文本）、登录状态与数据概览
- **可安装 (PWA)**：浏览器地址栏一键"安装"成独立窗口应用
- **当前版本：v3.0（已上线 https://applyfolio-silk.vercel.app ；2026-10-26 完成投递闭环。生效前需执行 006 迁移、部署 analyze-job 并配置 DEEPSEEK_API_KEY，详见 `../docs/2026-10-26-0245-投递闭环与AI简历建议.md`）**

---

## 快速开始

要求 Node v22+ / npm 10+，以及一个 [Supabase](https://supabase.com) 项目（Free 层即可）。

### 1. 配置 Supabase（一次性）

1. Supabase Dashboard → **SQL Editor** → 执行 [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)（建表 + RLS + Storage 策略 + 触发器）
   - 若你之前执行过含 `tier` 列的旧版 001，再补执行 [`002_tier_to_color.sql`](supabase/migrations/002_tier_to_color.sql)
   - 已有库升级：补执行 [`005_user_profile.sql`](supabase/migrations/005_user_profile.sql)（新增 `user_profiles` 表，个人主页「自我评价」依赖它）
   - v3.0 升级：补执行 [`006_resume_and_advice.sql`](supabase/migrations/006_resume_and_advice.sql)（`applications.jd_text/advice`、`user_profiles.resume_*`、`resumes` 私有桶与其 RLS）
2. Dashboard → **Storage** → 创建私有 Bucket：`question-images`（`resumes` 由 006 自动创建）
3. Dashboard → **Authentication → Providers → Email** → 开发期关闭 "Confirm email"
4. Dashboard → **Database → Replication** → 勾选 `applications` 表（Realtime 生效）
5. **Edge Function（v3.0，可选但推荐）**
   ```powershell
   supabase link --project-ref <项目 ref>
   supabase functions deploy analyze-job
   supabase secrets set DEEPSEEK_API_KEY=sk-xxxx
   ```
   不配置也能用：点「收录并分析」会提示未配置，并按「只收录」保存记录。

### 2. 配置环境变量

创建 `app/.env.local`（已 gitignore）：

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> 在 Dashboard → Settings → API 获取。⚠️ 修改后必须重启 dev server，Vite 不会热更新环境变量。

### 3. 运行

```powershell
npm install         # 首次拉取依赖
npm run dev         # 开发服务器 http://localhost:5173
npm run build       # 生产构建：tsc -b && vite build → dist/（自动生成 PWA sw.js/manifest）
npm run preview     # 预览构建产物：同样锁定 5173 端口
npm test            # 单元测试：vitest run（当前 44 个用例）
npm run lint        # 代码检查：oxlint（应保持 0 warning 0 error）
```

---

## 安装为应用（PWA）

构建产物含 `manifest.webmanifest` 与 Service Worker：

- **桌面 Chrome/Edge**：地址栏右侧出现安装图标 →「安装 ApplyFolio」→ 独立窗口 + 任务栏图标
- **手机**：Safari/Chrome 菜单 →「添加到主屏幕」
- **更新策略**：`registerType: 'autoUpdate'`，发新版后下次打开自动生效
- **离线行为**：应用外壳可离线打开（登录态保留），但数据读写走 Supabase 需联网（API 请求已显式配置为不走缓存）

> PWA 安装要求页面运行在 HTTPS 或 localhost 上。部署到 Vercel/Netlify 后即为 HTTPS。

---

## 功能清单

| # | 分类 | 功能 |
|---|---|---|
| 1 | 账号 | 邮箱 + 密码注册 / 登录（Supabase Auth），路由守卫未登录跳转 |
| 2 | 账号 | 退出登录；多设备登录同一账号数据同步 |
| 2.1 | 账号 | 个人主页 `/me`：账号信息、**自我评价**（1000 字内，保存到云端）、**简历原件与简历文本**、登录状态与数据概览 |
| 3 | 录入 | 主按钮「投递」打开「找岗位」面板：关键词跳 BOSS直聘/猎聘/前程无忧/智联/Google 搜索结果，或直接粘贴岗位网址，均在新标签打开 |
| 4 | 录入 | **收录意向**：填公司 + 岗位 + 岗位网址 + 粘贴岗位要求 → 一次生成一条「投递」记录（AI 可用时同时给出简历建议） |
| 4.1 | AI | **简历建议**：匹配分、一句话结论、已具备优势、未覆盖要求、该出现的关键词、逐条改法、下一步；存 `applications.advice` |
| 4.2 | AI | 降级：Function 未部署 / 未配 Key / 简历缺失 / JD 过短 / 上游超时 都给可读原因，且不阻断「只收录」 |
| 5 | 录入 | 手动新增投递（右侧抽屉表单，投递日期默认今天；面板内「手动记一条」也进这里） |
| 6 | 录入 | 编辑投递（点行打开，预填全部字段；三标签页：题目/备注、简历建议、编辑信息） |
| 7 | 录入 | 表单校验（公司/岗位必填、网址格式、日期合法且不晚于今天、颜色 hex 合法） |
| 8 | 录入 | 公司名历史联想（原生 `<datalist>`） |
| 9 | 录入 | 快捷键 `Ctrl / ⌘ + Enter` 提交；关闭前未保存确认 |
| 10 | 分级 | **优先级颜色标记**：预设红/橙/黄/绿/蓝/紫色板 + 任意自定义取色器 |
| 11 | 列表 | 关键词搜索（公司/岗位）、状态多选筛选、三种排序（日期/更新/公司名） |
| 12 | 列表 | 行内颜色标识：左侧色条 + 公司名后圆点，悬停查看色值；有 AI 建议的行显示「建议 {分}」徽标 |
| 13 | 状态 | 徽章点选即改；`投递` 行另给「已投出」按钮 → 一键进「初筛」（5 秒内可撤销） |
| 14 | 状态 | 终态 `Offer / 已挂 / 已放弃` 不计入"进行中" |
| 15 | 统计 | 顶部四项：总投递 / 进行中 / Offer / 已挂放弃 |
| 16 | 题目 | 每条投递的题目记录抽屉：文字记录，按时间倒序 |
| 17 | 题目 | 图片上传（单条最多 10 张）→ Supabase Storage 私有桶 |
| 18 | 题目 | 缩略图墙 + 点击全屏放大（签名 URL，1 小时有效） |
| 19 | 网址 | 一键打开岗位链接 / 复制链接；裸域名自动补 `https://` |
| 20 | 删除 | 删除后 6 秒内可撤销（Toast） |
| 21 | 邮箱 | 快捷邮箱按钮：先选服务商（12 家），再新标签打开 |
| 22 | 同步 | Supabase Realtime：多标签/多设备数据变更自动刷新 |
| 23 | 安全 | URL 拒绝 `javascript:` 等伪协议；RLS 保证只能读写自己的数据；AI 密钥只在 Edge Function |
| 24 | PWA | 可安装为独立应用，自动更新 |

---

## 优先级颜色说明

v2.1 起，「公司分级 A/B/C 文字」被**自由颜色**取代：

- `applications.color` 存 hex 色值（如 `#ef4444`），可为 `null`
- 表单提供 6 个预设色（红橙黄绿蓝紫）+ 系统取色器自定义任意颜色
- 列表行以左侧竖色条 + 公司名旁圆点呈现；语义由用户自定（如红=必须拿到）
- 数据库层用正则 CHECK 约束保证色值格式：`^#[0-9a-fA-F]{6}$`

---

## 数据模型

`src/db/schema.ts` 是全应用唯一来源，对应 Supabase PostgreSQL：

```ts
interface Application {
  id: string            // UUID (gen_random_uuid)
  user_id: string       // references auth.users
  company: string
  role: string
  url: string | null
  applied_at: string    // 'YYYY-MM-DD'
  status: 'applied' | 'screening' | 'assessment' | 'ai_interview' | 'written'
        | 'group_interview' | 'interview' | 'offer' | 'rejected' | 'withdrawn'
  channel: string | null  // 已从 UI 下线，仅兼容历史数据
  color: string | null    // hex 优先级颜色
  pinned: boolean         // 置顶
  jd_text?: string        // 岗位要求原文（收录意向时粘贴）
  advice?: Advice | null  // AI 简历建议
  advice_at?: string | null
  created_at: string      // ISO timestamp
  updated_at: string      // ISO timestamp（触发器自动维护）
}

interface Advice {
  matchScore: number      // 0-100
  summary: string
  strengths: string[]; gaps: string[]; keywords: string[]
  resumeEdits: { section: string; suggestion: string }[]
  nextSteps: string[]
}

interface QuestionRecord {
  id: string
  application_id: string  // references applications，级联删除
  user_id: string
  content: string          // 题目文字
  image_paths: string[]    // Storage 对象路径数组
  created_at: string
  updated_at: string
}

interface UserProfile {
  user_id: string          // 主键 = auth.users.id（一用户一行）
  self_evaluation: string  // 自我评价，允许空串，上限 1000 字
  resume_path?: string | null      // resumes 桶内路径 `${uid}/resume.${ext}`
  resume_filename?: string | null
  resume_text?: string             // 手填简历文本，优先于原件抽取，上限 20000 字
  resume_updated_at?: string | null
  updated_at: string
}
```

---

## 数据存储：Supabase

| 维度 | 说明 |
|---|---|
| 数据库 | PostgreSQL，三张表 `applications` / `question_records` / `user_profiles` |
| 隔离 | Row Level Security：`auth.uid() = user_id`，用户只能读写自己的行 |
| 图片 | 私有 Bucket `question-images`，路径约定 `{user_id}/{application_id}/{timestamp}.{ext}` |
| 简历 | 私有 Bucket `resumes`，路径 `${uid}/resume.${ext}`（一用户一份，重新上传即覆盖） |
| 文件访问 | 签名 URL（1 小时有效期），Storage 策略按首段文件夹 = uid 校验 |
| AI | Edge Function `analyze-job`（Deno）读简历 + 岗位要求 → DeepSeek → 结构化建议；密钥存 Function secrets |
| 实时 | Realtime `postgres_changes` 监听 `applications` 表 |
| 免费层限额 | 200 活跃用户 / 500MB 数据库 / 1GB Storage —— 个人校招使用远超需求 |
| 备份 | 云端数据库自带备份，已移除 v1.0 的 JSON/CSV 手动导出导入 |

---

## 关于 v1.0 本地版

v1.0（IndexedDB 单机版）的数据迁移已经完成，迁移 banner 与 `db/migrate.ts` 于 2026-10-24 删除；**不要恢复**。旧数据如需抢救，用旧版构建在浏览器里导出。

---

## 技术栈

| 层 | 选型 | 版本 |
|---|---|---|
| 构建 | Vite + vite-plugin-pwa | 8.3.5 / 2.0.0 |
| 框架 | React / React DOM | 19.3.1 |
| 语言 | TypeScript | ~6.0.3（strict / verbatimModuleSyntax） |
| 路由 | react-router-dom | 7.18.4 |
| 样式 | Tailwind CSS（CSS-first） | 4.3.3 |
| BaaS | @supabase/supabase-js（Auth + Postgres + Storage + Realtime） | 2.118.0 |
| 图标 | lucide-react | 1.61.0 |
| 测试 | Vitest | 5.0.5 |
| Lint | oxlint | 1.88.0 |

**已移除**（v1.0 遗留）：dexie、dexie-react-hooks、fake-indexeddb、CSV 工具、备份导入导出。

---

## 目录结构

```
app/
├─ .env.local                  # Supabase URL / ANON KEY（gitignore）
├─ supabase/
│  ├─ migrations/              # SQL：001 建表 / 002 tier→color / 003 状态管线 / 004 置顶 / 005 用户档案 / 006 简历与 AI 建议
│  └─ functions/analyze-job/   # Edge Function（Deno）：读简历 + 岗位要求 → DeepSeek
├─ scripts/gen-icons.ps1       # GDI+ 绘制 PWA 图标
├─ public/                     # favicon.svg、pwa-192/512.png、apple-touch-icon.png
├─ src/
│  ├─ main.tsx                 # BrowserRouter 入口
│  ├─ App.tsx                  # 路由壳：/login /register /(AuthGuard)/
│  ├─ features/
│  │  ├─ MainApp.tsx           # 主页面（列表/统计/邮箱/退出/「投递」入口）
│  │  ├─ ProfilePage.tsx       # /me：自我评价 + 简历上传/文本 + 账号概览
│  │  ├─ WelcomeOverlay.tsx    # 首次进入的引导层
│  │  ├─ auth/                 # LoginPage / RegisterPage / AuthGuard / AuthLayout / EmailInput
│  │  ├─ intents/              # IntentPanel（找岗位 → 收录意向）、AdvicePreview（建议展示）
│  │  ├─ applications/         # 表单、列表、行、公司分组、useApplications、formSchema
│  │  └─ questions/            # QuestionPanel（题目 + 图片上传/预览）
│  ├─ db/
│  │  ├─ schema.ts             # 类型 + 枚举 + 颜色常量 + isMissingSchemaError（唯一来源）
│  │  ├─ applications.ts       # Supabase CRUD
│  │  ├─ questions.ts          # 题目 CRUD + Storage 上传/签名
│  │  ├─ profiles.ts           # 用户档案、简历上传/删除/元数据
│  │  └─ ai.ts                 # analyzeJob：调 Edge Function + 错误码归一
│  ├─ lib/                     # supabase 客户端、date/url/jobSearch/color 纯函数、useDialog、webmail
│  ├─ components/              # Drawer/Modal/Toast/Toolbar/StatsBar/StatusBadge/EmptyState/Ornament/WebmailMenu
│  └─ test/                    # 纯函数单测（44 个用例：url / date / filterAndSort / jobSearch）
└─ dist/                       # 构建产物（含 sw.js、manifest.webmanifest）
```

---

## 相关文档

| 文件 | 内容 |
|---|---|
| `../工作进程.md` | 交接入口（会话 / IDE 切换时先读它） |
| `../docs/2026-10-26-0245-投递闭环与AI简历建议.md` | v3.0 投递闭环：006 迁移、Edge Function、前端改动、上线前置 |
| `../docs/2026-10-26-0225-ApplyFolio更名与逐岗位网址.md` | 品牌更名与逐岗位独立网址 |
| `../docs/2026-10-25-穆夏书册重设计.md` | 视觉重设计（穆夏书册令牌） |
| `../docs/01-需求说明.md` | ⚠️ v1.0 历史存档，功能清单已过时 |
| `../docs/02-开发文档.md` | ⚠️ v1.0 历史存档，代码骨架已过时 |

## License

个人使用工具，无 License 声明。数据在你自己的 Supabase 项目里，永远属于你。
