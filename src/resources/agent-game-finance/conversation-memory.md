# 代理游戏台账 — 对话记忆 / 项目上下文

> **用途**：在新 Cursor 对话中快速恢复本项目背景、已做决策和待办，避免重复对齐。  
> **UI 细节**：改样式、表单、抽屉、分页等请优先读 [`ui-spec.md`](./ui-spec.md)。  
> **最后更新**：2026-07-15（预付分成公式/两位小数、结算函 PDF 下载、标记付款/空状态等）  
> **对应 Git**：见文末「Git 状态」；远程 https://github.com/carrielilian/49game.git `main`（本地可能有未推送改动）

---

## 在新对话里如何调取这份记忆

1. **@ 引用文件（推荐）**  
   在新对话输入框输入 `@`，选择或粘贴路径：  
   `src/resources/agent-game-finance/conversation-memory.md`  
   可同时 @ `ui-spec.md` 做 UI 改动。

2. **一句话指令**  
   > 请先阅读 `src/resources/agent-game-finance/conversation-memory.md` 和 `ui-spec.md`，再继续改代理游戏台账原型。

3. **按主题只读 UI 规范**  
   若只改样式/布局，@ `ui-spec.md` 即可；涉及业务规则、历史决策、Git 状态时读本文。

4. **（可选）写入项目规则**  
   若希望每次对话自动加载，可在 `.cursor/rules` 或 `AGENTS.md` 增加一条：改 `agent-game-finance` 前先读上述两个 md。当前**未**写入全局规则。

---

## 后续其他对话如何保存记忆

| 方式 | 做法 |
|------|------|
| **滚动更新（推荐）** | 每次重要对话结束前让 AI：「把本次关键信息追加/更新到 `conversation-memory.md`」 |
| **按次归档** | 复制 [`../templates/conversation-memory-template.md`](../templates/conversation-memory-template.md) 为 `conversation-memory-YYYY-MM-DD.md`，保留历史快照 |
| **分工** | `conversation-memory.md` = 项目上下文 + 决策 + 进度；`ui-spec.md` = 可执行的 UI/交互规范；需求大改时另写 PRD 或需求 md |
| **提交 Git** | 记忆文档改完后说「推送到 git」，与代码一并同步到远程 |

模板路径：`src/resources/templates/conversation-memory-template.md`

---

## 项目概要

| 项 | 值 |
|----|-----|
| 原型名 | 代理游戏台账（agent-game-finance） |
| 代码目录 | `src/prototypes/agent-game-finance/` |
| 预览路径 | `/prototypes/agent-game-finance` |
| 远程仓库 | https://github.com/carrielilian/49game.git ，分支 `main` |
| 目标 | 可运行、接近正式产品的后台原型（非线框） |
| 沟通语言 | 中文；用户不熟悉 CLI，验收需说明预览路径 |

---

## 本次对话完成的主要工作

### 1. 列表查询（8 个列表页 + 数据统计）

- 规则：**仅对列表存在的字段展示查询框**；多框为 **AND** 逻辑。
- 三个独立输入：游戏 ID/游戏名称 | 厂商 ID | 厂商名称。
- 组件：`ListSearchFields.tsx`；工具：`utils/listKeyword.ts`（`matchesListSearch`、`ListSearchQuery`）。
- 模式：`game` / `vendor` / `gameAndVendor`；**数据统计**各子菜单独立页面，**不用**页内 Tab 切换。

### 2. 列表列与枚举

- 游戏管理：**厂商 ID、厂商名称分两列**（不再合并 DualCell）。
- 游戏管理列表：**游戏ID / 游戏名称** 取 `onlineName`；独立列 **合同游戏名称** 取 `name`；查询栏含「合同游戏名称」(`showContractName`)。
- 运营状态：**已上线 / 未上线**（已移除「停运」）。
- 合作状态：**合作中 / 合作终止**（原「已终止」改为「合作终止」）。

### 3. 游戏添加 / 编辑表单（2026-07-10 更新）

**名称字段约定**（数据模型字段名不变）：

| 表单/列表标签 | 字段 | 含义 |
|--------------|------|------|
| 游戏名称 | `onlineName` | 上线后正式名称（如 `星际探险OL`） |
| 合同游戏名称 | `name` | 签约合同用名（如 `星际探险`） |

**添加顺序**：游戏名称* → 合同游戏名称* → 游戏负责人* → 归属厂商*（下拉） → 版号(radio) → 运营状态(radio，默认未上线) → 备注。

**编辑顺序**：游戏 ID(只读) → 游戏名称* → 合同游戏名称* → 游戏负责人* → 归属厂商(只读，`厂商ID / 厂商名称`) → 版号 → 运营状态 → 备注；**不含**上线时间、合作状态；保存时 `vendorId` 保持原值。

**字段说明**（输入框下方，`FieldHint` / `agf-form-hint`，12px 弱化色）：
- 游戏名称：「游戏上线后所使用的正式名称」
- 合同游戏名称：「签约合同所使用的游戏名称」

**校验拆分**：`ADD_GAME_REQUIRED`（含归属厂商）/ `EDIT_GAME_REQUIRED`（不含厂商）；共享 `GameNameFields` 组件。

### 4. 合同管理抽屉

**字段顺序**：

1. 游戏 ID / 游戏名称 — 只读，格式 `4001 / 星际探险OL`（取 `onlineName`），无分割线  
2. 付款代理金  
3. 委托开发费用  
4. 合同信息说明（textarea）  
5. 合作状态 — radio 合作中/合作终止，默认合作中  

**已移除**：版号费、版号支付方、运营状态、**预付分成款**（改由厂商收入「预付分成管理」维护）。

**类型**（`data/types.ts`）：`gameId, agencyPayment, developmentFee, contractDescription, cooperationStatus`。  
保存合作状态时同步游戏列表并写操作记录（`store.tsx` → `updateContract`）。

### 5. 操作记录

- 类型：**添加游戏 | 运营状态变更 | 合作状态变更**。
- 「操作」列：添加游戏 → 固定文案「添加游戏」；状态变更 → `StatusBadge` 显示最新状态。
- 排序：**时间新→旧**。类型 `GameOperationLog` 使用 `action` + 可选 `status`。
- 游戏 4001 示例 mock：合作中(2024-06-01) → 已上线(2024-03-15) → 添加游戏(2024-03-01)。
- 写入点：`addGame`、`updateGame`（运营状态）、`updateContract`（合作状态）。
- 抽屉顶部：只读游戏信息 `游戏ID / 游戏名称：4001 / 星际探险OL`（`onlineName`，`agf-drawer-meta`，与表头「操作人」左对齐）。
- 操作记录抽屉内表格**暂无分页**；表格用 `agf-table-wrap` 灰色边框（与主列表一致）。

### 6. 分页（所有 DataTable 列表）

- `components/Pagination.tsx` + `DataTable.tsx` 集成。
- 默认 **20 条/页**；可选 10/20/30/50/100/200。
- 居中：共 X 条 + 每页条数 + 页码；当前页浅蓝底 `#eef2fc`、蓝字 `#4165d7`。
- **无数据时也显示分页**（「共 0 条」+ 条数下拉 + 页码 1）。
- 筛选或数据长度变化时重置到第 1 页；统计页切换查询维度时用 `key={dimension}` 重置分页。

### 7. UI 样式要点（详见 ui-spec.md）

| 项 | 值 |
|----|-----|
| 主色 | `#4165d7`，hover `#5474db` |
| 标准抽屉宽 | **730px** |
| 厂商抽屉宽 | **1175px** |
| 730px 抽屉标签列 | **168px** 右对齐，自动加「：」 |
| 只读字段 | `ReadonlyField`（`FormFields.tsx`） |
| 字段说明 | `FieldHint`（`agf-form-hint`，输入框下方弱化说明） |
| 列表左右留白 | `--agf-gutter: 24px`（查询栏、表格、分页对齐） |
| 表格外框 | `agf-table-wrap`：`1px #E8E8E8` 实线、圆角 4px |
| 表单字号/颜色 | 14px `#333` |

