# ApplyFolio

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

参加校招的个人求职者，使用桌面与手机记录投递、跟进招聘进度，并查阅笔试和面试题目。

## Product Purpose

以公司与岗位为单位保留投递记录，让每次投递的进度、网址、题目文字和截图能够集中查找。

## Operating Context

已有 React / Vite / TypeScript 工程。邮箱密码登录，Supabase 存储与多设备同步，可安装为 PWA。
主路径为登录或注册 → 欢迎层 → 投递簿 → 投递详情/编辑抽屉；账号页位于 /me。

## Capabilities and Constraints

- 搜索、状态多选、排序、公司分组折叠、每页 15 家公司、记录置顶与自由颜色标识。
- 同一公司多个岗位仍为独立记录。招聘状态与标签以 src/db/schema.ts 为单一来源。
- 编辑抽屉保留题目/备注与编辑信息两个标签页，题目支持文字与图片。
- 本轮用户要求页面结构相对一致，重新设计视觉；保留既有业务和操作路径。
- 不增加 LLM 匹配、数据看板或协作模块。

## Brand Commitments

品牌名 ApplyFolio，不设中文名（2026-10-26 由 JobCompass / 校招投递记录本更名）。
2026-10-25 用户确认本轮方向为「穆夏书册：纸张、深青、细金线，整体更精致克制」。
此前设计约束来自 ../docs/2026-10-24-2215-穆夏艺术风格前端设计文档.md；在结构相对一致的前提下重设计视觉。

## Evidence on Hand

可复用 src/assets/mucha-compass.jpg 与 src/assets/mucha-floral.jpg 两张既有插图。
产品事实与约定见 ../工作进程.md、现有代码及 ../docs/ 下的体验和设计记录。
界面验收使用隔离的本地模拟投递，真实账号数据仍来自 Supabase。

## Product Principles

- 先让投递进度、公司与岗位易于扫描，再安排艺术表现。
- 保留明确的新增、编辑、筛选和查看题目入口。
- 真实数据与演示数据保持区别，统计从记录计算。
- 桌面与手机都能完成核心操作，键盘焦点可见且可回归。
