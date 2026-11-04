# UI Review

- 审查目标：`src/prototypes/agent-game-finance`
- 使用设计依据：**未确认**（`axhub.config.json` 中 `projectDefaults.defaultTheme` 为 `null`，原型未绑定主题 `DESIGN.md`）
- 生成时间：2026-07-21

> **设计依据说明**：按 `rules/ui-review-guide.md`，规范性对比须以单一 `DESIGN.md` 为准。当前原型通过 `style.css` 自建 B 端后台 token（主色 `#4165d7`、侧栏 `#2C324E` 等），与 `src/themes/*/DESIGN.md` 均无绑定记录。本次在 **degraded** 模式下完成实现质量、内部一致性、可访问性与响应式评审；待确认 `DESIGN.md` 后须补做设计系统一致性复核。

## 总体点评

代理游戏财务平台已形成较完整的 B 端后台组件体系：固定侧栏 + 顶栏面包屑 + 卡片式内容区，11 个业务页共享 `FilterBar`、`DataTable`、`Modal`/`Drawer`、`StatusBadge` 等元件，视觉 token 在 `style.css` 内自洽，列表/表单/浮层交互模式跨页一致，Toast 反馈与空状态处理到位，适合作为需求评审与验收演示载体。

主要风险不在单页 polish，而在**跨视口可用性**与**键盘/读屏可访问性**：全站 CSS 未发现任何 `@media` 断点，220px 固定侧栏与宽表格在窄屏下可用性显著下降；大量控件以 `outline: none` + 边框变色作为唯一焦点提示，侧栏分组折叠控件虽设 `role="button"` 但未绑定 Enter/Space。顶栏下载/用户图标呈可操作外观却无交互，易误导财务操作人员。

亮点：面包屑带 `aria-label`；Modal/Drawer 支持 Esc 关闭且关闭按钮有 `aria-label`；`StatusBadge` 以文字 + 色彩双通道表达状态；批注面板与业务浮层通过 `OverlayScope` 协调，不破坏主流程布局。

## P0-P3 优先级问题

### P1 - 全站缺少响应式断点与移动端导航策略

- 证据：`style.css` 全文无 `@media` 规则；`.agf-sidebar` 固定 `220px` 宽且始终展示；`.agf-table-wrap` 仅依赖横向滚动，无侧栏折叠/抽屉化方案。源码路径：`style.css` L27–37、L293–302。
- 影响：窄屏或分屏场景下有效内容区被侧栏与宽表挤压，查询栏换行后操作按钮离表格更远，财务核对任务效率明显下降；不符合常见后台「桌面优先但需基本可用」预期。
- 修复方向：至少增加 tablet/mobile 断点——侧栏改为可收起或 overlay drawer；查询栏在 `<768px` 改为纵向堆叠并保证主按钮触达区 ≥44px；表格区保留横向滚动但加 sticky 首列或列优先级裁剪。

### P1 - 键盘焦点可见性不足，侧栏分组不可键盘操作

- 证据：`.agf-input:focus`、`.agf-btn`、`.agf-sidebar__item-btn` 等普遍 `outline: none`，仅边框变色；全文件仅 `.agf-radio-item input:focus-visible` 一处显式焦点环（L777–779）。`Sidebar.tsx` L35：`role="button" tabIndex={0}` 的 `.agf-sidebar__parent` 无 `onKeyDown` 处理 Enter/Space。
- 影响：键盘用户难以确认当前焦点位置，侧栏分组无法纯键盘展开/收起，构成 WCAG 2.4.7 / 2.1.1 级可访问性风险。
- 修复方向：为按钮、链接、侧栏项统一添加 `:focus-visible` 环（建议 2px solid `--color-primary` + offset）；侧栏 parent 补键盘 handler 或改为 `<button type="button">`；Modal 打开时实现 focus trap 并将焦点移入对话框。

### P2 - 顶栏装饰图标呈「可点击」外观却无交互

- 证据：`AdminLayout.tsx` L32–34：`<Download />`、`<User />` 与「管理员」文案并列，尺寸 18px，位于 `.agf-header__actions`，无 `button`/`aria-label`/点击处理；图标 `aria-hidden`。
- 影响：用户会尝试点击下载或账户入口，产生「功能缺失」感知，削弱对后台完整度的信任。
- 修复方向：若原型阶段不做功能，改为弱化静态文案或加 `title="演示占位"` 并降低对比度；若保留图标，应包在可聚焦按钮内并给出明确占位反馈（Toast「演示环境未接入」）。

### P2 - Modal/Drawer 对话框语义与焦点管理不完整

- 证据：`Modal.tsx` L28：`role="dialog"` 但无 `aria-modal="true"`、无 `aria-labelledby` 关联标题；打开时未将焦点移入对话框或限制 Tab 循环。Drawer 同样缺少标题 id 关联。
- 影响：读屏用户可能无法正确感知模态上下文；Tab 可能穿透到背景列表，造成误操作（财务场景下标记付款、申请付款等高风险动作）。
- 修复方向：为标题元素设 `id`，对话框设 `aria-labelledby` + `aria-modal="true"`；打开时 `focus()` 到首个可交互控件或关闭按钮，关闭后还原触发元素焦点；可选增加背景 `inert`。

