# JobCompass · 校招投递记录本

> 校招投递进度与笔试面试题目记录工具。Supabase 云端存储，多设备同步，可安装为桌面/手机应用。

- **云端版 v2.0**：邮箱注册登录，数据存 Supabase PostgreSQL，换浏览器/设备不丢数据
- **优先级颜色标记**：红橙黄绿自定义色，一眼区分投递重要程度
- **题目记录**：每条投递可记笔试/面试题目，支持截图上传与放大查看
- **个人主页**：账号信息、**自我评价**（云端保存，最多 1000 字）、登录状态与数据概览
- **可安装 (PWA)**：浏览器地址栏一键"安装"成独立窗口应用
- **当前版本：v2.0（已上线 https://jobcompass-silk.vercel.app ；2026-10-26 已发布最新版，含穆夏书册视觉与自我评价）**

---

## 快速开始

要求 Node v22+ / npm 10+，以及一个 [Supabase](https://supabase.com) 项目（Free 层即可）。

### 1. 配置 Supabase（一次性）

1. Supabase Dashboard → **SQL Editor** → 执行 [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)（建表 + RLS + Storage 策略 + 触发器）
   - 若你之前执行过含 `tier` 列的旧版 001，再补执行 [`002_tier_to_color.sql`](supabase/migrations/002_tier_to_color.sql)
   - 已有库升级：补执行 [`005_user_profile.sql`](supabase/migrations/005_user_profile.sql)（新增 `user_profiles` 表，个人主页「自我评价」依赖它）
2. Dashboard → **Storage** → 创建私有 Bucket：`question-images`
3. Dashboard → **Authentication → Providers → Email** → 开发期关闭 "Confirm email"
4. Dashboard → **Database → Replication** → 勾选 `applications` 表（Realtime 生效）

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
npm test            # 单元测试：vitest run（当前 22 个用例）
npm run lint        # 代码检查：oxlint（应保持 0 warning 0 error）
```

---

## 安装为应用（PWA）

构建产物含 `manifest.webmanifest` 与 Service Worker：

- **桌面 Chrome/Edge**：地址栏右侧出现安装图标 →「安装 JobCompass」→ 独立窗口 + 任务栏图标
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
| 2.1 | 账号 | 个人主页 `/me`：账号信息、**自我评价**（1000 字内，保存到云端）、登录状态与数据概览 |
| 3 | 录入 | 新增投递（右侧抽屉表单，投递日期默认今天） |
| 4 | 录入 | 编辑投递（点行打开，预填全部字段） |
| 5 | 录入 | 表单校验（公司/岗位必填、网址格式、日期合法且不晚于今天、颜色 hex 合法） |
| 6 | 录入 | 公司名历史联想（原生 `<datalist>`） |
| 7 | 录入 | 快捷键 `Ctrl / ⌘ + Enter` 提交；关闭前未保存确认 |
| 8 | 分级 | **优先级颜色标记**：预设红/橙/黄/绿/蓝/紫色板 + 任意自定义取色器 |
| 9 | 列表 | 关键词搜索（公司/岗位）、状态多选筛选、三种排序（日期/更新/公司名） |
| 10 | 列表 | 行内颜色标识：左侧色条 + 公司名后圆点，悬停查看色值 |
| 11 | 状态 | 徽章点选即改；终态 `Offer / 已挂 / 已放弃` 不计入"进行中" |
| 12 | 统计 | 顶部四项：总投递 / 进行中 / Offer / 已挂放弃 |
| 13 | 题目 | 每条投递的题目记录抽屉：文字记录，按时间倒序 |
| 14 | 题目 | 图片上传（单条最多 10 张）→ Supabase Storage 私有桶 |
| 15 | 题目 | 缩略图墙 + 点击全屏放大（签名 URL，1 小时有效） |
| 16 | 网址 | 一键打开岗位链接 / 复制链接；裸域名自动补 `https://` |
| 17 | 删除 | 删除后 6 秒内可撤销（Toast） |
| 18 | 邮箱 | 快捷邮箱按钮：左键新标签打开 Webmail（Gmail/QQ/163/Outlook），右键切换服务商 |
| 19 | 同步 | Supabase Realtime：多标签/多设备数据变更自动刷新 |
| 20 | 迁移 | 首登检测到 v1.0 本地 IndexedDB 数据 → 一键迁移（备注自动转为题目记录） |
| 21 | 安全 | URL 拒绝 `javascript:` 等伪协议；RLS 保证只能读写自己的数据 |
| 22 | PWA | 可安装为独立应用，自动更新 |

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
  status: 'applied' | 'written' | 'interview' | 'offer' | 'rejected' | 'withdrawn'
  channel: string | null
  color: string | null  // hex 优先级颜色
  created_at: string    // ISO timestamp
  updated_at: string    // ISO timestamp（触发器自动维护）
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
| 图片访问 | 签名 URL（1 小时有效期），Storage 策略按首段文件夹 = uid 校验 |
| 实时 | Realtime `postgres_changes` 监听 `applications` 表 |
| 免费层限额 | 200 活跃用户 / 500MB 数据库 / 1GB Storage —— 个人校招使用远超需求 |
| 备份 | 云端数据库自带备份，已移除 v1.0 的 JSON/CSV 手动导出导入 |

---

## 从 v1.0（本地版）迁移数据

1. 用旧版数据的浏览器登录新版
2. 顶部出现琥珀色「检测到本地旧数据」banner → 点击「开始迁移」
3. 逐条写入 Supabase，旧 `note` 字段自动转为该投递的第一条题目记录
4. 迁移完成自动清除本地 IndexedDB（`job-compass` 库），并在 localStorage 打标防止重复迁移
5. 也可点「稍后处理」跳过，刷新页面仍会再次提示（除非已打标）

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
├─ supabase/migrations/        # SQL：001 建表、002 tier→color
├─ scripts/gen-icons.ps1       # GDI+ 绘制 PWA 图标
├─ public/                     # favicon.svg、pwa-192/512.png、apple-touch-icon.png
├─ src/
│  ├─ main.tsx                 # BrowserRouter 入口
│  ├─ App.tsx                  # 路由壳：/login /register /(AuthGuard)/
│  ├─ lib/supabase.ts          # Supabase 客户端单例
│  ├─ features/
│  │  ├─ MainApp.tsx           # 主页面（列表/统计/邮箱/退出/迁移 banner）
│  │  ├─ MigrationBanner.tsx   # v1.0 数据迁移引导
│  │  ├─ auth/                 # LoginPage / RegisterPage / AuthGuard
│  │  ├─ applications/         # 表单、列表、行、useApplications、formSchema
│  │  └─ questions/            # QuestionDrawer（题目 + 图片上传/预览）
│  ├─ db/
│  │  ├─ schema.ts             # 类型 + 枚举 + 颜色常量（唯一来源）
│  │  ├─ applications.ts       # Supabase CRUD
│  │  ├─ questions.ts          # 题目 CRUD + Storage 上传/签名
│  │  └─ migrate.ts            # 原生 IndexedDB 读取 + 迁移
│  ├─ components/              # Drawer/Modal/Toast/Toolbar/StatsBar/StatusBadge/EmptyState
│  └─ test/                    # url / date 纯函数测试
└─ dist/                       # 构建产物（含 sw.js、manifest.webmanifest）
```

---

## 相关文档

| 文件 | 内容 |
|---|---|
| `../工作进程.md` | 交接入口（会话 / IDE 切换时先读它） |
| `../docs/01-需求说明.md` | ⚠️ v1.0 历史存档，功能清单已过时 |
| `../docs/02-开发文档.md` | ⚠️ v1.0 历史存档，代码骨架已过时 |

## License

个人使用工具，无 License 声明。数据在你自己的 Supabase 项目里，永远属于你。