### 8. 文档

- **`ui-spec.md`**：完整 UI/交互规范，后续改 UI 的统一引用。
- **`conversation-memory.md`**（本文件）：项目上下文与对话记忆。
- **`templates/conversation-memory-template.md`**：其他项目/对话可复用的记忆模板。

### 9. 表单必填校验（2026-07-09 本轮）

**通用规则**：提交时若有必填未填 → 字段下红字 `{字段名}不能为空` + 顶部红色 Toast「请完善所有信息」（3 秒）→ **不关闭抽屉、不提交**；输入时 `clearError` 清除对应项。

| 场景 | 必填字段 | 实现 |
|------|----------|------|
| 添加游戏 | 游戏名称、合同游戏名称、游戏负责人、归属厂商 | `GameListPage` → `validateGameForm(ADD_GAME_REQUIRED)` |
| 编辑游戏 | 游戏名称、合同游戏名称、游戏负责人（归属厂商只读，不校验） | `GameListPage` → `validateGameForm(EDIT_GAME_REQUIRED)` |
| 预付分成管理 | 预付分成款、历史已抵扣分成款 | `VendorIncomePage` 抽屉；≥0；失败 Toast「请完善所有信息」 |
| 添加/编辑厂商 | 厂商名称、联系人、手机、邮箱、单位地址、发票信息、开户名称、开户银行、**开户银行所在地**、支行名称、银行卡号（**11 项**） | `VendorForm` → `validateVendorForm` + `VENDOR_REQUIRED` |

**组件**：
- `FormFields.tsx` → `FieldError`（class `agf-form-error`）、`FieldHint`（class `agf-form-hint`）；**顺序：灰色 FieldHint 在上，红色 FieldError 在下**
- `PercentInput`：渠道费/分成下方先「请输入0-100的整数」，再校验红字
- `VendorForm.tsx` → `agf-form-grid__error`
- **Modal.tsx** → `Toast` 支持 `type="error" | "success"`（失败红、成功绿；**无**深色默认样式）；显示 3 秒

**厂商表单**：银行信息全部必填（含开户银行所在地；本轮由非必填改为必填）。

### 10. 列表与展示统一（2026-07-09 本轮；2026-07-10 补充）

- **DualCell**：单行 `ID / 名称`（如 `4001 / 星际探险OL`），名称取 `onlineName`；生效于游戏管理、结算公式、内外部/退款结算、导入预览、数据统计、收入汇总及各类抽屉只读区。
- **统一取值**：`store.getGameName(id)` → `onlineName`；**禁止**在「游戏ID / 游戏名称」场景使用 `name`（合同游戏名称）。
- **表头文案**：斜杠前后加空格，统一为 `游戏ID / 游戏名称`。
- **表头样式**：`font-weight: 700` 加粗（`.agf-table th`）。
- **操作记录抽屉**：表格上方 `agf-drawer-meta` 显示当前游戏，与表头「操作人」左对齐（**不用** 168px 表单布局）。

### 11. 数据统计（2026-07-09 本轮）

**导航**：侧栏「数据统计」下**仅显示**「收入汇总统计」（`stats-summary`）；厂商/渠道/游戏收入统计（`stats-vendor` / `stats-channel` / `stats-game`）**菜单已隐藏**，路由仍可通过 hash 直达。

**时间查询**：顶部 `MonthRangePicker`（`components/MonthRangePicker.tsx` + `utils/monthRange.ts`）；表头「时间」列**无**漏斗筛选。数据最小维度为**月**。

**默认时间范围**：数据统计 4 页均用 `getSampleMonthRange()` → **`2025-05 - 2025-06`**（对齐 mock 结算样例）；`getDefaultMonthRange()` 仍为上一自然月，供其他场景。

**厂商 / 渠道 / 游戏收入统计**（`StatisticsPage.tsx`，`mode` 入参）：

| 页面 | 列表字段 |
|------|----------|
| 厂商收入统计 | 时间、厂商ID、厂商名称、总收入、结算收入、结算退款 |
| 渠道收入统计 | 时间、渠道、总收入、结算收入、结算退款 |
| 游戏收入统计 | 时间、游戏ID / 游戏名称、总收入、结算收入、结算退款 |

- 已移除「累计流水」列。
- **总收入**（三页口径一致）：已结算内部/外部记录的 `grossRevenue` 合计（不含退款流水）。
- **结算收入 / 结算退款**：分别汇总 `settlementIncome`（非 refund / refund）。
- 厂商/游戏页额外支持 `ListSearchFields`（vendor / game）；渠道页仅时间范围。

**收入汇总统计**（`RevenueSummaryPage.tsx`）：

- 查询栏：查询维度（游戏/渠道/厂商）+ 时间 + `ListSearchFields`（`gameAndVendor`）。
- 底层数据含：时间、游戏、厂商、渠道（聚合用）；列表列随维度切换：
  - **游戏**：时间、游戏ID / 游戏名称、总收入、结算收入、结算退款
  - **渠道**：时间、渠道、总收入、结算收入、结算退款
  - **厂商**：时间、厂商ID、厂商名称、总收入、结算收入、结算退款
- **总收入** = 结算收入 − 结算退款（与本三节三页口径不同，勿混用）。
- Mock 结算扩充至 S001–S021（`mock-data.ts`），覆盖 2025-05/06 多样例。

**列头筛选样式**：`ColumnFilter` 下拉项 `font-weight: 400`，不继承表头加粗。

**月份选择器样式要点**：输入框 `min-width: 228px`；展开时边框主题色 `#4165d7`；双年面板间 1px 竖线分隔。

### 12. Git

- Windows 环境 Git 可能不在 PATH，可用：`"C:\Program Files\Git\cmd\git.exe"`。
- 用户说「推送到 git」时再 commit/push，不要主动提交。
- 数据统计、收入汇总、MonthRangePicker 及 mock 扩充等本轮改动，推送前先 `git status`。

### 13. 结算公式管理（2026-07-10 本轮）

**列表**

| 列 | 说明 |
|----|------|
| 游戏ID / 游戏名称 | `DualCell`，名称取 `onlineName` |
| 厂商ID / 厂商名称 | 分两列 |
| 结算公式 | 两行正文：`内部渠道：…` / `外部渠道：…`；未配置显示 `-` |
| 操作 | 结算公式、支持渠道、操作记录 |

- **数据来源**：与游戏管理同步；`addGame` 时 `createEmptyFormula` 写入空公式。
- **初始状态**：新游戏公式为空，列表显示 `-`，配置保存后才展示文案（`isFormulaConfigured`）。
- **排序**：新增游戏置顶（与游戏管理一致）。

**结算公式设置抽屉**

- 去掉只读区与分区之间的灰色分割线；「内部/外部渠道结算公式设置」小标题 `font-weight: 700`。
- 「税点」更名为「税率」，改为单选：**跟随发票 / 自定义**（内外渠道各自独立 `internalTaxMode` / `externalTaxMode`）。
- **跟随发票**：按厂商 `invoiceInfo` 映射只读税率；发票为「其他」时显示输入框。
  - 专票 6% → 0%；专票 3% → 3.36%；专票 1% → 5.6%；普通发票 → 6.72%。
- **自定义**：显示税率输入框。
- 渠道费/分成：百分数输入 0–100 整数，`%` 后缀，必填；存储仍为小数。
- 顶部只读区：游戏ID/游戏名称、厂商ID/名称、当前结算公式（内外两行，无则 `-`）。
- 已移除抽屉底部独立「发票设置」区块（原 `invoiceMode` / `customInvoice`）。
- 工具：`utils/invoiceTax.ts`；厂商发票选项补「普通发票」。

