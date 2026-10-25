---
version: 1
slug: "src-features-mainapp-tsx"
primary_target: "src/features/MainApp.tsx"
related_targets: ["src/features/auth/LoginPage.tsx","src/features/auth/RegisterPage.tsx","src/features/WelcomeOverlay.tsx","src/features/ProfilePage.tsx"]
---

# JobCompass 界面重设计

Scope: 投递簿、登录/注册、欢迎层、个人主页及工具浮层。Mode: Operate。
用户已确认：保持结构相对一致，可复用现有插图；视觉为纸张、深青、细金线的穆夏书册。

## Data and jobs

对象为公司、独立岗位、日期、招聘进度、置顶、自由颜色、岗位链接与题目。
主问题：哪些公司的哪些岗位正在推进？主动作：添加投递、查看题目、更新状态。
记录总数从数据计算，公司按首次出现聚合，终态和置顶继续遵循原排序。
保留邮箱密码认证、每标签欢迎层、/me、搜索/多选筛选/排序/分页与编辑抽屉。
演示记录仅在隔离 QA 入口使用；生产数据与业务仓储不改。

## Direction contract

THESIS: 以穆夏书册的纸张和装订秩序承载日常招聘记录，保持工作界面熟悉易用，拒绝满屏画框和奖章对内容的争抢。

OWN-WORLD: 象牙页底、白纸工作面、松针深青主操作、窄金线收边；宋体题名与无衬线操作形成清晰层级。既有版画在认证和欢迎层承担艺术表达，主列表以真实公司与进度为主。

STORY: 用户先识别 JobCompass 和投递范围，再通过搜索和状态缩小记录，点击岗位进入原有题目/编辑抽屉，主动作一眼可见。

FIRST VIEWPORT: 居中的约 1040px 内容列；顶栏左品牌、右简洁数字统计及账号；下方单纸面含左题名右新增、搜索排序、状态筛选和对齐列表。移动端统计摘要和折叠筛选保留，首条记录进入首屏。认证仍左图右表单，欢迎仍左人物右问候与入口。

FORM: 用户锁定的穆夏书册优先于随机方向；Taste Skill editorial-greeting 的个人工作区字级、规则网格及轻面板映射到原有顶栏布局，不引入侧栏。Impeccable seed:2772a3535436861d；已运行方向校验，以用户指定的材质和结构为准。特色是细线版心与静态页边签；真实状态色仅用于记录。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Acceptance

保留路由与操作路径。Edge 检查 1440/768/390/320px、空态、筛选、长内容、抽屉与键盘；类型、单测和构建通过。复用两张插图并记录来源，不新增图片。
