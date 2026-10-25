---
name: "JobCompass — 穆夏书册"
description: "纸张、深青、细金线，精致克制的校招投递记录簿。"
colors:
  brand-50: "#f0f4ef"
  brand-100: "#e1eae1"
  brand-200: "#c4d6c8"
  brand-600: "#3d6857"
  brand-700: "#315b4c"
  brand-800: "#244c40"
  brand-900: "#1b3d33"
  ink-100: "#efeee7"
  ink-200: "#ddddd2"
  ink-300: "#bdbfb3"
  ink-400: "#8e9488"
  ink-500: "#6a7167"
  ink-600: "#60685e"
  ink-700: "#4a5349"
  ink-900: "#242e26"
  gilt-100: "#f2eddf"
  gilt-200: "#e0d5bb"
  gilt-300: "#cab990"
  gilt-400: "#ae9765"
  gilt-600: "#876d3a"
  tang: "#d9a441"
  moss: "#6b8968"
  lagoon: "#67838b"
  plum: "#8c8191"
  paper: "#f1eee5"
  page: "#fffef9"
typography:
  display:
    fontFamily: "Georgia, \"Times New Roman\", \"Songti SC\", serif"
    fontSize: "25px"
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "\"Songti SC\", \"STSong\", \"SimSun\", Georgia, serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "\"Songti SC\", \"STSong\", \"SimSun\", Georgia, serif"
    fontSize: "22px"
    lineHeight: 1.25
  body:
    fontFamily: "\"PingFang SC\", \"Microsoft YaHei\", \"Helvetica Neue\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
  label:
    fontFamily: "\"PingFang SC\", \"Microsoft YaHei\", \"Helvetica Neue\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  caption:
    fontFamily: "\"PingFang SC\", \"Microsoft YaHei\", \"Helvetica Neue\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
  stat:
    fontFamily: "Georgia, \"Times New Roman\", \"Songti SC\", serif"
    fontSize: "30px"
    lineHeight: 1.1
rounded:
  control: "6px"
  field: "8px"
  paper: "12px"
  pill: "9999px"
spacing:
  "4": "4px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
  "30": "30px"
  "32": "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand-800}"
    textColor: "{colors.page}"
    rounded: "{rounded.control}"
    padding: "0 22px"
  button-primary-hover:
    backgroundColor: "{colors.brand-700}"
    textColor: "{colors.page}"
  button-ghost:
    textColor: "{colors.ink-500}"
    rounded: "{rounded.field}"
    size: "36px"
  search-input:
    textColor: "{colors.ink-900}"
    rounded: "{rounded.field}"
    height: "44px"
    padding: "0 44px 0 36px"
  chip-selected:
    backgroundColor: "{colors.brand-50}"
    textColor: "{colors.brand-900}"
    rounded: "{rounded.control}"
    padding: "0 10px"
  chip-idle:
    textColor: "{colors.ink-600}"
    rounded: "{rounded.control}"
    padding: "0 10px"
  paper:
    backgroundColor: "{colors.page}"
    rounded: "{rounded.paper}"
  utility-nav:
    backgroundColor: "{colors.page}"
    rounded: "{rounded.pill}"
    padding: "4px"
---

# Design System: JobCompass

## Overview

**Creative North Star: "穆夏书册：纸张、深青、细金线，整体更精致克制"**

以书册的纸张和装订秩序承载日常投递记录。象牙页底托起白纸工作面，深青承担题名、品牌与主要操作，细金线建立版心；宋体题名、Georgia 字标和系统无衬线界面各司其职。

艺术表达集中在认证和欢迎场景的既有版画。工作页面优先呈现公司、岗位与进度，以对齐、留白和轻分隔保持可扫描性；个人主页沿用一张纸上的分节秩序。

**Key Characteristics:**
- 象牙底与白纸工作面，平面优先。
- 深青主操作，金色限于细线和小幅装饰。
- 宋体题名、Georgia 字标、无衬线操作文字。
- 移动端重排内容，保留状态与动作入口。

覆盖投递簿、认证、欢迎层、个人主页及抽屉/题目/工具浮层。依据 src/index.css、MainApp、Toolbar、StatusBadge、Drawer、Ornament、AuthLayout、WelcomeOverlay 与 ProfilePage 的实际实现提取。PRODUCT.md 约束产品事实；.impeccable/surfaces/src-features-mainapp-tsx.md 保留页面策略。本文件不把单页构图升级为全站模板；历史设计文档保留为历史。