**支持渠道**（`FormulaListPage` 支持渠道抽屉）

- 小标题：**内部渠道** / **外部渠道**（非「勾选」后缀）；标题位置不缩进。
- 说明（`FieldHint`，标题下方 12px 灰字）：
  - 内部：「请勾选支持的内部渠道，并填写该渠道下对应的游戏ID」
  - 外部：「请勾选支持的外部渠道，并填写该渠道下对应的游戏ID」
- **内外渠道行结构一致**：`[勾选] 渠道名称 [渠道游戏ID 输入框]` 单行；行左缩进 `48px`（`agf-channel-row`）；输入框宽 **200px**。
- **校验**：内外部渠道勾选后「渠道游戏ID」**必填**；未勾选不校验；`validateChannelsForm`；失败 Toast「请完善所有信息」。
- 厂商名称与「内部渠道」标题间距收紧（`agf-channel-drawer-meta`）。
- 外部导入匹配：`externalImport.ts` 按外部渠道名 + `channelGameId` 解析游戏。

**操作记录抽屉**：顶部 `agf-drawer-meta` 仅显示游戏ID/游戏名称；表格 `agf-table-wrap` 外框；列：操作人、操作时间、结算公式。

**结算三页**（外部收入 / 内部收入 / 内部退款）

| 列 | 说明 |
|----|------|
| 收入时间 / 退款时间 | 仅展示，无漏斗 |
| 游戏ID / 游戏名称 | `DualCell`，`getGameName`（`onlineName`） |
| 厂商ID、厂商名称 | **分两列**；名称 `getVendorName(vendorId)` |
| 渠道 | 漏斗筛选 |
| 待结算金额 | `settlementAmount` |
| 结算收入 / 结算退款 | 未结算显示 `-`（`formatSettlementIncome`）；已结算格式化金额 |
| 结算公式 | `displaySettlementFormula` 去前缀；表达式 `待结算金额*（1-渠道费-税率）*分成` |
| 结算时间 | **无漏斗**；未结算 `-`（`formatSettlementTime`） |
| 申请付款状态 | 未申请 / 已申请；漏斗 |

- **无主列表勾选列**。
- **内部 / 退款**：主列表【数据拉取】【结算】均为 primary；见 **§20** 完整规则；结算仅处理**本页主列表**未结算行。
- **外部**：主列表**无**【结算】按钮；结算仅在「导入并结算」弹窗内完成；「确认导入」写入**已结算**记录。
- **已移除**列表列「总收入」。
- 顶部查询：`MonthRangePicker` + `ListSearchFields`（**`gameAndVendor`**）；默认 **`getRecentTwoMonthsRange()`**（上个月 + 当前月）。

### 15. 列表布局与表格边框（2026-07-10 本轮）

- **左右留白**：`.agf-card` 内 `--agf-gutter: 24px`；查询栏、列表区、分页左对齐。
- **表格外框**：`agf-table-panel` + `agf-table-wrap`；`1px solid #E8E8E8`、圆角 4px；表头灰底在边框内。
- **分页**：在边框**外**下方；分页组件底内边距 **16px**，列表区底外边距 **24px**。
- **抽屉/弹窗内表格**：同样用 `agf-table-wrap` 包裹（游戏/结算公式操作记录、导入预览等）。
- 实现：`DataTable.tsx`、`style.css`。

### 16. 本次对话汇总（2026-07-10 下午）

1. **支持渠道抽屉**：勾选左置、内部填 ID、外部仅勾选；FieldHint；标题内部/外部渠道。
2. **结算三页**：去总收入；结算金额→待结算金额；申请付款状态→未申请/已申请。
3. **全站列表**：24px 留白 + 灰色实线表格外框；抽屉/弹窗列表同步。
4. **文档**：`ui-spec.md` 与本文已同步更新（修复损坏段落、补全结算三页与支持渠道规范）。

**本轮改动文件**：`FormulaListPage.tsx`、`style.css`、`DataTable.tsx`、`ExternalSettlementPage.tsx`、`InternalSettlementPage.tsx`、`GameListPage.tsx`、`data/types.ts`、`mock-data.ts`、`store.tsx`、`columnFilters.ts`、`StatusBadge.tsx`、`balance.ts`。

### 17. 外部收入结算 — 导入并结算（2026-07-10 晚间）

**流程**：导入并结算 → 选外部渠道（**单选** radio）→ 上传报表（模拟）→ 列表预览 → **结算** → **确认导入** 写入主列表。

**上传报表**
- 表格字段：渠道游戏ID、收入时间、待结算收入
- 工具：`utils/externalImport.ts`（`hasChannelEnabledGames`、`buildMockImportRows`、`enrichImportRowsOnParse`、`calculateImportRow`）
- 渠道游戏ID 匹配：结算公式「支持渠道」中已勾选外部渠道 + `channelGameId`
- 该渠道无勾选游戏 → 禁止上传，红色 Toast「当前渠道不存在运营游戏」

**弹窗两态**
1. **上传态**：外部渠道单选 + 上传区（`agf-upload`）；Modal `plain`（无上下灰线）；宽 `xl` 960px
2. **列表态**（上传完成后整页切换）：仅显示 `外部渠道：{渠道名称}`（`agf-import-meta`）+ `DataTable` 分页列表

**预览/列表列**：渠道游戏ID、收入时间、游戏ID / 游戏名称、待结算收入、结算公式、结算收入（**无**「渠道」列，渠道已在上方 meta）

**结算公式列**
- 上传解析后**立即**读取各游戏外部渠道公式（`enrichImportRowsOnParse`）
- 展示去掉前缀，如 `待结算金额*（1-0%-0%）*45%`（`displaySettlementFormula`）

**底部按钮**（取消 default；结算/确认导入 primary）
| 按钮 | 规则 |
|------|------|
| 结算 | primary；未上传禁用；**结算完成后禁用**（弹窗内预览用） |
| 确认导入 | primary；全部行已匹配游戏+公式、**已完成弹窗内结算**且无错误 |

**外部主列表无【结算】按钮**：外部渠道的收入结算在「导入并结算」弹窗内完成；完成弹窗内【结算】后确认导入，写入主列表为**已结算**，结算时间=确认导入时间。

**Toast**（全站统一）：成功 `type="success"` 绿；失败 `type="error"` 红

**样例渠道费**（`mock-data.ts` `makeFormula`）：外部 **0%**、内部 **5%**；S001–S021 结算金额/收入已按新公式重算

**实现文件**：`ExternalSettlementPage.tsx`、`utils/externalImport.ts`、`utils/settlement.ts`（`displaySettlementFormula`）、`Modal.tsx`（`plain`/`xl`/`ToastType`）、`style.css`

**本轮改动文件（续）**：`ExternalSettlementPage.tsx`、`InternalSettlementPage.tsx`、`PaymentListPage.tsx`、`VendorIncomePage.tsx`、`GameListPage.tsx`、`VendorListPage.tsx`、`FormulaListPage.tsx`、`Modal.tsx`、`mock-data.ts`、`store.tsx`、`utils/externalImport.ts`、`utils/settlement.ts`、`style.css`

### 18. 本次对话汇总（2026-07-10 晚间续）

1. **结算公式展示**：全站列表改为 `待结算金额*（1-渠道费-税率）*分成`；`formatFormulaText` / mock 同步。
2. **分页留白**：分页底 `16px` 内边距 + 列表区底 `24px` 外边距。
3. **结算三页主列表**：去勾选；结算时间无漏斗；未结算时结算时间/收入为 `-`；内部/退款页【结算】批量处理当前列表未结算行并按公式算收入；外部主列表无【结算】。
4. **外部导入**：确认导入写入**已结算**主列表；结算收入=弹窗内结算结果，结算时间=确认导入时间；弹窗内【结算】必需。
5. **结算三页列**：游戏名称后新增厂商ID、厂商名称；查询栏 `gameAndVendor`。
6. **样例未结算**：初始 mock **无**未结算记录；内部未结算数据仅通过【数据拉取】写入；外部样例全部已结算。