### P3 - 列筛选浮层箭头存在 border-accent-on-rounded 视觉冲突

- 证据：Impeccable `detect.mjs` 命中 `style.css` L238：`.agf-col-filter__menu::before` 使用 `border-bottom: 7px solid` 三角形箭头，容器 `border-radius: 2px`；规则 `border-accent-on-rounded`（warning）。
- 影响：纯视觉 polish，不影响筛选功能；箭头与圆角容器边缘在部分缩放下略显生硬。
- 修复方向：改用独立 SVG 箭头或去掉菜单圆角/改用无圆角 popover；或参考 DESIGN.md 确认后统一浮层 elevation 规范。

## 核心元件

### 应用壳层（Sidebar + Header + 内容区）

- **保留点**：三栏信息架构清晰（游戏支付 / 财务分成 / 数据统计）；当前页高亮（`.agf-sidebar__item-btn--active`）与四级面包屑（业务中台 → 代理游戏台账 → 分组 → 页标题）帮助定位；侧栏分组可折叠减少纵向噪音。
- **调整点**：侧栏 active 态为整块蓝底填充，与常见「左侧指示条」模式不同但可接受；需补键盘与窄屏策略（见 P1）。顶栏批注开关 `AnnotationToggle` 语义清楚，与业务操作分区合理。

### 列表查询栏（FilterBar + BusinessTypeSelect + ListSearchFields）

- **保留点**：业务类型切换置于最左，符合「数据范围优先」心智；查询字段按页模式复用一致；主操作（添加、导出、数据拉取等）在第二行或 inline 位置稳定。
- **调整点**：多字段 + 月份范围 + 列筛选并存时，单屏决策点常 >4 项，认知负荷偏高；可考虑将次要筛选收入「更多筛选」折叠。输入框/下拉 32px 高度与 13–14px 字号在桌面可读，移动端需放大触达区。

### 数据表格（DataTable + Pagination + ColumnFilter/Sort）

- **保留点**：表头 `#FAFAFA`、行 hover、金额列右对齐、空状态插画 + 文案、分页「共 N 条」信息完整；`leadingRow`/`trailingRow` 支持汇总行（收入汇总统计）设计合理。
- **调整点**：列筛选/排序触发器依赖颜色变化表达 active，色弱用户需依赖文字状态；Portal 防裁切已实现，但浮层箭头样式见 P3。宽表仅横向滚动，小屏需配合侧栏收起。

### 浮层（Modal / Drawer / Toast）

- **保留点**：Esc 关闭、遮罩点击关闭、关闭按钮 `aria-label="关闭"`；Drawer 宽度 730px / `max-width: 90vw` 对表单密集页友好；成功/错误 Toast 覆盖主要提交路径。
- **调整点**：对话框 ARIA 与 focus trap 见 P2；部分 Drawer（结算函、标记付款）字段多，建议固定 footer 操作区便于长表单滚动。

### 表单与状态（FormFields + StatusBadge + MonthRangePicker）

- **保留点**：必填校验 + 字段级 `FieldError`；`StatusBadge` 文字标签避免纯色彩语义；月份范围选择器展开态边框用主色，与输入框 focus 规则一致。
- **调整点**：表单 focus 仍缺统一 `:focus-visible` 环；只读字段与可编辑字段对比度可再强化（尤其合同金额、预付分成等财务字段）。

## 响应式与可访问性

- **响应式**：已检查 `style.css` 与布局组件，**未发现 `@media` 断点**；Drawer `max-width: 90vw`、Modal `max-height: 90vh` 为仅有的视口适配。结论：当前按桌面宽屏设计，移动端/窄屏为明显短板（P1）。
- **可访问性**：部分语义（面包屑、关闭按钮、空状态图标 `aria-hidden`）良好；**键盘焦点、对话框模态语义、侧栏键盘操作**存在缺口（P1/P2）。色彩对比方面，正文 `#333` on `#fff`、侧栏白字 on `#2C324E` 在桌面尺寸下大致可达 AA，但未在浏览器中逐像素验证。
- **色觉**：状态标签同时提供中文文案（已付款/未付款等），不单靠颜色，符合最佳实践。

## 证据与评估说明

- **浏览器/截图**：未使用。本地 dev server 可用（`http://localhost:51721/prototypes/agent-game-finance`），本会话无浏览器自动化，视觉与对比度结论来自源码审查。
- **Scanner**：已运行 `rules/references/impeccable/scripts/detect.mjs`，命中 1 条 warning（`border-accent-on-rounded`，`style.css:238`），已纳入 P3。
- **独立评估**：**degraded** — 无已确认 `DESIGN.md`，无浏览器实勘；设计评估与证据评估在同一会话内顺序完成，未使用子代理隔离。