## Colors

暖纸色和低饱和深青构成主调，金线与淡彩承担小面积信息。色值以 frontmatter 为准；它记录重用令牌的子集，完整色阶仍在 CSS。

### Primary

- **松针深青**（brand-800）：主按钮、图标和链接；悬停向 brand-700 变化。
- **林地深青**（brand-900）：字标、题名、统计和插画栏深底。
- **浅鼠尾草**（brand-50/100/200）：选中、悬停与细环；brand-600 用于焦点。

### Secondary

- **细金线**（gilt）：纸面边框、分隔、拱形画框与深底辅助说明；不承担正文主色。

### Tertiary

- **金盏、鼠尾草、灰蓝、藕紫**（tang/moss/lagoon/plum）：招聘状态的点、淡底与细环，正文仍为墨色。状态映射以 src/db/schema.ts 为源。

### Neutral

- **象牙纸底**（paper）与 **白纸**（page）：页面底及主要工作面；输入和菜单另保留现有白色/半透明白色。
- **暖墨**（ink-900）：正文；ink-700 为标签，ink-600 为辅助文字与占位文字，ink-500 主要承载轻图标。
- **纸灰边界**（ink-100/200/300）：分节、输入框和低强调边界。ink-400 用于较轻图标或点，不作为占位文字默认色。

**The Fine Gold Rule.** 金色建立边界和分隔，保持窄线与小装饰；不要把金色扩展成主要按钮或大片背景。

错误/危险动作沿用现有 Tailwind 红色工具类；记录的用户自选颜色是数据。二者不在此另立品牌色阶。

## Typography

**Display Font:** Songti SC / STSong / SimSun / Georgia / serif。  
**Body Font:** PingFang SC / Microsoft YaHei / Helvetica Neue / ui-sans-serif / system-ui / sans-serif。  
**Wordmark Font:** Georgia / Times New Roman / Songti SC / serif。

宋体使题名接近印刷书页，Georgia 的拉丁字形用于字标与欢迎统计；无衬线承担密集信息。当前不加载网络字体，也没有统一的等比字号系统。

### Hierarchy

- **Display:** 顶栏字标（25px，字距 -0.035em）；认证插画栏（30px）。
- **Headline:** 投递簿（30px、600、行高 1.25），窄屏（26px）。认证题名行高（1.3），欢迎题名（30px、500、行高 1.45），窄屏按实现为（26px/27px）。
- **Title:** 抽屉（22px、宋体、行高 1.25），个人主页（24px）。
- **Body:** 记录与界面正文常用（14px），岗位辅助/状态/认证描述常用（13px）；输入窄屏（16px）、较宽屏（14px）。
- **Label / Caption:** 状态和筛选（13px、500），辅助说明（11–12px）；日期与统计使用等宽数字。
- **Stat:** 欢迎统计 Georgia（30px、行高 1.1），顶栏无衬线（22px、行高 1.1）。

**The Separate Voices Rule.** 宋体用于题名，Georgia 用于品牌与欢迎统计，无衬线用于记录、表单和操作。

## Layout

工作页为纵向视口布局（100dvh）：顶栏、独立滚动工作区和不覆盖内容的底部工具带。主框上限（1100px）、桌面左右内边距（30px），形成居中工作纸面（1040px）。工作区内边距（34px 30px），标题区（30px 30px 24px）；767px 以下分别为（20px 16px）与（22px 18px 20px）。顶栏最小高桌面（90px）、窄屏（76px）。工具带为独立 flex 项，底部留白考虑安全区域。

列表桌面按公司/岗位、日期、状态、动作对齐；sm（640px）以下，公司/岗位占第一行，日期并入文字，状态与动作占下一行。移动筛选收为按钮，sm 起展示筛选条。360px 及以下移除状态额外缩进。md（768px）起顶栏显示详细统计，窄屏在题名下保留摘要。

认证书册上限（960px），两等列；899px 以下单列（上限 440px），隐藏大插画面，改为小幅品牌图。欢迎书册上限（860px）、左栏（340px）；767px 以下收窄，599px 以下上下堆叠（上限 390px）。个人主页保持一张纸的分节：桌面题签列（150px）配内容，599px 以下单列。右侧抽屉上限（448px），正文独立滚动。