**本轮改动文件**：`ExternalSettlementPage.tsx`、`InternalSettlementPage.tsx`、`utils/settlement.ts`、`data/store.tsx`、`data/mock-data.ts`、`style.css`。

### 20. 本次对话汇总（2026-07-13）

#### A. 内部收入结算 / 内部退款结算 — 【数据拉取】【结算】

| 项 | 规则 |
|----|------|
| 样式 | 两按钮均为 **primary** |
| 页面独立 | `internal` / `refund` **互不影响**（各自 `type` 数据、各自按钮状态） |
| 按钮状态 | 存 `store.internalSettlementButtons`；**切换菜单/页面不重置**；**仅浏览器刷新**恢复初始 |
| 数据拉取 | 会话内成功 1 次后禁用；校验财务中心（mock：`financeCenter.ts`） |
| 拉取失败 | 红 Toast「财务中心还未结算完成」 |
| 拉取成功 | 绿 Toast「已从财务中心拉取待结算数据」；拉取**上一自然月**（`getPreviousMonthKey`）；按已勾选内外部渠道 + 渠道游戏ID；启用【结算】；**时间筛选保持近两个月**（`getRecentTwoMonthsRange()`，不切换为单月） |
| 时间范围持久化 | `internalSettlementButtons[type].monthRange` 存 store；拉取成功时写入近两个月；切换菜单再回来保持；旧版误存单月会自动迁移 |
| 结算 | 初始禁用；拉取成功后启用；会话内成功 1 次后再禁用 |
| 结算校验 | 本页主列表未结算游戏均需有公式；否则红 Toast「{游戏名}未设置结算公式」（多游戏「、」连接） |
| 结算成功 | 绿 Toast「结算成功」；仅结算**本页主列表**当前未结算行 |

工具：`utils/financeCenter.ts`；按钮状态仅存 `store.internalSettlementButtons`（已删除 `utils/internalMonthlyState.ts`）

#### B. 结算三页时间默认

- 外部/内部/退款结算：`MonthRangePicker` 默认 **`getRecentTwoMonthsRange()`** = **上个月 + 当前月**（如 2026-07 时为 `2026-06 - 2026-07`）。
- 数据统计仍用 `getSampleMonthRange()`（mock 2025-05/06）。

#### C. 厂商收入（`VendorIncomePage` + `balance.ts`）

| 字段 | 公式 |
|------|------|
| 累计收入 | 内部+外部已结算「结算收入」之和 |
| 累计退款 | 内部退款已结算「结算退款」之和 |
| 账户总收入 | 累计收入 − 累计退款 |
| 账户余额 | 内外部「未申请」结算收入之和 − 退款「未申请」结算退款之和（**不扣**预付分成款） |

字段说明：**不在列表上方展示**；面包屑「厂商收入」右侧 **?**（`VendorIncomeFieldHelp`）→ Modal「厂商收入字段说明」；`plain` 无分割线、无底部按钮；× / 遮罩 / Esc 关闭。

#### D. 支持渠道抽屉

- **外部渠道**也支持填写渠道游戏ID，布局/校验与内部一致。

#### E. 表单与列表 UI

- 灰色 `FieldHint` 在上、红色 `FieldError` 在下（含 `PercentInput`、游戏名称字段）。
- **列表无数据仍显示分页**（共 0 条）。

#### F. 改动文件（§20 上午轮）

`InternalSettlementPage.tsx`、`ExternalSettlementPage.tsx`、`store.tsx`、`utils/financeCenter.ts`、`utils/monthRange.ts`、`utils/balance.ts`、`FormulaListPage.tsx`、`FormFields.tsx`、`GameListPage.tsx`、`VendorIncomePage.tsx`、`components/VendorIncomeFieldHelp.tsx`、`components/AdminLayout.tsx`、`components/DataTable.tsx`、`index.tsx`、`style.css`、`ui-spec.md`、`conversation-memory.md`

### 21. 本次对话汇总（2026-07-13 下午）

#### A. 结算 mock 与时间筛选

- 初始结算样例 **S001–S021 + S022–S025** 的 `incomeTime` 仅 **2025-05 / 2025-06**；**无 2026 年**初始数据。
- 结算三页默认 `getRecentTwoMonthsRange()`（上个月+当前月，如 2026-07 为 `2026-06 - 2026-07`）时列表可能为空；查 mock 请手动选 **`2025-05 - 2025-06`**。
- 已**移除**未结算样例 **S008**；内部未结算仅通过【数据拉取】产生。

#### B. 厂商收入 — 【申请付款】（`VendorIncomePage` + `utils/vendorPaymentApply.ts`）

**操作列**

| 账户余额 | 操作列 |
|----------|--------|
| 任意 | 显示【预付分成管理】 |
| > 0 | 另显示【申请付款】链接（主题色 `agf-btn--link`） |

**账户余额列**：正文黑色，与其他数字列一致（不加蓝/加粗）。

**点击校验（优先级，红 Toast，不弹窗）**

| 顺序 | 条件 | 提示 |
|------|------|------|
| 1 | 银行五字段未填全 | 未填写银行信息 |
| 2 | 厂商**未填写**预付分成款（`Vendor.prepayment` 未填；**0 合法**） | **{厂商名称}未补充预付分成款信息** |
| 3 | 付款管理存在该厂商 `status=未付款`（兼容历史 `待付款`） | 存在一笔未付款的记录 |

**二次确认 Modal**（校验通过后）

- `plain` + **`compact`**（`min-width: 420px`，`max-width: 480px`，`width: auto`）；无上下灰线。
- 本会话内 **内部收入【结算】**（`internalSettlementButtons.internal.settleCompleted`）与 **内部退款【结算】**（`internalSettlementButtons.refund.settleCompleted`）**均未完成**时：
  - 第一行：`{上月 YYYY-MM}内部渠道还未结算，是否继续申请付款？`
  - 第二行：`申请付款金额：{余额}元`
- 两者均已完成：仅第二行金额文案。
- **不再**依赖外部导入弹窗结算完成态（`externalSettlementButtons`）。
- 按钮：取消 / 确认申请；成功绿 Toast「申请付款成功，账户余额已清零」。

#### C. Mock 验收样例

| 厂商 | 用途 |
|------|------|
| **1004 / 1006 / 1008** | 余额 > 0，信息齐全，可走完整申请（S022–S025 增补未申请收入） |
| **1005** | 厂商**未填**预付分成款 → 点【申请付款】测「像素工坊未补充预付分成款信息」 |
| **1001** | 有 P002「未付款」；余额为负，操作列 `-` |

#### D. 改动文件（本轮）

`VendorIncomePage.tsx`、`utils/vendorPaymentApply.ts`、`data/mock-data.ts`、`data/store.tsx`（`externalSettlementButtons`）、`ExternalSettlementPage.tsx`、`components/Modal.tsx`（`compact`）、`style.css`、`ui-spec.md`、`conversation-memory.md`

### 22. 本次对话汇总（2026-07-14）

#### A. 付款管理 — 操作列（`PaymentListPage`）

| 状态 | 操作（顺序） |
|------|-------------|
| 未付款 | 【标记付款】→【结算函】→【请款凭证】 |
| 已付款 | 【详细信息】→【结算函】→【请款凭证】 |

- 付款状态枚举：**未付款** / **已付款**（`types.ts`；历史 mock `待付款` 由 `normalizePaymentStatus` 兼容）。
- 列表列名：**待付款金额**、**实际付款金额**；申请付款时间 / 付款时间**精确到秒**。

#### B. 【标记付款】抽屉（730px `large`）