间距采用观察到的 4/8px 节奏并保留 12/20/28/30px 等局部值，不强制统一全部表单和纸面留白。

## Elevation & Depth

纸面、顶栏与书册默认平面，通过底色、金线和纸灰边界分层。抽屉使用墨色（30%）遮罩、左金线与现有 Tailwind shadow-xl；状态及工具菜单保留环境阴影。阴影准确展开值由项目 Tailwind 版本控制，不另造数值令牌。

**The Paper First Rule.** 静态工作面以底色与细边界区分，临时浮层才使用遮罩或环境阴影。

按钮和账号背景变化常用（160ms）；抽屉进入（220ms）、弹入（200ms），采用 cubic-bezier(0.22, 1, 0.36, 1)；淡入和折叠（180ms、ease-out）。减少动态偏好关闭命名进入动画，并将其他过渡/动画缩短为（0.01ms）。

## Shapes

纸面和书册采用柔和圆角（12px）与细边界（1px）；主按钮（6px），搜索与普通图标动作（8px），认证输入覆盖为（6px）。筛选轻圆角，状态与底部导航为胶囊，账号为圆形。圆拱保留给既有插画框及移动缩略画，不推广为通用容器。

## Components

### Buttons

主按钮深青配白纸字色，最小高（44px），桌面横向内边距（22px）、767px 以下（16px），字号/字重（14px/500）；悬停切换稍浅深青背景和边框。禁用透明度（0.65），提交时等待光标。轻图标动作移动端（36px）、桌面（32px），顶栏账号（40px），采用浅底悬停；删除保留危险红。全局键盘焦点为深青轮廓（2px）、外偏移（2px）。

### Chips

筛选圆角（6px）、文字（13px/500）、横向内边距（10px），最小高移动（44px）、sm 起（36px）。选中浅青底/深青字/浅青内环，未选中辅助墨色并以纸灰底悬停。状态胶囊有语义淡彩底、细环和文字，修改入口最小高移动（36px）、sm 起（32px）。

### Cards / Containers

白纸、12px 圆角和单细线构成工作面。投递簿金线，个人主页纸灰边界，内部轻分隔。认证和欢迎沿用深青插画面与白纸内容面的书册关系，按实际断点重排。

### Inputs / Fields

搜索高（44px），为搜索/清除图标留位；白色（80%）底、纸灰边界、8px 圆角。认证输入高（46px）、白底、6px 圆角。占位文字使用 ink-600、不降低透明度。焦点深青边界与轻环（2px、15%）。应用提供搜索清除入口，WebKit 原生搜索清除按钮已隐藏。

### Navigation

纸底顶栏左品牌、右统计和账号，底金线收束；圆形白纸账号入口悬停浅青。底部工具导航胶囊位于独立工具带，邮箱面板向上展开。键盘跳至记录链接可见。移动摘要替代详细统计，不引入侧栏。

### Drawer / Questions

抽屉宋体题名、细金分隔，头部/正文/底部动作分区，正文滚动。题目/编辑标签保持原路径；题目图片属于用户内容。对话层保留 Escape 关闭、焦点约束及关闭后归还焦点。

## Do's and Don'ts

### Do:
- **Do** 从 src/index.css 和组件实现取值；运行时样式仍以代码为源。
- **Do** 让语义状态色同时保留文字标签。
- **Do** 保持焦点可见、占位文字可读，并遵循减少动态偏好。
- **Do** 让底部工具带占据独立空间，最后一行与分页仍可完整到达。
- **Do** 复用既有植物与罗盘版画，保留文件内来源信息。

### Don't:
- **Don't** 让金色或装饰画框压过公司、岗位与主动作。
- **Don't** 用衬线字体替换全部表单和记录文字。
- **Don't** 用固定工具层遮住列表末尾，或把窄屏状态和行操作挤在一起。
- **Don't** 把旧注释中的渐变字标、双线角花或奖章恢复为通用规范。

未纳入规范、未修复的历史漂移：Ornament.tsx 与 CSS 的部分注释仍描述旧渐变、双线角花和奖章，当前实现为纯色字标、单线纸面和普通统计。本文记录实际输出，不把过时注释或单处装饰提升为系统规则。未因文档提取修改 UI 或业务源文件。