| 字段 | 规则 |
|------|------|
| 厂商ID / 厂商名称 | 只读 |
| 待付款金额 * | 可编辑；必填；>0；最多两位小数 |
| 付款银行 * | 可编辑；必填 |
| 收款信息 * | 可编辑多行；默认取自厂商银行五字段；必填 |
| 备注 | 可编辑；**非必填** |

> 结算函、电子发票在【请款凭证】抽屉上传，本抽屉不含此二字段。

**按钮**：取消 / 提交（`updatePayment`，不关闭）/ 标记已付款（`markPaid`，**关闭抽屉**）。

#### C. 【详细信息】抽屉（730px `large`）

- **仅已付款**记录显示入口；未付款不显示。
- 只读：厂商ID、厂商名称、付款状态、待付款金额、实际付款金额、付款银行、收款信息。
- 可编辑：备注。
- **按钮**：取消 / 提交（仅保存可编辑字段，不关闭）。

#### D. 【请款凭证】抽屉（730px `large`）

- 入口：列表【请款凭证】；未付款 / 已付款均显示。
- 只读：厂商ID、厂商名称。
- 可编辑：`MockFileUpload` 上传 **结算函**、**电子发票**（写入 `settlementLetter` / `invoice`）。
- **按钮**：取消 / 提交（`updatePayment`，不关闭抽屉）。

#### E. 【结算函】抽屉（`SettlementLetterDrawer`，**1175px**）

- 按付款记录 `settlementIds` 过滤已结算明细（申请付款时 `store.applyPayment` 写入）。
- 同一游戏+渠道**连续月份**合并为一行；结算时间如 `2025.05-2025.06`（`utils/settlementLetter.ts`）。
- 【下载】下拉：**中文** / **英文**（grid 布局防换行）。
- 支付金额 = 关联收入合计② − 退款合计④。

#### F. 平台名称与侧栏

- 侧栏 Logo、面包屑平台名：**代理游戏台账**（`Sidebar.tsx`、`index.tsx`）。
- 数据统计侧栏**仅保留**「收入汇总统计」菜单项。

#### G. Mock / 数据

- P001：`settlementIds: ['S004','S016','S007']`，金额 367800；P002：255200，`settlementIds: ['S001','S002','S010','S020']`。
- 厂商 `cardNumber` mock 完整卡号（无掩码）。

#### H. 改动文件（§22 上午轮）

`PaymentListPage.tsx`、`SettlementLetterDrawer.tsx`、`components/MockFileUpload.tsx`、`data/store.tsx`（`updatePayment`、`settlementIds`）、`data/mock-data.ts`、`data/types.ts`、`utils/payment.ts`、`utils/settlementLetter.ts`、`utils/vendorPaymentApply.ts`、`utils/columnFilters.ts`、`StatusBadge.tsx`、`index.tsx`、`Sidebar.tsx`、`VendorIncomePage.tsx`、`InternalSettlementPage.tsx`、`style.css`、`ui-spec.md`、`conversation-memory.md`

### 23. 本次对话汇总（2026-07-14 下午续）

#### A. 内部收入 / 内部退款 — 数据拉取后时间筛选

| 项 | 规则 |
|----|------|
| 打开页面 | 默认 **近两个月**（`getRecentTwoMonthsRange()`，如 `2026-06 - 2026-07`） |
| 【数据拉取】成功后 | 时间**保持**近两个月，**不**切换为上月单月 |
| 列表数据 | 拉取写入上一自然月（`getPreviousMonthKey`）的未结算行；在近两个月范围内可见 |
| 持久化 | `internalSettlementButtons[type].monthRange`；`setInternalSettlementButtons` 支持 **Partial 合并** |
| 迁移 | 旧会话误存「上月单月」时，挂载后自动改回近两个月 |

#### B. 厂商收入 — 申请付款警告文案

- 警告条件：本会话 **内部收入 + 内部退款** 均未【结算】（不再看外部导入结算）。
- 文案：`{getPreviousMonthKey()}内部渠道还未结算，是否继续申请付款？`

#### C. 原型评审

- 已写入 `src/prototypes/agent-game-finance/.spec/prototype-review.md`（P0:0, P1:2, P2:3）。

#### D. 改动文件（本轮）

`InternalSettlementPage.tsx`、`data/store.tsx`（`monthRange` 字段、Partial 合并）、`VendorIncomePage.tsx`、`ui-spec.md`、`conversation-memory.md`

### 24. 本次对话汇总（2026-07-14 下午续）

#### A. 付款管理 — 详细信息抽屉补全

- 补充只读字段：**付款状态**。
- 申请付款时间、付款时间**仅在列表展示**，详细信息抽屉不含。
- 字段顺序：厂商ID → 厂商名称 → 付款状态 → 待付款金额 → 实际付款金额 → 付款银行 → 收款信息 → 备注。

#### B. 改动文件（本轮）

`PaymentListPage.tsx`、`ui-spec.md`、`conversation-memory.md`

### 25. 本次对话汇总（2026-07-14 晚间）

#### A. 标记付款 — 交互调整

| 项 | 规则 |
|----|------|
| 【标记已付款】 | 校验通过后**关闭抽屉**；绿 Toast「已标记付款」 |
| 【提交】 | 仍**不关闭**抽屉 |
| 收款信息 | 由只读改为**可编辑**多行；默认取自厂商银行五字段；必填 |

#### B. 请款凭证 — 恢复独立入口

- 操作列恢复【请款凭证】；未付款 / 已付款均显示（在【结算函】之后）。
- 730px 抽屉：只读厂商ID/名称；`MockFileUpload` 上传 **结算函**、**电子发票**。
- 字段标签为「结算函」（非「结算函（厂商盖章）」）。
- 取消 / 提交（`updatePayment`，不关闭抽屉）。

#### C. 标记付款 / 详细信息 — 附件字段迁移

- **移除**标记付款、详细信息抽屉中的「结算函上传」「电子发票」及对应必填校验。
- 结算函、电子发票统一在【请款凭证】上传；标记付款仅保留金额、付款银行、收款信息、备注。

#### D. 厂商收入 — 申请付款确认弹窗

- `agf-modal--compact` 增加 **`min-width: 420px`**（`max-width: 480px` 不变）。

#### E. Mock

- P001 增补 `settlementLetter`、`invoice` 样例文件名，便于请款凭证抽屉验收。

#### F. 改动文件（本轮）

`PaymentListPage.tsx`、`data/mock-data.ts`、`style.css`、`ui-spec.md`、`conversation-memory.md`

### 26. 本次对话汇总（2026-07-14 续）

#### A. 合同 — 预付分成款语义（**已废止**，预付已迁至厂商级，见 **§27**）

| 项 | 规则 |
|----|------|
| 类型 | ~~`Contract.prepayment`~~ → **`Vendor.prepayment?`** |
| 维护入口 | 厂商收入【预付分成管理】；合同抽屉**无**预付字段 |

#### B. 业务类型选择（4399 / 快爆）

| 项 | 规则 |
|----|------|
| 位置 | 所有列表页 `FilterBar` 查询栏**最左侧**（`BusinessTypeSelect`） |
| 选项 | **4399** / **快爆**；默认 **4399** |
| 数据隔离 | 两套 mock **完全独立**；列表/统计/结算/厂商收入/付款均按当前业务过滤 |
| 厂商字段 | `Vendor.businessType: '4399' \| '快爆'` |
| Store | `businessType` + `scopedVendors/Games/Settlements/Payments/Balances` |
| ID 段 | 4399：厂商 **1001+**、游戏 **4001+**；快爆：厂商 **2001+**、游戏 **5001+** |
| 新增 | `addVendor` / `addGame` 写入当前 `businessType`，ID 在对应段内递增 |
| 按钮状态 | `internalSettlementButtons` / `externalSettlementButtons` **按业务类型分桶**，切换业务互不影响 |

**快爆 mock 样例**：厂商 2001–2003、游戏 5001–5004、结算 S301–S306、付款 P301。

#### C. 业务类型选择框样式

- class：`agf-select agf-business-type-select`
- 宽度 **100px**（约为通用 `.agf-select` 200px 的一半）

#### D. 结算函 — 预付抵扣（**已由 §27 更新**，此处保留摘要）

| 行 | 说明 |
|----|------|
| 本次抵扣预付分成⑤ | 见 **§27-D**（基于厂商剩余未抵扣分成款） |
| 总计 | 有⑤时 **②-④-⑤**；无⑤时 **②-④** |
| 剩余未抵扣预付分成 | 函内 remaining − ⑤；**remaining>0** 才显示 |

#### E. 改动文件（本轮）

`data/types.ts`、`data/mock-data.ts`、`data/store.tsx`、`utils/businessScope.ts`、`utils/settlementLetter.ts`、`utils/vendorPaymentApply.ts`、`utils/balance.ts`、`components/BusinessTypeSelect.tsx`、`components/FilterBar.tsx`、`components/SettlementLetterDrawer.tsx`、`pages/*ListPage.tsx`、`pages/InternalSettlementPage.tsx`、`pages/ExternalSettlementPage.tsx`、`pages/VendorIncomePage.tsx`、`pages/StatisticsPage.tsx`、`pages/RevenueSummaryPage.tsx`、`pages/GameListPage.tsx`、`style.css`、`ui-spec.md`、`conversation-memory.md`

### 27. 本次对话汇总（2026-07-14 晚间续）

#### A. 预付分成款迁至厂商级（`Vendor` + `utils/prepayment.ts`）

| 项 | 规则 |
|----|------|
| 字段 | `Vendor.prepayment?`（≥0；未填 = 未补充）、`Vendor.historicalDeduction?`（默认 0） |
| 合同 | `Contract` **已移除** `prepayment`；游戏管理「合同管理」抽屉**不含**预付分成款 |
| Mock | 原各游戏合同预付按厂商汇总写入 `VENDOR_PREPAYMENTS`；**1005 像素工坊**未填（验收拦截） |

#### B. 厂商收入 — 【预付分成管理】抽屉（730px `large`）

| 字段 | 规则 |
|------|------|
| 厂商ID / 厂商名称 | 只读 |
| 预付分成款 * | 必填；≥0 |
| 历史已抵扣分成款 * | 必填；默认 0；≥0；`FieldHint`「填写线下手动已处理的预付分成款」 |
| 已抵扣分成款 | 只读；**已付款之和 + 历史已抵扣**；若预付 − 上述合计 ≤ 0 则取预付分成款；取**已保存**值 |
| 剩余未抵扣分成款 | 只读；**预付分成款 − 已抵扣分成款**（≤0 为 0）；取**已保存**预付分成款 |

**列表新增列**（在「预付分成款」右侧）：**已抵扣分成款**、**剩余未抵扣分成款**。

**操作列**：始终【预付分成管理】；余额 **> 0** 另显示【申请付款】。

#### C. 账户余额口径调整（`balance.ts`）

**账户余额** = 内部+外部「未申请」结算收入 − 内部退款「未申请」结算退款（**不再**减预付分成款）。

#### D. 结算函 — ⑤ 与条件显示（`settlementLetter.ts` + `SettlementLetterDrawer`）

**⑤ 取值**（`remaining` = 厂商「剩余未抵扣分成款」，来自 `calcVendorPrepaymentSummary`）：

| 条件 | 本次抵扣预付分成⑤ |
|------|-------------------|
| `remaining − (②−④) > 0` | ⑤ = ②−④ |
| 否则 | ⑤ = `remaining` |

**剩余未抵扣预付分成**（函内）= `remaining − ⑤`；**总计**支付金额 = ②−④−⑤。

**显示规则**：仅当厂商「剩余未抵扣分成款」**> 0** 时显示「本次抵扣预付分成⑤」「剩余未抵扣预付分成」两行；否则隐藏，总计标签为 **「总计②-④：」**（不含⑤）。

**P001（1003）验收**：列表剩余未抵扣 582,200；②−④=367,800 → ⑤=367,800；总计=0；函内剩余=214,400。

#### E. 改动文件（本轮）

`data/types.ts`、`data/mock-data.ts`、`data/store.tsx`、`utils/prepayment.ts`、`utils/balance.ts`、`utils/settlementLetter.ts`、`utils/vendorPaymentApply.ts`、`pages/VendorIncomePage.tsx`、`pages/GameListPage.tsx`、`components/SettlementLetterDrawer.tsx`、`components/VendorIncomeFieldHelp.tsx`、`ui-spec.md`、`conversation-memory.md`

### 28. 本次对话汇总（2026-07-15）

#### A. 付款管理 — 【标记付款】字段拆分（`PaymentListPage`）

| 字段 | 规则 |
|------|------|
| 待付款金额 | **只读**（`ReadonlyField`）；展示 `pendingAmount` |
| 实际付款金额 * | **可编辑**；写入 `actualAmount`；必填；>0；**精确至小数点后两位** |

- 打开抽屉：实际付款金额默认 `actualAmount ?? pendingAmount`，格式化为两位（如 `255200.00`）。
- 输入：最多两位小数；失焦 / 提交校验通过后自动格式化为两位；保存时四舍五入。
- 校验文案：`实际付款金额不能为空` / `精确至小数点后两位` / `必须大于0`。

#### B. 请款凭证 — 已上传文件可删除（`MockFileUpload`）

- 列表项：文件图标 + 可点击下载文件名 + 绿色成功勾 + **× 删除**（`agf-file-upload__remove`）。
- 删除后从列表移除；提交时同步保存（删光后对应字段清空）。

#### C. 列表空状态（`DataTable`）

- 无数据时：**表头保留**；表体居中展示空盒插画 +「暂无数据」；**分页仍显示**「共 0 条」。
- 组件：`TableEmptyState`（内置于 `DataTable.tsx`）；样式 `agf-table-empty` / `agf-table-empty__icon` / `agf-table-empty__text`。

#### D. 改动文件（本轮）

`pages/PaymentListPage.tsx`、`components/MockFileUpload.tsx`、`components/DataTable.tsx`、`style.css`、`ui-spec.md`、`conversation-memory.md`

### 29. 本次对话汇总（2026-07-15 续）

#### A. 预付分成 — 已抵扣/剩余计算公式修正（`prepayment.ts`）

**问题**：当「预付 − 已付款之和 − 历史」> 0 时，旧实现将**差额**写入「已抵扣分成款」，导致无已付款记录时 已抵扣=预付、剩余=0；调大预付分成款后剩余仍为 0。

**修正后**：

| 字段 | 规则 |
|------|------|
| 已抵扣分成款 | **已付款之和 + 历史已抵扣**；若预付 − 上述合计 ≤ 0，则取预付分成款 |
| 剩余未抵扣分成款 | 预付分成款 − 已抵扣分成款（≤0 为 0） |

**示例（1002 幻境，无已付款、历史=0）**：预付 600000 → 已抵扣 0、剩余 600000；改为 6000000022 保存后 → 已抵扣 0、剩余 6000000022。

抽屉/列表均取**已保存**预付分成款与历史已抵扣；结算函⑤逻辑不变（`calcLetterPrepaymentDeduction` 仍用 `remainingPrepayment`）。

#### B. 改动文件（本轮）

`utils/prepayment.ts`、`pages/VendorIncomePage.tsx`、`components/VendorIncomeFieldHelp.tsx`、`ui-spec.md`、`conversation-memory.md`

### 30. 本次对话汇总（2026-07-15 续 2）

#### A. 预付分成管理 — 金额输入两位小数（`VendorIncomePage`）

| 字段 | 规则 |
|------|------|
| 预付分成款 * | 打开/失焦/保存后格式化为两位（如 `800000.00`）；最多两位小数 |
| 历史已抵扣分成款 * | 同上（如 `0.00`） |

校验：超过两位 →「精确至小数点后两位」；与标记付款「实际付款金额」交互一致（文本输入 + 正则限制）。

#### B. 结算函 — 【下载】PDF 可打开（`mockPdf.ts` + `SettlementLetterDrawer`）

**问题**：旧实现将纯文本 Blob 标为 `application/pdf`，下载后打开报损坏。

**修正**：`utils/mockPdf.ts` 生成 PDF 1.4 合法结构（STSongStd-Light + UniGB-UCS2-H）；中文/英文各写入结算摘要（合计②/④、支付金额、大写等）。文件名：`结算函_{厂商}.pdf` / `结算函_EN_{厂商}.pdf`。

> 原型 mock：PDF 为摘要文本页，版式与抽屉内 HTML 表格不完全一致，但文件可正常打开。

#### C. 改动文件（本轮）

`utils/mockPdf.ts`、`components/SettlementLetterDrawer.tsx`、`pages/VendorIncomePage.tsx`、`ui-spec.md`、`conversation-memory.md`

---

### 19. 本次对话汇总（2026-07-11 ~ 07-12）

**业务定稿：内外部结算路径不同**

| 类型 | 数据进入方式 | 何时结算 | 主列表【结算】 |
|------|-------------|---------|---------------|
| 外部收入 | 导入并结算弹窗 | 弹窗内【结算】→【确认导入】 | **无** |
| 内部收入 / 内部退款 | 数据拉取（未结算） | 主列表【结算】 | **有** |

**外部收入结算规则**

1. 主列表查询栏仅保留【导入并结算】，去掉批量【结算】。
2. 弹窗流程：选渠道 → 上传报表 → 弹窗内【结算】（必需）→【确认导入】。
3. 确认导入写入主列表为**已结算**：`settled: true`；结算收入=弹窗内结果；结算时间=确认导入时间（`formatDateTime()`）。
4. 未完成弹窗结算时【确认导入】禁用；提示「请先完成弹窗内结算，再确认导入」。
5. 外部主列表**不要有未结算数据**；初始 mock 结算记录均为已结算；内部未结算仅来自【数据拉取】。

**实现**：`importExternal`（`store.tsx`）写已结算记录；`ExternalSettlementPage` 的 `canConfirmImport` 要求 `settlementIncome != null`。

**改动文件**：`ExternalSettlementPage.tsx`、`data/store.tsx`、`data/mock-data.ts`、`ui-spec.md`、`conversation-memory.md`。

---

## 关键文件地图

```text
src/prototypes/agent-game-finance/
├── index.tsx, style.css
├── components/
│   ├── DataTable.tsx, Pagination.tsx, ListSearchFields.tsx
│   ├── FormFields.tsx, VendorForm.tsx, Modal.tsx
│   ├── FilterBar.tsx, ColumnFilter.tsx, StatusBadge.tsx
│   ├── MonthRangePicker.tsx, VendorIncomeFieldHelp.tsx, MockFileUpload.tsx
│   ├── BusinessTypeSelect.tsx, FilterBar.tsx（含业务类型选择）
│   └── AdminLayout.tsx, Sidebar.tsx, SettlementLetterDrawer.tsx
├── data/types.ts, mock-data.ts, store.tsx   # businessType / scoped* / internalSettlementButtons 按业务分桶
├── utils/listKeyword.ts, columnFilters.ts, balance.ts, settlement.ts, monthRange.ts, invoiceTax.ts, externalImport.ts, financeCenter.ts, vendorPaymentApply.ts, payment.ts, settlementLetter.ts, businessScope.ts, prepayment.ts, mockPdf.ts
└── pages/
    ├── GameListPage.tsx      # 游戏 CRUD、合同、操作记录
    ├── VendorListPage.tsx
    ├── FormulaListPage.tsx, PaymentListPage.tsx
    ├── InternalSettlementPage.tsx, ExternalSettlementPage.tsx
    ├── VendorIncomePage.tsx
    ├── StatisticsPage.tsx    # 厂商/渠道/游戏收入统计
    └── RevenueSummaryPage.tsx # 收入汇总统计

src/resources/agent-game-finance/
├── ui-spec.md                # UI/交互规范（改样式必读）
└── conversation-memory.md    # 本文件（上下文/决策/进度）
```

---

## 数据与 ID 规则

- 厂商 ID：**4399** 从 **1001** 起、**快爆** 从 **2001** 起；游戏 ID：**4399** 从 **4001** 起、**快爆** 从 **5001** 起（`store.tsx` + `utils/businessScope.ts`）。
- Mock 结算样例 **S001–S025**（4399）+ **S301–S306**（快爆）；收入时间主要为 **2025-05 / 2025-06**；**无 2026 年初始结算数据**。
- **默认渠道费**（样例公式）：外部 **0%**、内部 **5%**（`makeFormula`）。
- 数据统计页默认查 `2025-05 - 2025-06`，否则列表可能「暂无数据」。
- **结算三页**默认查近两个月（如 `2026-06 - 2026-07`），与 mock 月份不一致时会「暂无数据」，需手动改 `2025-05 - 2025-06`。
- **未结算样例**：初始 mock **无**未结算记录（已移除 S008）；内部未结算仅通过【数据拉取】产生。
- **厂商收入 mock**：1004/1006/1008 余额 > 0 可申请；**1005 像素工坊**未填厂商预付测拦截；1001 有 P002 未付款。
- **快爆 mock**：2001–2003 厂商、5001–5004 游戏；P301 已付款样例。

**游戏名称字段**（勿混用）：

| 场景 | 取值 |
|------|------|
| 「游戏ID / 游戏名称」列、抽屉只读、搜索「游戏ID / 游戏名称」 | `onlineName` → `getGameName(id)` |
| 「合同游戏名称」列、搜索「合同游戏名称」 | `name` |

---

## 已知缺口 / 未做 / 注意

- 厂商 **1175px** 抽屉：厂商表单（`agf-form-grid`）与**结算函**（`SettlementLetterDrawer`）；结算函不走 730px 横向表单规则。
- 操作记录抽屉表格无分页。
- 未在 `AGENTS.md` 添加自动加载 ui-spec / conversation-memory 的规则（用户未确认）。
- 合同抽屉中付款代理金、委托开发费用**暂未**做必填校验。
- 结算三页列表「结算公式」列用 `displaySettlementFormula` 去前缀；结算公式管理列表仍保留「内部渠道：/外部渠道：」两行。
- 历史结算记录 `formulaText` 字段文案可能与列表实时计算略有差异；导入弹窗不再含「总收入」列。
- **外部收入结算主列表禁止未结算数据**；初始 mock 均为已结算；内部【结算】验收依赖【数据拉取】后的未结算行。

---

## 历史问题（已修复）

- 编辑游戏表单曾因合并函数签名损坏 → 已恢复 `EditGameForm` 独立闭包。
- 外部收入结算曾出现未结算样例 S009 → 已改为已结算；外部导入曾写未结算记录 → 已改为确认导入写已结算。

---

## Git 状态

| 项 | 值 |
|----|-----|
| 远程 | https://github.com/carrielilian/49game.git |
| 分支 | `main` |
| 远程最新 | `707ce1f`（2026-07-13 厂商收入等） |
| **本地** | 2026-07-14 厂商预付分成管理、账户余额口径、结算函⑤条件显示等改动**尚未推送**（用户说「推送到 git」时再 commit/push） |

---

## 给下一轮 AI 的提示

1. 改 UI 前先读 `ui-spec.md`，避免抽屉宽度、标签列、按钮色不一致。  
2. 列表查询遵循「有列才出框、多框 AND」。  
3. 状态枚举勿恢复旧值（停运、已终止等）。  
4. 合同保存要同步合作状态 + 写操作日志。  
5. 表单提交必须走校验：字段红字 + Toast，失败不关闭抽屉。  
6. DualCell / 表头用 `ID / 名称` 格式，斜杠前后有空格；表头加粗。  
7. 厂商银行信息 11 项全必填（含开户银行所在地）。  
8. 用户说「推送到 git」时再 commit/push，不要主动提交。  
9. 产品需求或设计方案有重大分歧时，按 `AGENTS.md` 门禁先对齐再继续实现。  
10. 重要对话结束前按用户要求更新本文件与 `ui-spec.md`。  
11. 数据统计无页内 Tab；时间用顶部 `MonthRangePicker`，默认 `getSampleMonthRange()`。  
12. 收入汇总「总收入」= 结算收入 − 结算退款；三收入统计页「总收入」= grossRevenue 合计，勿混口径。  
13. 数据统计已移除「累计流水」列；渠道收入统计含「总收入」。
14. 结算公式税率：跟随发票按厂商发票映射；勿恢复底部独立「发票设置」或「税点」输入框。  
15. **游戏名称**：「游戏ID / 游戏名称」一律 `onlineName`（`getGameName`）；「合同游戏名称」才用 `name`。  
16. 游戏添加/编辑：先「游戏名称」后「合同游戏名称」，带 `FieldHint`；编辑时归属厂商只读。  
17. 结算公式列表：新游戏同步空公式、未配置 `-`、公式列内外两行。  
18. 支持渠道：内部/外部均为勾选+填 ID（勾选后必填）；小标题「内部渠道」「外部渠道」。  
19. 结算三页列表无「总收入」；列为「待结算金额」；申请付款状态「未申请/已申请」。  
20. 列表/抽屉/弹窗表格：`--agf-gutter 24px` + `agf-table-wrap` 灰色实线外框；分页在边框外。
21. 外部导入：渠道**单选**；无运营游戏禁止上传；上传后切列表态 + `外部渠道：` meta + DataTable 分页。
22. 结算三页/导入列表「结算公式」列：用 `displaySettlementFormula`，不显示「外部：/内部：」前缀。
23. Toast 仅 `success`（绿）/ `error`（红）；主按钮禁用 `#F5F5F5` 底 `#BFBFBF` 字。
24. 样例渠道费：外部 0%、内部 5%。
25. 结算公式列表展示：`待结算金额*（1-渠道费-税率）*分成`；`displaySettlementFormula` 去前缀。
26. **内部/退款**主列表有【结算】；**外部**主列表无【结算】；结算时间无漏斗；内部未结算时收入/时间 `-`。
27. 结算三页查询 `gameAndVendor`；列含厂商ID、厂商名称（分两列，在游戏列右侧）。
28. 外部确认导入写**已结算**记录；结算时间=确认导入时间；弹窗内【结算】必需；分页下方留白 16+24px。
29. **外部收入结算主列表禁止未结算数据**；初始 mock 均为已结算；内部未结算仅来自【数据拉取】，勿再加静态未结算 mock。
30. **内部/退款结算**：两页独立；按钮状态 `internalSettlementButtons[businessType]`；**切换业务/页面不重置、浏览器刷新重置**；拉取上月数据；结算仅本页主列表未结算行。
31. **厂商收入**：账户总收入=累计收入−累计退款；账户余额=未申请结算收入−未申请退款（**不扣**预付）；预付在「预付分成管理」维护；字段说明见面包屑 **?** Modal。
32. **结算三页时间默认**：`getRecentTwoMonthsRange()` = 上个月 + 当前月。
33. **支持渠道**：内外部均勾选+填渠道游戏ID（勾选后必填）。
34. **FieldHint 在上、FieldError 在下**；PercentInput 同理。
35. **DataTable 无数据也显示分页**（共 0 条）。
36. **结算 mock 月份**：初始数据仅 2025-05/06；结算三页默认近两个月，查 mock 需手动改时间范围。
37. **厂商收入申请付款**：余额 > 0 才显示按钮；校验银行→**厂商**预付（未填）→未付款；操作列始终有【预付分成管理】。  
38. **厂商收入样式**：余额列黑色；操作列【申请付款】主题蓝链接。  
39. **外部结算完成态**：`externalSettlementButtons.settleCompleted` 仍用于外部导入流程，**不再**参与申请付款警告。  
40. **vendorPaymentApply.ts**：申请付款拦截逻辑集中在此工具。  
41. **付款管理操作列**：未付款=标记付款+结算函+请款凭证；已付款=详细信息+结算函+请款凭证。  
42. **付款状态**：未付款/已付款（非「待付款」）；`isUnpaidPayment` 兼容历史数据。  
43. **标记付款**：**待付款金额只读** + **实际付款金额可编辑**（两位小数）；付款银行、收款信息必填；不含结算函/电子发票；提交不关闭；**标记已付款关闭抽屉**；收款信息可编辑。  
44. **请款凭证**：结算函、电子发票 `MockFileUpload`；标签「结算函」；**已上传文件可删除**。  
45. **详细信息**：仅已付款；含付款状态；**不含**申请付款时间/付款时间（仅列表列）；仅备注可编辑。  
46. **MockFileUpload**：选择文件+列表+点击下载+**× 删除**；无虚线分隔；用于请款凭证。  
47. **列表空状态**：`DataTable` 无数据时表头保留、表体居中空盒插画+「暂无数据」、分页仍显示共 0 条。  
48. **结算函 1175px**：按 `settlementIds` 过滤；连续月份合并；下载中文/英文；公式①/③；⑤ 基于厂商剩余未抵扣分成款；**remaining>0** 才显示⑤行与函内剩余行，否则总计 **②-④**（无⑤）。  
49. **updatePayment / settlementIds**：付款记录部分更新；申请付款时绑定结算 ID 列表。  
50. **平台名称**：侧栏与面包屑用「代理游戏台账」，勿恢复「代理游戏财务」。  
51. **数据统计侧栏**：仅显示「收入汇总统计」；其余 3 个统计页菜单隐藏、路由保留。  
52. **内部结算拉取后时间**：保持近两个月，存 `internalSettlementButtons[businessType][type].monthRange`；勿改回拉取后切单月。  
53. **申请付款确认弹窗**：`compact` 样式 `min-width: 420px`。
54. **业务类型**：列表左上角 `BusinessTypeSelect`（4399/快爆）；`Vendor.businessType`；scoped 列表过滤；ID 段 100x/400x vs 200x/500x；数据互不相干。
55. **业务类型选择框宽**：`.agf-select.agf-business-type-select` **100px**。
56. **厂商预付分成款**：`Vendor.prepayment?`；**0 合法**；未填才拦截申请付款；在厂商收入【预付分成管理】维护；合同管理**无**此字段；**已抵扣=已付款之和+历史**（预付−合计≤0 取预付）；**剩余=预付−已抵扣**；抽屉只读项取**已保存**值。  
57. **预付分成管理输入**：预付分成款、历史已抵扣分成款**精确至小数点后两位**（如 `800000.00`、`0.00`）。  
58. **结算函⑤**：`remaining−(②−④)>0` → ⑤=②−④，否则 ⑤=remaining；函内剩余=remaining−⑤；`remaining>0` 才显示⑤相关行。  
59. **prepayment.ts**：厂商已抵扣/剩余计算、结算函 `calcLetterPrepaymentDeduction` 共用。  
60. **mockPdf.ts**：结算函【下载】生成可打开 PDF（非纯文本假 PDF）；`SettlementLetterDrawer` 中英文摘要。  
61. **vendorPaymentApply**：未补充预付 = 厂商 `prepayment` 未填（非 0）。  
62. **internalSettlementButtons / externalSettlementButtons**：按 `businessType` 分桶存储。
