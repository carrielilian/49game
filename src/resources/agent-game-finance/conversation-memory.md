# 代理游戏台账 — 对话记忆 / 项目上下文

> **用途**：在新 Cursor 对话中快速恢复本项目背景、已做决策和待办，避免重复对齐。  
> **UI 细节**：改样式、表单、抽屉、分页等请优先读 [`ui-spec.md`](./ui-spec.md)。  
> **最后更新**：2026-07-24（删除厂商收入、厂商付款管理功能及代码）  
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

### 2026-07-24 最新（删除厂商级收入/付款功能）

- 删除 `vendor-income`、`payment-list` 路由及页面渲染分支；旧深链回到默认厂商管理页。
- 删除 `VendorIncomePage.tsx`、`PaymentListPage.tsx`、`VendorIncomeFieldHelp.tsx`、`vendorPaymentApply.ts`。
- 删除厂商付款 mock、厂商余额/付款状态、厂商申请付款及厂商预付抵扣专属逻辑。
- 游戏收入、游戏付款、游戏申请付款快照与游戏结算函继续保留。
- 侧栏「财务分成管理」现仅保留：结算公式、外部/内部/退款结算、游戏收入管理、游戏付款管理。

### 2026-07-22 最新（结算函快照 · ⑤ · 支付币种 · 标记付款）

| 主题 | 要点 |
|------|------|
| **游戏【申请付款】** | 确认成功时冻结 `GamePaymentApplySnapshot` + `SettlementLetterSnapshot`；写入 `gamePayments` **首行**；结算明细改「已申请」；余额清零 |
| **结算函只读** | 随时打开均读申请时快照；**与未/已付款无关**；源数据后续变更不影响 |
| **标记已付款** | **不**更新结算函（含「实际付款金额」）；`markGamePaid` 不写 `letterSnapshot`；表单实付仅进付款记录/列表 |
| **支付币种** | 【申请付款】那一刻快照（`contractPaymentCurrency`）；⑤ 分支按此币种，**非**付款币种 |
| **剩余未抵扣分成款** | 申请时刻游戏收入列表快照；`remaining>0` 才显示⑤两行 |
| **汇率行** | 付款币种=美金；或（支付币种快照=美金 且 申请时剩余>0）；汇率=申请月上月末、四位小数 |
| **实际付款金额（游戏结算函）** | 申请时按【标记付款】三种情况算出 `letterPayAmount` 并冻结；与标记后表单填写值无关 |
| **【标记付款】自动填充** | 五种→三种；见 **§51**；`gamePaymentMarkDefaults.ts` |
| **GP001 mock** | 待付 202,500；实付 $0；⑤ ≈$28,085.99；函内剩余 ≈$326,914.01（仅 S004） |
| **批注** | 结算函/申请付款批注改自然业务语言；支付币种规则改为「申请快照」 |

**关键文件**：`gamePaymentApplySnapshot.ts`、`settlementLetterSnapshot.ts`、`settlementLetter.ts`、`gamePaymentMarkDefaults.ts`、`SettlementLetterDrawer.tsx`、`GamePaymentListPage.tsx`、`store.tsx`、`letter-drawer.md`、`apply-payment-action.md`

### 2026-07-20 最新（Batch 7 批注 + 体验 + 功能对齐）

#### 批注接入（Batch 0–7，用户已确认）

| 批次 | 页面 | 节点数（约） |
|------|------|-------------|
| 0 | 基础设施（`AnnotationViewer`、顶栏开关、`annotation-source`） | — |
| 1–6 | 厂商/游戏/公式/外部·内部·退款结算 | 已验收 |
| 7 | 游戏收入(7)、游戏付款(11)、收入汇总(5，含导出) | 已验收 |

- **批注约定**：自然语言；蓝逻辑 / 绿状态 / 橙表单；操作列 marker 在按钮上；抽屉内锚点仅抽屉打开时可见。
- 厂商收入、厂商付款管理已于 2026-07-24 完整删除，不再存在隐藏页或深链入口。
- **关键文件**：`docs/annotations/**`、`utils/buildAnnotationSource.ts`、`annotation-source.json`、`index.tsx`、`utils/resolveAnnotationElement.ts`、`components/OverlayScope.tsx`、`utils/annotationPanelWidth.ts`。

#### 批注体验

| 项 | 规则 |
|----|------|
| 序号默认显示 | `index.tsx` → `defaultMarkerIndexVisible: true` |
| 气泡宽度 560px | `utils/annotationPanelWidth.ts` 向 Shadow DOM 注入；**普通 `style.css` 无效** |

#### 本轮功能 / UI 调整

| 主题 | 要点 |
|------|------|
| **收入汇总【导出】** | 当前筛选 CSV；字段同列表；文件名 `收入汇总统计-{维度}-{YYYY-MM-DD}.csv`；按钮在「厂商名称」**右侧 inline**（非 `aside` 右对齐）；`RevenueSummaryPage.tsx` |
| **请款凭证上传说明** | 结算函/电子发票按钮下灰色 hint：「支持的上传格式为：png、jpg、pdf」；`MockFileUpload.hint` |
| **游戏收入【申请付款】成功** | 绿 Toast「申请付款成功，账户余额已清零」；`store.applyGamePayment` 在 `gamePayments` **数组最前**插入「未付款」记录 |
| **游戏【标记付款】** | 仅「取消 + 标记已付款」；**无【提交】**；成功 Toast「提交成功」 |
| **【付款设置】** | 分成付款公司未保存时**为空**（不从付款方回填）；已抵扣/剩余只读、不随输入实时算 |

#### 与旧规范对齐的决策（以批注 + 代码为准）

| 主题 | 现行 |
|------|------|
| 分成付款公司初始值 | 未保存 → 空（「请选择」），**不**默认 `Game.payer` |
| 标记付款未配置分成付款公司 | **不拦截**；申请付款前须在【付款设置】维护 |
| 游戏标记付款按钮 | 取消 + 标记已付款（厂商隐藏页仍三按钮） |
| 标记已付款 Toast | 「提交成功」（厂商/游戏一致） |

### 2026-07-20（支付币种 + 操作记录）

| 主题 | 要点 |
|------|------|
| **支付币种迁至合同管理** | 厂商表单移除支付币种；合同管理新增单选必填；各模块读 `Contract.currency`；未设置时 `CurrencyInput` 无前缀；详见 **§49** |
| **操作记录金额格式化** | 合同变更日志金额带币种符号与千分位（`buildContractChangeDetail`）；详见 **§50** |

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

**添加顺序**（2026-07-16 更新，见 §31-E / §35）：游戏名称* → 合同游戏名称* → 归属厂商* → **付款方*** → 游戏负责人（选填）→ 版号 → 运营状态 → 备注。

**编辑顺序**：游戏 ID(只读) → 游戏名称* → 合同游戏名称* → 归属厂商(只读) → **付款方*** → 游戏负责人 → 版号 → 运营状态 → 备注。

**字段说明**（输入框下方，`FieldHint` / `agf-form-hint`，12px 弱化色）：
- 游戏名称：「游戏上线后所使用的正式名称」
- 合同游戏名称：「签约合同所使用的游戏名称」

**校验拆分**：`ADD_GAME_REQUIRED` / `EDIT_GAME_REQUIRED` 均含**付款方**；共享 `GameNameFields` 组件。

### 4. 合同管理抽屉

> **2026-07-20 现行规范**见 **§49**（支付币种在合同管理维护）；**§32**（合作内容/复合型金额）。

**字段顺序**：

1. 游戏 ID / 游戏名称 — 只读  
2. 合同编号 *  
3. **支付币种** * — 单选「人民币」/「美金」；保存必填；选中后下方金额输入显示 ￥/$ 前缀  
4. 合同金额 * — `CurrencyInput`；前缀取 `Contract.currency`；**未选币种时前缀为空**  
5. 合作内容 * — 多选：游戏代理金、预付分成款、委托开发费  
6. 已付* 字段 — 随合作内容勾选显示（复合型输入 + FieldHint）  
7. 补充说明 — 选填  
8. 合作状态 — 保存同步游戏 + 操作日志  

**已移除**：版号费(已支付)、已抵扣预付分成款、原「合同信息说明」（改「补充说明」）；**厂商管理「支付币种」**（`Vendor.currency` 已删除）。

**类型**（`data/types.ts`）：`contractNumber, currency?, contractAmount, cooperationContents, paidAgencyFee?, paidPrepayment?, paidDevelopmentFee?, supplementalNote, cooperationStatus`。

### 5. 操作记录

- 类型：**添加游戏 | 运营状态 | 合作状态 | 合同变更**。
- 「操作」列：添加游戏 →「添加游戏」；运营/合作状态 → `StatusBadge`；**合同变更** → 多行纯文本（`agf-log-detail`，`white-space: pre-line`）。
- **合同变更**（`updateContract` → `buildContractChangeDetail`）：当合同**合同金额**、**已付游戏代理金**、**已付预付分成款**、**已付委托开发费**任一变更时写入；格式 `"字段名"变更为"值"`，多字段换行；未填写显示 `"-"`；**金额**取保存后 `Contract.currency`，展示**币种符号 + 千分位**（`formatOptionalCurrencyMoney`，如 `"￥9,894.00"`）。
- 排序：**时间新→旧**。类型 `GameOperationLog` 使用 `action` + 可选 `status` / `detail`。
- 游戏 4001 示例 mock：含合同变更示例（`GL005`，`"已付游戏代理金"变更为"￥546.00"`）。
- 写入点：`addGame`、`updateGame`（运营状态）、`updateContract`（合作状态 + 合同变更）。
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
| 只读字段 | `ReadonlyField`；只读金额用 `ReadonlyCurrencyField`（`FormFields.tsx`） |
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
| 添加游戏 | 游戏名称、合同游戏名称、归属厂商、**付款方** | `GameListPage` → `validateGameForm(ADD_GAME_REQUIRED)` |
| 编辑游戏 | 游戏名称、合同游戏名称、**付款方**（归属厂商只读，不校验） | `GameListPage` → `validateGameForm(EDIT_GAME_REQUIRED)` |
| 预付分成管理 | 预付分成款、历史已抵扣分成款 | `VendorIncomePage` 抽屉；≥0；失败 Toast「请完善所有信息」 |
| 添加/编辑厂商 | 厂商名称、**支持币种**、发票信息、开户名称、开户银行、**开户银行所在地**、支行名称、银行卡号（**8 项**）；联系人/手机/邮箱/单位地址**选填** | `VendorForm` → `validateVendorForm` + `VENDOR_REQUIRED` |
| 合同管理 | 合同编号、合同金额、合作内容（≥1）；已勾选合作内容对应已付金额 | `GameListPage` → `saveContract`；`CurrencyInput` + `agf-checkbox-group` |

> **2026-07-16**：游戏负责人选填；**付款方必填**（添加/编辑）；厂商联系信息 4 项选填。**支持币种**在厂商管理维护。合同抽屉见 §32/§33。

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

### 11. 数据统计（2026-07-09 起；2026-07-16 精简）

**导航**：侧栏「数据统计」下**仅**「收入汇总统计」（`stats-summary`）。**已删除**厂商/渠道/游戏收入统计三页（`StatisticsPage.tsx`、`stats-vendor` / `stats-channel` / `stats-game` 路由）。

**时间查询**：顶部 `MonthRangePicker`；表头「时间」列无漏斗筛选。默认 `getSampleMonthRange()` → **2026-06 - 2026-07**（与结算 mock 对齐）。

**收入汇总统计**（`RevenueSummaryPage.tsx`）：

- 查询维度：游戏 / 渠道 / 厂商 + `ListSearchFields`（`gameAndVendor`）
- **支付金额**：= 合同三项已付之和（`calcContractPaymentTotal`）；币种取归属厂商；千分位 + ￥/$
- **总收入** = 结算收入 − 结算退款（内部仍按结算记录聚合，**列表不再展示**结算收入/结算退款列）
- **结算付款金额**（列表列）：游戏付款管理**已付款**记录 **`actualAmount`** 按维度累加；时间按 **付款时间** 月份对齐行「时间」；固定 **￥** + 千分位
  - **游戏**：该游戏当月已付款实际金额之和
  - **厂商**：该厂商下游戏当月之和
  - **渠道**：该渠道当月结算涉及游戏（`paymentGameIds`）的当月已付款之和
- 列表列（三维度）：时间、维度列、**支付金额**、**总收入**、**结算付款金额**（已移除结算收入、结算退款列）

（历史）厂商/渠道/游戏收入统计三页已于 2026-07-16 移除，口径不再维护。

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
| 操作 | 结算公式、操作记录 |

> **2026-07-16**：【支持渠道】已迁至游戏管理，见 §31-B。

- **数据来源**：与游戏管理同步；`addGame` 时 `createEmptyFormula` 写入空公式。
- **初始状态**：新游戏公式为空，列表显示 `-`，配置保存后才展示文案（`isFormulaConfigured`）。
- **排序**：新增游戏置顶（与游戏管理一致）。

**结算公式设置抽屉**

- 去掉只读区与分区之间的灰色分割线；「内部/外部渠道结算公式设置」小标题 `font-weight: 700`。
- 「税点」曾更名「税率」，现表单标签统一为 **扣税点**；单选：**跟随发票 / 自定义**（内外渠道各自独立 `internalTaxMode` / `externalTaxMode`）。
- **跟随发票**：按厂商 `invoiceInfo` 映射只读扣税点；发票为「其他」时显示复合输入框。
  - 专票 6% → 0%；专票 3% → 3.36%；专票 1% → 5.6%；普通发票 → 6.72%。
- **自定义 / 其他**：`DecimalPercentInput` 手输百分数（最多两位小数，右侧 `%` 后缀）。
- 渠道费/分成：`PercentInput`（0–100 整数，复合 `%` 后缀）；存储仍为小数；下方灰字「请输入0-100的整数」。
- 复合输入组件：`PercentAffixInput` / `DecimalPercentInput`；前缀（￥/$）与后缀（%）背景统一灰 `#f5f7fa`。
- 顶部只读区：游戏ID/游戏名称、厂商ID/名称、当前结算公式（内外两行，无则 `-`）。
- 已移除抽屉底部独立「发票设置」区块（原 `invoiceMode` / `customInvoice`）。
- 工具：`utils/invoiceTax.ts`；厂商发票选项补「普通发票」。

**支持渠道**（2026-07-16 起：`SupportChannelsDrawer` + **游戏管理**入口；仅内部渠道，见 §31-B）

- 小标题：**内部渠道** / **外部渠道**（非「勾选」后缀）；标题位置不缩进。
- 说明（`FieldHint`，标题下方 12px 灰字）：
  - 内部：「请勾选支持的内部渠道，并填写该渠道下对应的游戏ID」
  - 外部：「请勾选支持的外部渠道，并填写该渠道下对应的游戏ID」
- **内外渠道行结构一致**：`[勾选] 渠道名称 [渠道游戏ID 输入框]` 单行；行左缩进 `48px`（`agf-channel-row`）；输入框宽 **200px**。
- **校验**：内外部渠道勾选后「渠道游戏ID」**必填**；未勾选不校验；`validateChannelsForm`；失败 Toast「请完善所有信息」。
- 厂商名称与「内部渠道」标题间距收紧（`agf-channel-drawer-meta`）。
- 外部导入匹配：`externalImport.ts` 按外部渠道名 + `channelGameId` 解析游戏。

**操作记录抽屉**：顶部 `agf-drawer-meta` 仅显示游戏ID/游戏名称；表格 `agf-table-wrap` 外框；列：操作人、**操作时间**（`YYYY-MM-DD HH:mm:ss`）、结算公式/操作；新建记录用 `formatDateTime()`。

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
- 数据统计仍用 `getSampleMonthRange()`（mock **2026-06/07**）。

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

- 初始结算样例 **S001–S027**（4399）+ **S301–S307**（快爆）的 `incomeTime` 为 **2026-06 / 2026-07**；与结算三页默认近两个月一致，打开即可见数据。
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
| 3 | 厂商付款管理存在该厂商 `status=未付款`（兼容历史 `待付款`） | 存在一笔未付款的记录 |

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

#### A. 厂商付款管理 — 操作列（`PaymentListPage`）

| 状态 | 操作（顺序） |
|------|-------------|
| 未付款 | 【标记付款】→【结算函】→【请款凭证】 |
| 已付款 | 【详细信息】→【结算函】→【请款凭证】 |

- 付款状态枚举：**未付款** / **已付款**（`types.ts`；历史 mock `待付款` 由 `normalizePaymentStatus` 兼容）。
- 列表列名：**待付款金额**、**实际付款金额**；申请时间 / 付款时间**精确到秒**。

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

#### A. 厂商付款管理 — 详细信息抽屉补全

- 补充只读字段：**付款状态**。
- 申请时间、付款时间**仅在列表展示**，详细信息抽屉不含。
- 字段顺序：厂商ID → 厂商名称 → 付款状态 → 待付款金额 → 实际付款金额 → 付款银行 → 收款信息 → 备注。

#### B. 改动文件（本轮）

`PaymentListPage.tsx`、`ui-spec.md`、`conversation-memory.md`

### 25. 本次对话汇总（2026-07-14 晚间）

#### A. 标记付款 — 交互调整

| 项 | 规则 |
|----|------|
| 【标记已付款】 | 校验通过后**关闭抽屉**；绿 Toast「提交成功」 |
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

`data/types.ts`、`data/mock-data.ts`、`data/store.tsx`、`utils/businessScope.ts`、`utils/settlementLetter.ts`、`utils/vendorPaymentApply.ts`、`utils/balance.ts`、`components/BusinessTypeSelect.tsx`、`components/FilterBar.tsx`、`components/SettlementLetterDrawer.tsx`、`pages/*ListPage.tsx`、`pages/InternalSettlementPage.tsx`、`pages/ExternalSettlementPage.tsx`、`pages/VendorIncomePage.tsx`、`pages/RevenueSummaryPage.tsx`、`pages/GameListPage.tsx`、`style.css`、`ui-spec.md`、`conversation-memory.md`

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
| 已抵扣分成款 | 只读；**已付款待付款金额之和 + 历史已抵扣**；若预付 − 上述合计 ≤ 0 则取预付分成款；取**已保存**值 |
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

**剩余未抵扣预付分成**（函内）= `remaining − ⑤`；**支付金额（大写）** = ②−④−⑤（有⑤）或 ②−④（无⑤）。

**显示规则**（2026-07-17 更新）：
- **总计②-④**、**汇率**、**实际付款金额** 始终显示
- `remaining > 0` 时额外显示：**结算/抵扣金额**（原⑤）、**剩余未抵扣预付分成款**
- 已移除「总计②-④-⑤」行

**P001（1003）验收**：列表剩余未抵扣 582,200；总计②-④=367,800 → ⑤=367,800；支付金额大写零元整；函内剩余=214,400。

#### E. 改动文件（本轮）

`data/types.ts`、`data/mock-data.ts`、`data/store.tsx`、`utils/prepayment.ts`、`utils/balance.ts`、`utils/settlementLetter.ts`、`utils/vendorPaymentApply.ts`、`pages/VendorIncomePage.tsx`、`pages/GameListPage.tsx`、`components/SettlementLetterDrawer.tsx`、`components/VendorIncomeFieldHelp.tsx`、`ui-spec.md`、`conversation-memory.md`

### 28. 本次对话汇总（2026-07-15）

#### A. 厂商付款管理 — 【标记付款】字段拆分（`PaymentListPage`）

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
| 已抵扣分成款 | **已付款待付款金额之和 + 历史已抵扣**；若预付 − 上述合计 ≤ 0，则取预付分成款 |
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

### 31. 本次对话汇总（2026-07-16）

#### A. 侧栏与面包屑分组更名（`index.tsx`）

| 原名称 | 新名称 |
|--------|--------|
| 游戏管理 | **游戏支付管理** |
| 财务管理 | **财务分成管理** |

面包屑第三段 `PAGE_META.group` 同步；子菜单名称不变（厂商管理、游戏管理、结算公式管理等）。

#### B. 渠道清单与支持渠道（`mock-data.ts`、`SupportChannelsDrawer.tsx`）

| 项 | 规则 |
|----|------|
| 内部渠道 | 移除 **H5游戏**；现 6 项：快爆付费、快爆内购、游戏盒付费、游戏盒内购、快爆小游戏广告、49广告联盟 |
| 外部渠道 | 新增 **游乐外放**；现 5 项：纯游外放、游乐外放、游乐IOS、快爆游IOS、49外放 |
| 支持渠道抽屉 | **仅内部渠道**（勾选 + 渠道游戏ID）；**无**外部渠道填写区块 |
| 入口迁移 | 自结算公式管理操作列迁至 **游戏管理** 操作列（编辑 → 合同管理 → **支持渠道** → 操作记录） |
| 组件 | `components/SupportChannelsDrawer.tsx`；`FormulaListPage` 操作列仅「结算公式」「操作记录」 |

#### C. 外部收入 — 导入并结算（`ExternalSettlementPage`、`externalImport.ts`）

| 项 | 规则 |
|----|------|
| 上传报表字段 | **收入时间、游戏名称、厂商名称、待结算金额**（非渠道游戏ID） |
| 匹配规则 | 游戏名称 = `onlineName` + 厂商名称 = `Vendor.name` |
| 移除校验 | 不再判断「该渠道是否有勾选游戏」；选渠道即可上传 |
| 预览列表列 | 收入时间 → 游戏ID/游戏名称 → **厂商名称** → 待结算金额 → 结算公式 → 结算收入（**无**渠道游戏ID 列） |

#### D. 厂商管理 — 选填字段（`VendorForm.tsx`）

联系人、手机、邮箱、单位地址改为**选填**；必填 **8 项**：厂商名称、**支持币种**、发票信息、银行信息 5 项。

#### E. 游戏管理 — 列表与表单（`GameListPage.tsx`）

> **2026-07-16 后续重构**见 **§35**（付款方列/筛选/必填、三项已付列/排序、默认按添加时间、操作记录合同变更）。

**当轮（§31）列表列**：游戏ID/游戏名称、合同游戏名称、厂商ID、厂商名称、运营状态、操作；**已移除**游戏负责人、版号、合作状态列。

**添加/编辑表单顺序**（§35 后 **付款方必填**）：游戏名称* → 合同游戏名称* → 归属厂商* → **付款方***（4399/纯游/游乐/游戏之家/香港4399/游家时代）→ 游戏负责人（选填）→ 版号 → 运营状态 → 备注。

**校验**（§35 后）：`ADD_GAME_REQUIRED` / `EDIT_GAME_REQUIRED` 含游戏名称、合同游戏名称、**付款方**（添加另含归属厂商）；**不含**游戏负责人。

**字段**：`Game.payer: GamePayer`（必填）；`Game.createdAt` 添加时写入（§35）。

#### F. 合同管理抽屉（`GameListPage`、`Contract` 类型）

> **2026-07-16 二次重构**，见 **§32**。

| 字段 | 规则 |
|------|------|
| 游戏ID / 游戏名称 | 只读 |
| 合同编号 * | 必填文本 |
| 合同金额 * | 复合型输入；前缀取归属厂商 `Vendor.currency`（￥/$）；≥0 两位小数 |
| 合作内容 * | 多选：游戏代理金、预付分成款、委托开发费；至少一项 |
| 已付游戏代理金 * | 勾选游戏代理金时显示；复合型输入 + FieldHint |
| 已付预付分成款 * | 勾选预付分成款时显示 |
| 已付委托开发费 * | 勾选委托开发费时显示 |
| 补充说明 | 选填 |
| 合作状态 | 单选；保存同步游戏 + 操作日志 |

类型：`cooperationContents`、`paidAgencyFee?`、`paidPrepayment?`、`paidDevelopmentFee?`、`supplementalNote`；**支持币种**见 `Vendor.currency`。

#### G. 改动文件（本轮）

`index.tsx`、`data/types.ts`、`data/mock-data.ts`、`data/store.tsx`、`components/VendorForm.tsx`、`components/SupportChannelsDrawer.tsx`（新增）、`pages/GameListPage.tsx`、`pages/FormulaListPage.tsx`、`pages/ExternalSettlementPage.tsx`、`utils/externalImport.ts`、`ui-spec.md`、`conversation-memory.md`

### 32. 本次对话汇总（2026-07-16 续 — 合同管理重构）

#### A. 合同管理抽屉（`GameListPage`、`FormFields.tsx`）

| 项 | 规则 |
|----|------|
| 合同金额 | 必填；`CurrencyInput` 复合型输入；前缀 ￥ 或 $（**初版在合同内选币种，已迁至厂商 §33**） |
| 合作内容 | 必填多选：游戏代理金、预付分成款、委托开发费 |
| 条件已付字段 | 勾选后显示对应「已付*」复合型输入 + FieldHint；取消勾选清空 |
| 补充说明 | 选填（原合同信息说明） |
| 移除 | 版号费(已支付)、已抵扣预付分成款只读、合同内支持币种 |

组件：`CurrencyInput`（`agf-input-affix__prefix` 灰蓝底）；`agf-checkbox-group` 多选。

#### B. 改动文件

`data/types.ts`、`data/mock-data.ts`、`data/store.tsx`、`components/FormFields.tsx`、`pages/GameListPage.tsx`、`style.css`、`ui-spec.md`、`conversation-memory.md`

### 33. 本次对话汇总（2026-07-16 续 — 支持币种迁至厂商）

| 项 | 规则 |
|----|------|
| 支持币种 | 从合同管理迁至**厂商管理**添加/编辑表单；`Vendor.currency: ContractCurrency`；必填；人民币/美金，默认人民币 |
| 厂商表单布局 | 1175px 宽表第二行：**单位地址** \| **支持币种** \| **发票信息**（5 列栅格：2+1+2） |
| 厂商必填 | `VENDOR_REQUIRED` 增至 **8 项**（含支持币种） |
| 合同金额前缀 | 合同抽屉 `CurrencyInput` 通过 `getVendor(game.vendorId).currency` 只读继承；合同内**不可**编辑币种 |
| Mock | 厂商 **1003**（雷霆网络科技）= 美金；其下游戏（4005/4006）合同金额前缀 **$** |

改动：`data/types.ts`（`Vendor.currency`、移除 `Contract.currency`）、`VendorForm.tsx`、`mock-data.ts`、`GameListPage.tsx`、`ui-spec.md`、`conversation-memory.md`

### 34. 本次对话汇总（2026-07-16 续 — UI 对齐小修）

| 项 | 说明 |
|----|------|
| 游戏ID/名称斜杠 | `SupportChannelsDrawer`、`FormulaListPage` 只读/meta 统一为 `4001 / 名称`（斜杠前后空格） |
| 结算函 mock | 回退产品名移除「H5游戏」，改为「快爆付费」 |
| 原型评审 | `.spec/prototype-review.md` 复审至 2026-07-16 |

改动：`SupportChannelsDrawer.tsx`、`FormulaListPage.tsx`、`SettlementLetterDrawer.tsx`、`.spec/prototype-review.md`

### 35. 本次对话汇总（2026-07-16 续 — 游戏管理列表 / 金额 / 统计页）

#### A. 游戏管理主列表（`GameListPage.tsx`）

| 列 | 说明 |
|----|------|
| 付款方 | 表头筛选（6 选项）；mock 全量有值 |
| 游戏ID / 游戏名称、合同游戏名称、厂商ID、厂商名称 | |
| 已付游戏代理金 / 已付预付分成款 / 已付委托开发费 | 表头排序（`ColumnSort`）；有值 `formatOptionalCurrencyMoney`（`Contract.currency` + 千分位）；无值 `-` |
| 运营状态、操作 | 操作含编辑/合同管理/支持渠道/操作记录 |

- **默认排序**：`Game.createdAt` **新→旧**（添加时间）；点击已付列切换该列升/降序
- **付款方**：添加/编辑表单**必填**（`ADD_GAME_REQUIRED` / `EDIT_GAME_REQUIRED`）
- **Mock**：16 款游戏均有 `payer`；合同均含三项合作内容且已付金额 > 0

#### B. 操作记录 — 合同变更

- `GameOperationLogAction` 新增 **`合同变更`**；`detail` 多行文本
- 监听字段：合同金额 + 三项已付；格式 `"字段名"变更为"值"`；清空为 `"-"`；金额带币种符号与千分位
- 工具：`utils/contractLog.ts` → `buildContractChangeDetail`、`calcContractPaymentTotal`、`formatOptionalCurrencyMoney`（via `settlement.ts`）

#### C. 业务类型下拉

- UI 显示 **游戏盒** / 快爆（内部值仍为 `4399` / `快爆`）；`BUSINESS_TYPE_OPTIONS` in `businessScope.ts`

#### D. 收入汇总统计 — 支付金额

- 第三列 **支付金额** = `calcContractPaymentTotal`（与游戏管理合同一致）
- 游戏维度：单游戏合同合计 + **`Contract.currency`**；渠道/厂商维度：关联游戏合计
- 总收入/结算付款金额：结算口径，**￥** + 千分位（列表已无结算收入/结算退款列）

#### E. 主列表金额展示（全平台）

- `formatMoney`：千分位两位小数（`zh-CN` locale）
- `formatCurrencyMoney(value, currency)`：符号 + 千分位
- `SETTLEMENT_CURRENCY = '人民币'`：**外部/内部/内部退款结算**及收入汇总结算列固定 ￥
- 游戏管理已付列、收入汇总支付金额：按 **`Contract.currency`**（`resolveContractCurrency`）
- 厂商/游戏收入预付列、【付款设置】输入前缀：`prepaymentCurrency` 快照 ?? `Contract.currency`

#### F. 移除三统计页

- 删除 `pages/StatisticsPage.tsx`；移除 `stats-vendor` / `stats-channel` / `stats-game` 路由
- 数据统计仅保留 **收入汇总统计**

#### G. 改动文件

`GameListPage.tsx`、`RevenueSummaryPage.tsx`、`InternalSettlementPage.tsx`、`ExternalSettlementPage.tsx`、`VendorIncomePage.tsx`、`PaymentListPage.tsx`、`utils/settlement.ts`、`utils/contractLog.ts`、`utils/businessScope.ts`、`utils/columnFilters.ts`、`components/ColumnSort.tsx`、`components/DataTable.tsx`、`data/types.ts`、`data/mock-data.ts`、`data/store.tsx`、`index.tsx`、`style.css`、`ui-spec.md`、`conversation-memory.md`

### 36. 本次对话汇总（2026-07-16 续 — 游戏收入 / 游戏付款管理）

#### A. 侧栏新增（`index.tsx`）

| 菜单 | 路由 | 说明 |
|------|------|------|
| **游戏收入管理** | `game-income` | 同厂商收入，**按游戏**聚合 |
| **游戏付款管理** | `game-payment-list` | 同厂商付款管理，**按游戏**聚合 |

置于「厂商收入」「**厂商付款管理**」（原付款管理）**下方**。

#### B. 游戏收入管理（`GameIncomePage.tsx`）

- 列表主键：`gameId`；列：**游戏ID/名称** → **厂商名称** → 账户总收入/余额、预付三列、累计收入/退款
- 查询：`ListSearchFields`（`gameAndVendor`）；币种取归属厂商
- 操作：【预付分成管理】（`Game.prepayment` / `historicalDeduction`）、余额>0 时【申请付款】
- 申请校验：`gamePaymentApply.ts`（银行→游戏预付→未付款）；`applyGamePayment` 仅标记**该游戏**结算记录
- 面包屑 **?**：`GameIncomeFieldHelp`；字段说明列表圆点无序号（`.agf-field-help-list`）

#### C. 游戏付款管理（`GamePaymentListPage.tsx`）

- 列表主键：`gameId`；列：**游戏ID/名称** → **厂商ID/名称** → 待付/实付金额（**￥**）、付款状态、时间、操作列
- 结算函：`SettlementLetterDrawer` 支持 `gameId` + `useGamePayments`，⑤ 按游戏预付计算
- Mock：`INITIAL_GAME_PAYMENTS`（GP001 已付 4005、GP002 未付 4001）；`GAME_PREPAYMENTS`（4009 未填测拦截）

#### D. 数据层

- 类型：`GameBalance`、`GamePaymentRequest`；`Game` 增 `prepayment?`、`historicalDeduction?`
- 工具：`deriveGameBalances`、`calcGamePrepaymentSummary`、`calcGameLetterPrepaymentDeduction`
- Store：`gameBalances`、`gamePayments`、`scopedGame*`、`applyGamePayment`、`markGamePaid`、`updateGamePayment`

#### E. Mock 验收要点

| 场景 | 预期 |
|------|------|
| 游戏 4008 / 4010 / 4012 | 账户余额 > 0，可【申请付款】 |
| 游戏 4009 / 5004（快爆） | 未填预付分成款 → 申请付款拦截 |
| 游戏 4001 / 5001 | GP002/GP301 **未付款** → 申请拦截 |
| 厂商 1007 | 银行不全 → 「未填写银行信息」 |
| 厂商 1005 | 厂商预付未填 → 拦截 |
| 厂商 1001 / 2002 | P002/P302 **未付款** |
| 4011 | 合作终止 + 公式未配置 |

> 完整矩阵见 **§38**。

### 37. 本次对话汇总（2026-07-16 续 — 厂商付款管理更名 / 口径与 UI）

#### A. 侧栏更名

- **付款管理** → **厂商付款管理**（`payment-list` 路由不变）；与 **游戏付款管理**（`game-payment-list`）区分

#### B. 已抵扣分成款口径（`prepayment.ts`，厂商+游戏共用）

| 项 | 规则 |
|----|------|
| 汇总字段 | 状态为**已付款**的付款记录，取 **`pendingAmount`（待付款金额）** 之和（非 `actualAmount`） |
| 字段说明文案 | `已抵扣分成款 = 已付款待付款金额之和 + 历史已抵扣分成款；若预付分成款 − 上述合计 ≤ 0，则取预付分成款（…均为保存后的数值）` |
| 组件 | `VendorIncomeFieldHelp.tsx`、`GameIncomeFieldHelp.tsx`；`ui-spec.md` 厂商/游戏收入字段说明 |

#### C. 字段说明弹窗列表样式（`style.css`）

- `.agf-field-help-list`：`list-style-type: disc`；**圆点列表、无序号**
- 用于厂商收入、游戏收入面包屑 **?** Modal

#### D. 改动文件（本轮）

`index.tsx`、`components/VendorIncomeFieldHelp.tsx`、`components/GameIncomeFieldHelp.tsx`、`utils/prepayment.ts`、`style.css`、`ui-spec.md`、`conversation-memory.md`

### 38. Mock 数据全量状态矩阵（2026-07-16）

**月份对齐**：结算 `incomeTime` 统一为 **2026-06 / 2026-07**；`getSampleMonthRange()` 与结算三页默认 `getRecentTwoMonthsRange()` 一致，打开即可见样例。

#### A. 主数据状态

| 维度 | 样例 | 说明 |
|------|------|------|
| 业务类型 | 4399 / 快爆 | 厂商 1001–1008 / 2001–2003；游戏 400x / 500x |
| 运营状态 | 已上线 / 未上线 | 4006、4011 未上线 |
| 合作状态 | 合作中 / 合作终止 | **4011** 合作终止 + 操作记录 GL006 |
| 版号 | 有 / 无 | 多游戏覆盖 |
| 付款方 | 6 项全有 | 4399/纯游/游乐/游戏之家/香港4399/游家时代 |
| 支持币种 | 人民币 / 美金 | **1003** 美金，其下 4005/4006 |
| 结算公式 | 已配置 / 未配置 | **4011** `createEmptyFormula`（导入拦截演示） |

#### B. 预付 / 银行 / 抵扣

| 场景 | 样例 | 验收 |
|------|------|------|
| 厂商预付未填 | **1005** | 「像素工坊未补充预付分成款信息」 |
| 厂商预付 = 0 | **1007** | 0 合法，不拦截预付 |
| 厂商历史已抵扣 | **1003** 80000 | 配合 P001 看已抵扣/剩余 |
| 厂商银行不全 | **1007** cardNumber 空 | 「未填写银行信息」（余额 24700） |
| 游戏预付未填 | **4009**、**5004**（快爆） | 游戏收入申请拦截 |
| 游戏预付 = 0 | **4012** | 0 合法 |
| 游戏历史已抵扣 | **4005** 25000 | 配合 GP001 |

#### C. 结算 / 申请付款

| 场景 | 样例 |
|------|------|
| 类型 external / internal / refund | S001–S027、S301–S307 |
| 申请付款状态 未申请 / 已申请 | 各半分布 |
| 厂商余额 > 0 可申请 | **1002**、**1004**、**1006**、**1008**、**2001**、**2003** |
| 厂商余额 ≤ 0 | **1003**（均已申请） |
| 厂商有未付款拦截 | **1001** P002；**2002** P302 |
| 游戏余额 > 0 可申请 | **4008**、**4010**、**4012** |
| 游戏有未付款拦截 | **4001** GP002；**5001** GP301 |

#### D. 厂商 / 游戏付款管理

| 状态 | 样例 |
|------|------|
| 已付款 + 结算函 + 发票 | P001（含美金）、P301、GP001（含美金） |
| 已付款缺凭证 | P003（全无）、P004/GP003（缺发票） |
| 未付款 | P002、P302、GP002、GP301 |

#### E. 改动文件

`data/mock-data.ts`、`utils/monthRange.ts`、`utils/externalImport.ts`、`conversation-memory.md`、`ui-spec.md`

### 39. 本次对话汇总（2026-07-16 续 — 收入/付款 UI 与字段）

#### A. 收入页金额币种（厂商收入 + 游戏收入）

| 列/场景 | 币种 |
|---------|------|
| 账户总收入、账户余额、累计收入/退款、已抵扣、剩余 | 固定 **￥**（`SETTLEMENT_CURRENCY`；来自内外部/退款结算） |
| 预付分成款 | **Vendor.currency** 符号；`prepayment` **未填**列表显示 `-` |

> 不再按归属厂商 `Vendor.currency` 显示结算口径金额（美金厂商如 1003 下游戏亦显示 ￥）。

#### B. 付款管理金额币种（厂商 + 游戏）

| 列/场景 | 币种 |
|---------|------|
| 列表待付款/实际付款金额 | 固定 **￥**（来自账户余额申请） |
| 【标记付款】待付款金额（只读） | **￥** + 千分位 |
| 【标记付款】实际付款金额 | `CurrencyInput`（**￥**）；必填 |
| 【标记付款】实际付款美金 | `CurrencyInput`（**$**）；**选填**；字段 `actualAmountUsd?` |
| 【详细信息】三金额字段 | 只读 **￥** / **$**；美金未填 `-` |

#### C. 游戏收入 / 游戏付款 — 主列表增列

- 「游戏ID / 游戏名称」右侧仅 **厂商名称**（无厂商ID列）；查询栏隐藏厂商ID输入
- 查询栏仍为 `ListSearchFields`（`gameAndVendor`）

#### D. 列头筛选下拉（`ColumnFilter.tsx`）

- 菜单 `createPortal` 挂 `document.body`；`position: fixed`；`z-index: 10000`
- 列表行数少时不被 `agf-table-wrap` `overflow` 裁切

#### E. Mock 补充

- GP001 `actualAmountUsd: 0`（情况3 全额预付抵扣；详细信息验收可改用 P001 美金字段）

#### F. 改动文件

`pages/GameIncomePage.tsx`、`pages/VendorIncomePage.tsx`、`pages/PaymentListPage.tsx`、`pages/GamePaymentListPage.tsx`、`components/ColumnFilter.tsx`、`components/FormFields.tsx`（`CurrencyInput`）、`data/types.ts`、`utils/payment.ts`、`data/mock-data.ts`、`style.css`、`ui-spec.md`、`conversation-memory.md`

### 40. 本次对话汇总（2026-07-16 续 — 导航/汇总/表单 UI）

#### A. 侧栏隐藏（`index.tsx`）

- **厂商收入**（`vendor-income`）、**厂商付款管理**（`payment-list`）从 `MENU_GROUPS` 与 `ROUTE` **移除**（侧栏不可见）
- 页面组件与 `#page=vendor-income` / `#page=payment-list` 路由渲染**仍保留**（深链可开）
- 侧栏「财务分成管理」现见：结算公式、外部/内部/退款结算、**游戏收入管理**、**游戏付款管理**

#### B. 游戏付款管理 — 时间列合并

- 「申请时间」「付款时间」合并为**同一列上下堆叠**（`TimeStackHeader` / `TimeStackCell`）；`DataTable` 列支持 `header` 自定义节点
- 列名「申请付款时间」已统一为 **申请时间**（厂商付款管理仍为两列分开）

#### C. 合同管理 — 合同金额初始为空

- `Contract.contractAmount?` 可选；`addGame` 不写默认 `0`
- 打开抽屉：未填或 `0` 且合同编号为空 → 输入框**留空**（不显示 `0.00`）；`contractAmountToField`

#### D. 结算公式 — 扣税点 + 复合百分数输入

- 表单标签「税率」→ **扣税点**（`FormulaListPage` / `TaxRateField`）
- 渠道费/分成：`PercentAffixInput`（整数 + `%`）；扣税点手输：`DecimalPercentInput`（百分数最多两位小数 + `%`）
- 抽屉 CSS：`.agf-form-field > .agf-form-input` 全宽规则不作用于 `.agf-input-affix` 内 input，避免 `%` 被裁切
- 复合输入前缀（￥/$）与后缀（%）背景统一 **`#f5f7fa`**

#### E. 操作记录 — 时间精确到秒

- 格式 `YYYY-MM-DD HH:mm:ss`（`formatDateTime`）；mock `INITIAL_GAME_LOGS` / `INITIAL_FORMULA_LOGS` 同步
- `store` 写入游戏/公式操作记录改用 `formatDateTime()`（替代 `toLocaleString`）

#### F. 收入汇总统计 — 列调整（`RevenueSummaryPage.tsx`）

| 变更 | 说明 |
|------|------|
| 移除 | 结算收入、结算退款列 |
| 新增 | **结算付款金额** = 游戏付款管理已付款 `actualAmount` 按维度+付款月份累加 |
| 保留 | 支付金额、总收入（总收入仍=结算收入−结算退款，内部计算） |

验收样例：游戏 `4005`、时间 `2026-07` → 结算付款金额 `￥0.00`（GP001 情况3 实付为 0；待付 202,500 已由预付抵扣）。

#### G. 改动文件

`index.tsx`、`pages/GamePaymentListPage.tsx`、`pages/GameListPage.tsx`、`pages/FormulaListPage.tsx`、`pages/RevenueSummaryPage.tsx`、`components/DataTable.tsx`、`components/FormFields.tsx`、`data/types.ts`、`data/store.tsx`、`data/mock-data.ts`、`utils/contractLog.ts`、`style.css`、`ui-spec.md`、`conversation-memory.md`

### 41. 本次对话汇总（2026-07-17）

#### A. 基线核对（无新功能需求）

- 对照 `ui-spec.md` 与 §40：**业务代码已对齐**，`.spec/prototype-comments.json` 无待办批注。
- 本轮未收到新的页面/字段/交互需求，仅完成计划内小修。

#### B. 隐藏页 ROUTE 注册（`index.tsx`）

| 项 | 规则 |
|----|------|
| 注册 | `vendor-income`、`payment-list` 加入 `defineHashPageRoute` |
| 侧栏 | **仍不在** `MENU_GROUPS` 展示 |
| 用途 | 深链 `#page=vendor-income` / `#page=payment-list` 与宿主 `AXHUB_PROTOTYPE_ROUTE_INFO` 路由列表完整 |

#### C. 原型评审更新

- [`.spec/prototype-review.md`](../../prototypes/agent-game-finance/.spec/prototype-review.md) 复审至 **§40**（含游戏收入/付款、结算付款金额、隐藏页 ROUTE）。

#### D. 改动文件（本轮）

`index.tsx`、`.spec/prototype-review.md`、`conversation-memory.md`、`ui-spec.md`

### 42. 本次对话汇总（2026-07-17 续 — 收入汇总查询总计）

#### A. 查询总计行（`RevenueSummaryPage` + `DataTable`）

| 项 | 规则 |
|----|------|
| 位置 | 主列表表体**第一行**；`DataTable` 新增 `leadingRow`（不参与分页） |
| 标签 | 时间列 **查询总计**；维度列留空 |
| 支付金额 | 当前筛选行按 `paymentCurrency` **分开求和**；`renderCurrencyTotals` + `CurrencyStackCell`；人民币在上、美金在下 |
| 总收入 / 结算付款金额 | 当前筛选行求和；**￥** + 千分位 |
| 空列表 | 不显示总计行 |

#### B. 改动文件

`pages/RevenueSummaryPage.tsx`、`components/DataTable.tsx`、`style.css`、`ui-spec.md`、`conversation-memory.md`

### 43. 本次对话汇总（2026-07-17 续 — 收入汇总渠道筛选）

#### A. 渠道列表头筛选（`RevenueSummaryPage`）

| 项 | 规则 |
|----|------|
| 生效维度 | 查询维度为 **渠道** 时 |
| 组件 | `ColumnFilter` 下拉（全部 + 内部/外部渠道清单） |
| 选项 | `INTERNAL_CHANNELS` + `EXTERNAL_CHANNELS` |
| 联动 | 筛选后列表与「查询总计」行同步重算；切换查询维度重置筛选 |

#### B. 改动文件

`pages/RevenueSummaryPage.tsx`、`ui-spec.md`、`conversation-memory.md`

### 44. 本次对话汇总（2026-07-17 续 — 游戏管理查询总计与导出）

#### A. 查询总计行（`GameListPage`）

| 项 | 规则 |
|----|------|
| 位置 | 表体**最后一行**（数据行下方）；`DataTable.trailingRow` |
| 汇总列 | 已付游戏代理金 / 已付预付分成款 / 已付委托开发费 |
| 口径 | 当前筛选结果按币种分别求和；复用 `renderCurrencyTotals` |

#### B. 导出（`utils/listExport.ts`）

| 项 | 规则 |
|----|------|
| 入口 | 查询栏**第一行**，「厂商名称」输入框**右侧**；`agf-btn--primary`（与【添加游戏】同色） |
| 布局 | 第一行：业务类型 + 查询框 + 【导出】；第二行 `FilterBar.actions`：【添加游戏】 |
| 字段 | 除「操作」外全部列表列（付款方、游戏ID/名称、合同游戏名称、厂商ID/名称、三项已付、运营状态） |
| 格式 | CSV（UTF-8 BOM）；文件名 **`游戏管理-{YYYY-MM-DD}.csv`**（连字符日期） |
| 反馈 | 绿 Toast「导出成功」 |

#### C. 改动文件

`pages/GameListPage.tsx`、`components/FilterBar.tsx`、`components/DataTable.tsx`、`utils/listExport.ts`、`style.css`、`ui-spec.md`、`conversation-memory.md`

### 45. 本次对话汇总（2026-07-17 续 — UI 对齐与小修）

#### A. 金额展示与对齐

| 项 | 规则 |
|----|------|
| 列表金额列 | 全平台 `Column.align: 'right'`（`COL_ALIGN_RIGHT`）；`agf-table__cell--right` + `tabular-nums` |
| 多币种组件 | `CurrencyAmount`（单行）、`CurrencyStackCell`（多行堆叠）、`renderCurrencyTotals`（查询总计） |
| 多币种堆叠 | 每行独立 `CurrencyAmount` 后纵向 `flex-end` 贴右；**符号与数字间距 4px**，避免 `$` 与数字大段留白 |

#### B. 收入汇总统计补充

| 项 | 规则 |
|----|------|
| 厂商维度列序 | 时间 → 厂商ID → **厂商名称** → **支付金额** → 总收入 → 结算付款金额（名称在支付金额前） |
| 渠道筛选 | 见 §43 |

#### C. 改动文件（本轮 UI）

`components/DataTable.tsx`、`style.css`、`pages/RevenueSummaryPage.tsx`、`pages/GameListPage.tsx` 及 §42–§44 所列各页金额列

### 46. 本次对话汇总（2026-07-17 续 — 付款设置 / 表单必填 / 标记付款）

#### A. 游戏收入 — 【付款设置】（原「预付分成管理」）

| 项 | 规则 |
|----|------|
| 入口/抽屉标题 | 操作列与抽屉均为 **付款设置** |
| 区块一 | **预付分成管理**：预付分成款、历史已抵扣（`CurrencyInput`，前缀取归属厂商 `Vendor.currency`）；已抵扣/剩余只读 |
| 区块二 | **付费设置**：分成付款公司（下拉，4399 / 纯游 / 纯游（美元） / 香港4399 / 游家时代）、付款币种（人民币/美金 单选）、付款账号（必填） |
| 数据字段 | `Game` / `Vendor`：`sharePaymentCompany`（`SharePaymentCompany`）、`sharePaymentCurrency`、`sharePaymentAccount` |
| 默认 | 游戏：分成付款公司未保存时**为空**（「请选择」）；付款币种默认人民币 |
| 未填展示 | 预付/历史未保存时输入框**空**（不显示 `0.00`）；预付未填时列表与抽屉只读「已抵扣/剩余」为 `-` |

#### B. 游戏收入列表

| 项 | 规则 |
|----|------|
| 列序 | 账户**余额**在账户**总收入**前 |

#### C. 标记付款（游戏/厂商付款管理）

| 项 | 规则 |
|----|------|
| 厂商付款 | 「付款方」下拉；选项同游戏管理付款方六项 |
| 游戏付款 | **移除「付款方」下拉**；改为只读 **「分成付款公司」**；取值 `Game.sharePaymentCompany`（游戏收入【付款设置】）；**不**在标记付款拦截未配置（申请付款前须在付款设置维护） |
| 游戏付款按钮 | **取消 + 标记已付款**（无【提交】）；成功 Toast「提交成功」 |
| 保存 | 游戏付款 `payBank` 写入当时分成付款公司快照 |

#### D. 结算函（`SettlementLetterDrawer`）

| 项 | 规则 |
|----|------|
| 行序 | 合计④ → **总计②-④**（始终）→ **汇率**（**仅付款币种=美金**）→（条件）**结算/抵扣金额** → **剩余未抵扣预付分成款** → **实际付款金额**（始终）→ 支付金额（大写） |
| 标签变更 | 「本次抵扣预付分成⑤」→ **结算/抵扣金额**；「剩余未抵扣预付分成」→ **剩余未抵扣预付分成款** |
| 移除 | **总计②-④-⑤** 行 |
| 汇率 | 取关联付款 `applyTime` **上一个月** 的 `ExchangeRateRecord.rate`；**付款币种=人民币时隐藏汇率行** |
| 实际付款金额 | **游戏付款**：同【标记付款】初始填充（`resolveGameMarkPaymentDefaults`）；人民币=`actualAmount`、美金=`actualAmountUsd`（展示 **$**）；**已付款后冻结入 `letterSnapshot`** |
| ⑤ 规则 | 不变：`remaining−(②−④)>0` → ⑤=②−④，否则 ⑤=remaining；仅 `remaining>0` 时显示结算/抵扣与剩余行 |

#### E. 分成付款公司选项（【付款设置】）

| 项 | 规则 |
|----|------|
| 类型 | `SharePaymentCompany`（与 `GamePayer` / 游戏管理「付款方」**独立**） |
| 选项 | `SHARE_PAYMENT_COMPANY_OPTIONS`：4399 / 纯游 / 纯游（美元） / 香港4399 / 游家时代 |
| 移除 | 游乐、游戏之家（仍保留在游戏管理「付款方」六项中） |

#### F. 游戏付款 — 【标记付款】初始填充（`gamePaymentMarkDefaults.ts`）

**触发**：每次打开【标记付款】按最新数据重算并写入输入框（用户可手动改）。

**输入变量**

| 变量 | 中文 | 来源 |
|------|------|------|
| pending | 待付款金额 | `GamePaymentRequest.pendingAmount` |
| prepay | 预付分成款 | `Game.prepayment`（未填=0） |
| remaining | 剩余未抵扣分成款 | `calcGamePrepaymentSummary` |
| contractCur | 合同支付币种 | `prepaymentCurrency ?? Contract.currency` |
| payCur | 付款币种 | `Game.sharePaymentCurrency`（默认人民币） |
| rate | 汇率 | 申请月**上一个月**月末汇率 |

**三种情况**

| 情况 | 条件 | 实际付款金额（￥） | 实际付款美金（$） |
|:----:|------|-------------------|------------------|
| 1 | 预付 ≤ 0 | = 待付 | 付款美金时 = 待付÷汇率 |
| 2 | 预付 > 0，合同人民币 | = net | = net ÷ 汇率 |
| 3 | 预付 > 0，合同美金 | = usdNet × 汇率 | = usdNet |

**Mock 验收**（汇率 7.21）：GP011/012=情况1；GP013/014/GP002=情况2；GP015=情况3。情况2 **始终填美金**（GP013 美金≈4,160.89，不再为空）。

**校验**：实际付款金额允许 **≥ 0**。

#### G. 厂商管理 / 游戏管理表单

| 项 | 规则 |
|----|------|
| 厂商字段更名 | 「支持币种」→ **支付币种**（`VendorForm` / `Vendor.currency`） |
| 游戏添加/编辑 | **版号**、**运营状态** 必填（`ADD_GAME_REQUIRED` / `EDIT_GAME_REQUIRED`） |
| 合同管理 | **合作状态** 必填 |

#### H. 改动文件（2026-07-17 本轮完整）

**页面/组件**：`GameIncomePage.tsx`、`VendorIncomePage.tsx`、`GamePaymentListPage.tsx`、`PaymentListPage.tsx`、`GameListPage.tsx`、`VendorForm.tsx`、`SettlementLetterDrawer.tsx`

**数据/工具**：`data/types.ts`（`SharePaymentCompany`、`ExchangeRateRecord`）、`data/mock-data.ts`（`GAME_SHARE_PAYMENT`、`INITIAL_EXCHANGE_RATES`、GP011–GP015）、`data/store.tsx`（`exchangeRates`）、`utils/columnFilters.ts`、`utils/gamePaymentMarkDefaults.ts`、`utils/exchangeRate.ts`、`utils/prepayment.ts`、`utils/settlementLetter.ts`

**文档**：`ui-spec.md`、`conversation-memory.md`

---

### 47. 本次对话汇总（2026-07-17 续 — 结算函 / 预付币种）

#### A. 结算函 — 汇率行 & 实际付款金额（`SettlementLetterDrawer`）

| 项 | 规则 |
|----|------|
| 付款币种来源 | 游戏：`Game.sharePaymentCurrency`；厂商：`Vendor.sharePaymentCurrency`；默认人民币 |
| **汇率行** | **仅付款币种 = 美金**时显示；取 `applyTime` 上月经 `ExchangeRateRecord.rate` |
| **实际付款金额（游戏）** | 未付款：同【标记付款】初始填充（`resolveGameMarkPaymentDefaults`）；人民币 → `actualAmount`（**￥**）；美金 → `actualAmountUsd`（**$**） |
| **实际付款金额（厂商）** | 未付款：仍用公式 `②−④−⑤`（无⑤时为 `②−④`） |

#### B. 结算函 — 已付款快照（`letterSnapshot`）

| 项 | 规则 |
|----|------|
| 类型 | `SettlementLetterSnapshot`（`data/types.ts`） |
| 写入时机 | 【标记已付款】时由 `buildSettlementLetterSnapshot` 生成并写入付款记录 |
| 实际付款金额入快照 | 取标记付款表单提交值（人民币=`actualAmount`、美金=`actualAmountUsd`） |
| 读取 | `SettlementLetterDrawer` 有 `letterSnapshot` 则**只读快照**，不再随汇率表/预付/付款设置变更 |
| Mock | `mock-data.ts` 对已付款记录（P001/GP001 等）启动时自动生成快照 |

#### C. 结算函 — 结算/抵扣金额 & 剩余未抵扣预付分成款（⑤，游戏维度）

**显示条件**：游戏/厂商「剩余未抵扣分成款」`remaining > 0`。

**remaining**：`calcGamePrepaymentSummary` / `calcVendorPrepaymentSummary` 的 `remainingPrepayment`（预付 − 已抵扣；已抵扣 = 已付款待付之和 + 历史已抵扣）。

| 字段 | 公式 |
|------|------|
| **结算/抵扣金额**（⑤） | 若 `remaining − (②−④) > 0` → ⑤ = **②−④**；否则 ⑤ = **remaining** |
| **剩余未抵扣预付分成款**（函内） | **remaining − ⑤** |

**与「实际付款金额」区别**：⑤ 两行按结算函 **②−④** 与预付池计算；游戏付款底部「实际付款金额」按 **待付款金额** + 【标记付款】三种情况（或快照）展示。

**GP002 样例**：②−④=137,400；remaining=320,000 → ⑤=137,400；函内剩余=182,600；标记付款实付=0（待付 88,200 < remaining）。

#### D. 游戏收入管理 — 预付列币种

| 项 | 规则 |
|----|------|
| 列 | **预付分成款**、**已抵扣分成款**、**剩余未抵扣分成款** |
| 币种 | 归属厂商 **`Vendor.currency`**（与【付款设置】预付区块 `CurrencyInput` 同源） |
| 其他列 | 账户余额/累计收入等结算口径列仍固定 **￥** |

#### E. 【付款设置】抽屉 — 只读预付币种展示

| 项 | 规则 |
|----|------|
| 组件 | `ReadonlyCurrencyField`（`FormFields.tsx`） |
| 字段 | **已抵扣分成款**、**剩余未抵扣分成款** |
| 样式 | 与 `CurrencyInput` 同前缀灰底 **￥** / **$**；预付未填显示 `-`（无前缀） |
| 页面 | `GameIncomePage`、`VendorIncomePage` |

#### F. 改动文件（2026-07-17 本轮）

**页面/组件**：`SettlementLetterDrawer.tsx`、`GamePaymentListPage.tsx`、`PaymentListPage.tsx`、`GameIncomePage.tsx`、`VendorIncomePage.tsx`、`FormFields.tsx`

**数据/工具**：`data/types.ts`（`SettlementLetterSnapshot`、`letterSnapshot?`）、`data/mock-data.ts`（`enrichPaidLetterSnapshots`）、`utils/settlementLetterSnapshot.ts`

**文档**：`ui-spec.md`、`conversation-memory.md`

---

### 48. 本次对话汇总（2026-07-20 — 支付币种快照冻结）

#### A. 问题

编辑厂商「支付币种」时，历史合同已付金额、预付分成等若仍读 `Vendor.currency`，符号会随厂商改币种而变，不符合「已入库数据不应被改」。

#### B. 数据模型

| 字段 | 实体 | 写入时机 | 更新规则 |
|------|------|----------|----------|
| `currency` | `Contract` | 合同**首次保存** | 仅当为空时写入当时 `Vendor.currency` |
| `prepaymentCurrency` | `Vendor` / `Game` | 【付款设置】**首次保存**预付 | 仅当为空时写入当时 `Vendor.currency` |

#### C. 展示与计算

- 游戏管理三项已付、收入汇总「支付金额」、合同抽屉前缀 → `resolveContractCurrency(contract, vendor)`
- 厂商/游戏收入预付三列、【付款设置】抽屉 → `resolvePrepaymentCurrency(entity, vendor)`
- 游戏【标记付款】五分支 `vendorCurrency` → `Game.prepaymentCurrency ?? Vendor.currency`
- `updateVendor` **不 cascade** 更新 contracts / prepaymentCurrency

#### D. 工具与文件

`utils/currencySnapshot.ts`；`data/types.ts`、`mock-data.ts`（backfill）；`GameListPage`、`RevenueSummaryPage`、`GameIncomePage`、`VendorIncomePage`、`gamePaymentMarkDefaults.ts`

#### E. 验收

> **已被 §49 取代**：支付币种现仅在合同管理维护，不再从厂商读取。

编辑厂商支付币种场景**已移除**；历史数据通过 `Contract.currency` / `prepaymentCurrency` 快照冻结。

---

### 49. 本次对话汇总（2026-07-20 — 支付币种迁至合同管理）

#### A. 需求

- **移除**【厂商管理】「支付币种」字段（`Vendor.currency` 删除）
- **新增**【游戏管理 → 合同管理】「支付币种」单选（人民币 / 美金），位于合同编号与合同金额之间，保存必填
- **各模块**金额前缀与列表展示改读 `Contract.currency`
- **未设置**支付币种时，`CurrencyInput` 前缀为空（不显示 ￥/$）

#### B. 实现要点

| 区域 | 变更 |
|------|------|
| `VendorForm` | 移除支付币种；`VENDOR_REQUIRED` 改为 **7 项** |
| `GameListPage` 合同抽屉 | 新增支付币种 radio；校验必填；金额输入前缀随选中币种 |
| `currencySnapshot.ts` | `resolveContractCurrency(contract)`；预付读 `prepaymentCurrency ?? contract.currency` |
| `FormFields` | `CurrencyInput` / `ReadonlyCurrencyField` 支持 `currency?`；undefined 无前缀 |
| `mock-data` | 合同带 `currency`；厂商 1003 下游戏为美金；backfill `prepaymentCurrency` |

#### C. 验收

1. 厂商添加/编辑表单**无**支付币种
2. 合同管理有支付币种，保存后列表已付列与抽屉金额带 ￥/$
3. 未选币种时合同金额等输入框**无前缀**
4. 收入汇总/游戏收入/标记付款等读合同币种（预付仍用 `prepaymentCurrency` 快照）

---

### 50. 本次对话汇总（2026-07-20 — 操作记录金额格式化）

#### A. 需求

游戏管理【操作记录】中**合同变更**日志的金额值需显示**币种符号 + 千分位**（如 `￥9,894.00`），不再显示裸数字 `9894.00`。

#### B. 实现

- `utils/contractLog.ts` → `buildContractChangeDetail`：写入日志时对合同金额与三项已付调用 `formatOptionalCurrencyMoney(value, newC.currency)`
- 变更检测仍用裸数值比较（`formatContractAmountDisplay` / `formatPaidDisplay`）；仅展示文案格式化
- mock `GL005` 更新为 `"已付游戏代理金"变更为"￥546.00"`

#### C. 验收

保存合同后打开操作记录，新「合同变更」行金额应为 `￥x,xxx.xx` 或 `$x,xxx.xx`（随 `Contract.currency`）。

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
│   ├── DataTable.tsx, Pagination.tsx, ListSearchFields.tsx   # leadingRow/trailingRow、CurrencyAmount、COL_ALIGN_RIGHT
│   ├── FormFields.tsx, VendorForm.tsx, Modal.tsx   # CurrencyInput、PercentInput
│   ├── FilterBar.tsx, ColumnFilter.tsx, ColumnSort.tsx, StatusBadge.tsx
│   ├── MonthRangePicker.tsx, VendorIncomeFieldHelp.tsx, GameIncomeFieldHelp.tsx, MockFileUpload.tsx
│   ├── BusinessTypeSelect.tsx
│   ├── SupportChannelsDrawer.tsx
│   └── AdminLayout.tsx, Sidebar.tsx, SettlementLetterDrawer.tsx
├── data/types.ts, mock-data.ts, store.tsx   # sharePayment*、ExchangeRateRecord、exchangeRates、scoped* 按业务分桶
├── utils/... listExport.ts、columnFilters.ts（GAME_PAYER_OPTIONS、SHARE_PAYMENT_COMPANY_OPTIONS）、prepayment.ts、gamePaymentApply.ts、gamePaymentMarkDefaults.ts、exchangeRate.ts、settlementLetter.ts、...
└── pages/
    ├── GameListPage.tsx      # CRUD、合同、支持渠道、查询总计(trailingRow)、导出、表单/合同校验
    ├── VendorListPage.tsx    # VendorForm（支付币种）
    ├── FormulaListPage.tsx, PaymentListPage.tsx, GamePaymentListPage.tsx  # 标记付款；游戏只读分成付款公司
    ├── InternalSettlementPage.tsx, ExternalSettlementPage.tsx
    ├── GameIncomePage.tsx, VendorIncomePage.tsx  # 付款设置；预付币种 Contract.currency / prepaymentCurrency
    └── RevenueSummaryPage.tsx

src/resources/agent-game-finance/
├── ui-spec.md                # UI/交互规范（改样式必读）
└── conversation-memory.md    # 本文件（上下文/决策/进度）
```

---

## 数据与 ID 规则

- 厂商 ID：**4399** 从 **1001** 起、**快爆** 从 **2001** 起；游戏 ID：**4399** 从 **4001** 起、**快爆** 从 **5001** 起（`store.tsx` + `utils/businessScope.ts`）。
- Mock 结算样例 **S001–S027**（4399）+ **S301–S307**（快爆）；收入时间 **2026-06 / 2026-07**。
- **默认渠道费**（样例公式）：外部 **0%**、内部 **5%**（`makeFormula`）。
- 数据统计与结算三页默认时间范围与 mock 一致，打开即可见样例。
- **未结算样例**：初始 mock **无**未结算记录（已移除 S008）；内部未结算仅通过【数据拉取】产生。
- **厂商收入 mock**：见 §38；1004/1006/1008 可申请；1005 预付拦截；1001/1007 未付款/银行拦截。
- **快爆 mock**：2001–2003 厂商、5001–5004 游戏；P301/P302、GP301 付款样例。

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
| **本地** | 2026-07-20 Batch 7 批注、收入汇总导出、申请付款置顶、标记付款去提交等改动**尚未推送**（本环境未检测到 git CLI；用户说「推送到 git」时再 commit/push） |

---

### 51. 本次对话汇总（2026-07-22 — 标记付款三种自动填充 + 实付/结算函对齐）

#### A. 【标记付款】由五种情况改为三种

| 情况 | 条件 | 实际付款金额 | 实际付款美金 |
|:----:|------|-------------|-------------|
| 1 | 预付 ≤ 0 | = 待付 | 付款美金时 = 待付÷汇率 |
| 2 | 预付 > 0，合同人民币 | = net | = net ÷ 汇率（**始终填**） |
| 3 | 预付 > 0，合同美金 | = usdNet × 汇率 | = usdNet |

合同支付币种 = `prepaymentCurrency ?? Contract.currency`（`resolveMarkPaymentContractCurrency`）。

#### B. 结算函（游戏付款）

- 实付单行展示不变（付款人民币→￥，付款美金→$）
- **游戏结算函「实际付款金额」**：在**【申请付款】**时按三种情况算出并写入 `letterSnapshot.letterPayAmount`；**标记已付款后不更新**
- 【标记付款】表单初始填充仍用 `resolveGameMarkPaymentDefaults`（每次打开重算）；与结算函展示解耦
- 表格明细金额符号统一 ￥；⑤/剩余行按**支付币种**快照展示

#### C. 改动文件

`gamePaymentMarkDefaults.ts`、`currencySnapshot.ts`、`settlementLetterSnapshot.ts`、`SettlementLetterDrawer.tsx`、`mock-data.ts`、`mark-drawer.md`、`ui-spec.md`、`conversation-memory.md`

---

### 52. 本次对话汇总（2026-07-22 — 结算函⑤按支付币种分支）

#### A. 「结算/抵扣金额」与「剩余未抵扣预付分成款」

`remaining` = 本笔付款**前**剩余未抵扣（已付款打开/重建快照时 `excludePaymentId` 排除本笔）。

设 `net = ②−④`。分支按**支付币种**（【申请付款】时刻快照，写入 `letterSnapshot.contractPaymentCurrency`）。

| 支付币种 | 比较 | ⑤（抵扣） | 函内剩余 |
|----------|------|----------|---------|
| 人民币 | `net − remaining` | ≥0 → remaining；否则 net | remaining − ⑤ |
| 美金 | `net÷汇率 − remaining` | ≥0 → remaining；否则 net÷汇率 | remaining − ⑤ |

⑤ 与剩余行展示币种同**支付币种**；汇率行与实付仍按**付款币种**。

**汇率行显示**：付款币种=美金；或（支付币种快照=美金 且 申请付款时剩余>0）。

#### B. 改动文件

`utils/settlementLetter.ts`、`settlementLetterSnapshot.ts`、`SettlementLetterDrawer.tsx`、`data/types.ts`（`contractPaymentCurrency`）、`letter-drawer.md`、`ui-spec.md`

#### C. Mock 验收（汇率 7.21）

| 记录 | 支付币种 | 付款币种 | ⑤ | 函内剩余 |
|------|---------|---------|---|---------|
| P001 | 美金 | 人民币 | ≈51,012.48（$） | ≈818,987.52（$） |
| GP001 | 美金 | 美金 | ≈28,085.99（$） | ≈326,914.01（$） | 待付 202,500；实付 $0（情况3） |

---

### 53. 本次对话汇总（2026-07-22 — 游戏申请付款快照）

#### A. 【申请付款】成功逻辑

确认后冻结 `GamePaymentApplySnapshot` + `letterSnapshot`；写入 `gamePayments` 首行；结算明细改「已申请」；余额清零。

| 冻结项 | 内容 |
|--------|------|
| 游戏 | ID、名称、**支付币种**（申请时刻快照） |
| 厂商 | ID、名称、银行收款信息 |
| 预付 | 预付分成款、剩余未抵扣 |
| 付费设置 | 付款币种、分成付款公司、付款账号 |

后续源数据变更不影响本笔；结算函/标记付款读快照；标记已付款**不**更新结算函。

#### B. 改动文件

`gamePaymentApplySnapshot.ts`、`types.ts`、`store.tsx`、`GamePaymentListPage.tsx`、`gamePaymentMarkDefaults.ts`、`mock-data.ts`、批注与 `ui-spec.md`

---

### 54. 本次对话汇总（2026-07-22 — 规范文档与批注对齐）

#### A. 支付币种怎么取

结算函批注「支付币种怎么取」：**【申请付款】那一刻的快照值**（`letterSnapshot.contractPaymentCurrency` / `applySnapshot.contractPaymentCurrency`）。

运行时取值：`resolveMarkPaymentContractCurrency`（`prepaymentCurrency ?? Contract.currency`），但**仅在申请瞬间**写入快照；合同/预付后续变更不回写已申请记录。

#### B. 结算函 vs 【标记付款】职责分离

| 场景 | 结算函 | 付款记录/列表 |
|------|--------|---------------|
| 申请付款后 | 全部字段冻结 | 待付=申请时余额 |
| 标记已付款 | **不变** | 实付/实付美金=表单填写值 |

#### C. 批注与 UI 文案

- `letter-drawer.md`、`apply-payment-action.md`：自然业务语言；去掉 `remaining`/`net` 等代码变量名
- 结算函「付款方开票信息」标签**不含**「（增值税专用发票）」后缀

#### D. 验收样例（汇率 7.21）

| 记录 | 支付币种 | 付款币种 | 待付 | 结算函实付 | ⑤ | 函内剩余 |
|------|---------|---------|------|-----------|---|---------|
| P001 | 美金 | 人民币 | — | 0 | ≈$51,012.48 | ≈$818,987.52 |
| GP001 | 美金 | 美金 | 202,500 | **$0** | ≈$28,085.99 | ≈$326,914.01 |

---

## 给下一轮 AI 的提示

1. 改 UI 前先读 `ui-spec.md`，避免抽屉宽度、标签列、按钮色不一致。  
2. 列表查询遵循「有列才出框、多框 AND」。  
3. 状态枚举勿恢复旧值（停运、已终止等）。  
4. 合同保存要同步合作状态 + 写操作日志。  
5. 表单提交必须走校验：字段红字 + Toast，失败不关闭抽屉。  
6. DualCell / 表头用 `ID / 名称` 格式，斜杠前后有空格；表头加粗。  
7. 厂商表单必填 **8 项**：厂商名称、**支持币种**、发票信息、银行 5 项；**联系人/手机/邮箱/单位地址选填**。  
8. 用户说「推送到 git」时再 commit/push，不要主动提交。  
9. 产品需求或设计方案有重大分歧时，按 `AGENTS.md` 门禁先对齐再继续实现。  
10. 重要对话结束前按用户要求更新本文件与 `ui-spec.md`。  
11. **改批注**先读 `docs/annotations/` + `buildAnnotationSource.ts`；改气泡宽度用 `annotationPanelWidth.ts`（勿只靠 `style.css`）。  
12. **游戏申请付款**看 `store.applyGamePayment`（首行插入未付款）；**收入汇总导出**在 `RevenueSummaryPage.tsx`。  
13. 数据统计无页内 Tab；时间用顶部 `MonthRangePicker`，默认 `getSampleMonthRange()`。  
14. 收入汇总「总收入」= 结算收入 − 结算退款（内部计算，列表不展示后两列）；列表新增「结算付款金额」；勿与已删三收入统计页 grossRevenue 口径混用。  
15. 数据统计已移除「累计流水」列；渠道收入统计含「总收入」。
16. 结算公式扣税点：跟随发票按厂商发票映射；表单标签「扣税点」；`PercentAffixInput`/`DecimalPercentInput`；勿恢复底部独立「发票设置」或旧「税点」输入框。  
17. **游戏名称**：「游戏ID / 游戏名称」一律 `onlineName`（`getGameName`）；「合同游戏名称」才用 `name`。  
18. 游戏添加/编辑：先「游戏名称」后「合同游戏名称」，带 `FieldHint`；编辑时归属厂商只读。  
19. 结算公式列表：新游戏同步空公式、未配置 `-`、公式列内外两行。  
20. **支持渠道**：入口在**游戏管理**操作列；抽屉**仅内部渠道**（勾选+填 ID，勾选后必填）；组件 `SupportChannelsDrawer.tsx`；结算公式管理**无**【支持渠道】。  
21. 结算三页列表无「总收入」；列为「待结算金额」；申请付款状态「未申请/已申请」。  
22. 列表/抽屉/弹窗表格：`--agf-gutter 24px` + `agf-table-wrap` 灰色实线外框；分页在边框外。
23. 外部导入：渠道单选；上传字段**收入时间/游戏名称/厂商名称/待结算金额**；按游戏名+厂商名匹配；**无**勾选游戏拦截；预览列表含厂商名称列。  
24. 结算三页/导入列表「结算公式」列：用 `displaySettlementFormula`，不显示「外部：/内部：」前缀。
25. Toast 仅 `success`（绿）/ `error`（红）；主按钮禁用 `#F5F5F5` 底 `#BFBFBF` 字。
26. 样例渠道费：外部 0%、内部 5%。
27. 结算公式列表展示：`待结算金额*（1-渠道费-税率）*分成`；`displaySettlementFormula` 去前缀。
28. **内部/退款**主列表有【结算】；**外部**主列表无【结算】；结算时间无漏斗；内部未结算时收入/时间 `-`。
27. 结算三页查询 `gameAndVendor`；列含厂商ID、厂商名称（分两列，在游戏列右侧）。
28. 外部确认导入写**已结算**记录；结算时间=确认导入时间；弹窗内【结算】必需；分页下方留白 16+24px。
29. **外部收入结算主列表禁止未结算数据**；初始 mock 均为已结算；内部未结算仅来自【数据拉取】，勿再加静态未结算 mock。
30. **内部/退款结算**：两页独立；按钮状态 `internalSettlementButtons[businessType]`；**切换业务/页面不重置、浏览器刷新重置**；拉取上月数据；结算仅本页主列表未结算行。
31. **厂商收入**：账户总收入=累计收入−累计退款；账户余额=未申请结算收入−未申请退款（**不扣**预付）；预付在「预付分成管理」维护；字段说明见面包屑 **?** Modal。
32. **结算三页时间默认**：`getRecentTwoMonthsRange()` = 上个月 + 当前月。
33. **支持渠道**：见第 18 条；外部渠道清单含**游乐外放**；内部**无 H5游戏**。  
34. **FieldHint 在上、FieldError 在下**；PercentInput 同理。
35. **DataTable 无数据也显示分页**（共 0 条）。
36. **结算 mock 月份**：初始数据 **2026-06/07**；与结算三页、收入汇总默认时间一致。
37. **厂商收入申请付款**：余额 > 0 才显示按钮；校验银行→**厂商**预付（未填）→未付款；操作列始终有【预付分成管理】。  
38. **厂商收入样式**：余额列黑色；操作列【申请付款】主题蓝链接。  
39. **外部结算完成态**：`externalSettlementButtons.settleCompleted` 仍用于外部导入流程，**不再**参与申请付款警告。  
40. **vendorPaymentApply.ts**：申请付款拦截逻辑集中在此工具。  
41. **厂商付款管理操作列**：未付款=标记付款+结算函+请款凭证；已付款=详细信息+结算函+请款凭证。  
42. **付款状态**：未付款/已付款（非「待付款」）；`isUnpaidPayment` 兼容历史数据。  
43. **标记付款**：**待付款金额只读** + **实际付款金额可编辑**（两位小数）；收款信息必填；不含结算函/电子发票；**游戏付款**仅「取消 + 标记已付款」（无提交）；**厂商隐藏页**仍三按钮；标记已付款关闭抽屉 + Toast「提交成功」；收款信息可编辑。  
44. **请款凭证**：结算函、电子发票 `MockFileUpload`；标签「结算函」；**已上传文件可删除**。  
45. **详细信息**：仅已付款；含付款状态；**不含**申请时间/付款时间（仅列表列）；仅备注可编辑。  
46. **MockFileUpload**：选择文件+列表+点击下载+**× 删除**；无虚线分隔；用于请款凭证。  
47. **列表空状态**：`DataTable` 无数据时表头保留、表体居中空盒插画+「暂无数据」、分页仍显示共 0 条。  
48. **结算函 1175px**：**总计②-④**、**实际付款金额** 始终显示；**汇率** = 付款美金 或（支付美金快照且申请时剩余>0）；申请快照剩余>0 才显示结算/抵扣与剩余行。  
49. **结算函汇率**：`ExchangeRateRecord`；按付款 `applyTime` 取上月 rate；剩余/支付币种取申请快照。  
50. **结算函实际付款金额（游戏）**：**申请付款时**按三种情况算出并冻结；人民币=`letterPayAmount`(￥)、美金=`letterPayAmount`($)；标记已付款**不**更新。  
51. **结算函行标签**：「结算/抵扣金额」（原⑤）、「剩余未抵扣预付分成款」、「实际付款金额」。  
52. **结算函⑤**：按**支付币种**（申请快照）分支；汇率/实付仍看**付款币种**；见 §52。  
53. **updatePayment / settlementIds**：付款记录部分更新；申请付款时绑定结算 ID 列表。  
54. **平台名称**：侧栏与面包屑用「代理游戏台账」；侧栏分组 **游戏支付管理** / **财务分成管理**（非「游戏管理」「财务管理」）。  
55. **数据统计侧栏**：仅「收入汇总统计」；厂商/渠道/游戏收入统计三页**已删除**。  
56. **内部结算拉取后时间**：保持近两个月，存 `internalSettlementButtons[businessType][type].monthRange`；勿改回拉取后切单月。  
57. **申请付款确认弹窗**：`compact` 样式 `min-width: 420px`。  
58. **业务类型**：列表左上角显示 **游戏盒**/快爆（值 `4399`/快爆）；scoped 过滤；ID 段 100x/400x vs 200x/500x。  
59. **业务类型选择框宽**：`.agf-select.agf-business-type-select` **100px**。  
60. **厂商预付分成款**：`Vendor.prepayment?`；**0 合法**；未填才拦截申请付款；在厂商收入【预付分成管理】维护；合同管理**无**此字段；**已抵扣=已付款待付款金额之和+历史**（预付−合计≤0 取预付）；**剩余=预付−已抵扣**；抽屉只读项取**已保存**值。  
61. **预付分成管理输入**：预付分成款、历史已抵扣分成款**精确至小数点后两位**（如 `800000.00`、`0.00`）。  
62. **prepayment.ts**：厂商/游戏已抵扣/剩余计算、结算函 `calcLetterPrepaymentDeduction` / `calcGameLetterPrepaymentDeduction` 共用；已付款记录汇总 **`pendingAmount`**。  
63. **mockPdf.ts**：结算函【下载】生成可打开 PDF（非纯文本假 PDF）；`SettlementLetterDrawer` 中英文摘要。  
64. **vendorPaymentApply**：未补充预付 = 厂商 `prepayment` 未填（非 0）。  
65. **internalSettlementButtons / externalSettlementButtons**：按 `businessType` 分桶存储。  
66. **游戏管理列表**：付款方筛选；三项已付列可排序；默认按 `createdAt` 新→旧；金额带币种+千分位。  
67. **游戏表单**：**付款方必填**；游戏负责人选填；`Game.createdAt` 添加时写入。  
68. **合同管理**：合同编号/**支付币种**/金额/合作内容/**合作状态**必填；已付*随勾选；`CurrencyInput` 前缀取 `Contract.currency`；未设置币种时前缀为空；补充说明选填。  
69. **合同变更日志**：`action=合同变更`；`detail` 多行；含合同金额+三项已付；格式 `"字段"变更为"值"`；金额带币种符号与千分位。  
70. **合同支付币种**：`Contract.currency`；合同管理单选必填；各模块金额展示与输入前缀均读合同。  
71. **CurrencyInput**：`agf-input-affix__prefix` / `__suffix` 统一灰底 `#f5f7fa`；人民币=￥、美金=$。  
72. **合作内容多选**：`agf-checkbox-group`；至少一项；取消勾选清空对应已付金额。  
73. **只读 meta 斜杠**：抽屉/页内 `游戏ID / 游戏名称` 统一斜杠前后空格（见 §34）。  
74. **主列表金额**：`formatCurrencyMoney` = 符号+千分位；结算三页固定 ￥（`SETTLEMENT_CURRENCY`）。  
75. **收入汇总**：支付金额=合同三项已付之和；列表列=总收入+**结算付款金额**（已移除结算收入/退款列）；结算付款金额=游戏付款 `actualAmount` 按付款月累加。  
76. **ColumnSort**：表头升/降序；用于游戏管理已付三列。  
77. **厂商付款管理**：侧栏/面包屑名称（原「付款管理」）；路由 `payment-list` 不变。  
78. **游戏收入管理**：`game-income`；按游戏聚合，逻辑同厂商收入；`Game.prepayment`；面包屑 **?** + `GameIncomeFieldHelp`。  
79. **游戏付款管理**：`game-payment-list`；按游戏聚合，逻辑同厂商付款管理；`GamePaymentRequest` / `INITIAL_GAME_PAYMENTS`。  
80. **gamePaymentApply.ts**：游戏收入【申请付款】拦截（银行取归属厂商→游戏预付→未付款）。  
81. **字段说明列表**：`.agf-field-help-list` 圆点 `disc`、无序号；厂商/游戏收入 Modal 共用。  
82. **Mock 全量状态**：见 §38；打开结算/统计页默认即可见样例，无需改月份。  
83. **收入页结算金额**：厂商/游戏收入列表结算口径列固定 **￥**；预付未填 `-`。  
84. **付款列表金额**：厂商/游戏付款管理待付/实付 **￥**（非厂商支持币种）。  
85. **实际付款美金**：`actualAmountUsd?`；【标记付款】`CurrencyInput`($) 选填；【详细信息】只读，未填 `-`；mock P001/GP001。  
86. **ColumnFilter Portal**：下拉挂 `body` + `z-index: 10000`，防表格裁切。  
87. **游戏收入管理/游戏付款列表**：游戏列右侧增厂商名称；**游戏收入管理无厂商ID列/搜索**。  
88. **侧栏隐藏**：厂商收入、厂商付款管理不在菜单/ROUTE；页面代码保留。  
89. **游戏付款时间列**：申请时间+付款时间同一列堆叠（`TimeStackCell`）。  
90. **合同金额初始**：未填不显示 `0.00`；`contractAmount?`。  
91. **结算公式扣税点**：标签「扣税点」；`PercentAffixInput`/`DecimalPercentInput` 复合 `%`。  
92. **操作记录时间**：`YYYY-MM-DD HH:mm:ss`；`formatDateTime()`。  
93. **复合输入灰底**：币种前缀与 `%` 后缀均为 `#f5f7fa`。  
94. **隐藏页 ROUTE**：`vendor-income` / `payment-list` 在 `defineHashPageRoute` 注册；**不在** `MENU_GROUPS` 侧栏展示。  
95. **收入汇总查询总计**：列表首行「查询总计」；支付金额按币种分开求和；`DataTable.leadingRow`。  
96. **收入汇总渠道筛选**：查询维度=渠道时，「渠道」列表头 `ColumnFilter`；选项=内部+外部渠道清单；切换维度重置。  
97. **列表金额右对齐**：`COL_ALIGN_RIGHT` / `agf-table__cell--right`；全平台金额列含表头。  
98. **多币种展示**：`CurrencyAmount` + `CurrencyStackCell` + `renderCurrencyTotals`；堆叠时每行独立符号+数字，避免宽列留白。  
99. **收入汇总厂商列序**：厂商ID → 厂商名称 → 支付金额（名称在支付金额前）。  
100. **游戏管理查询总计**：列表**最后一行**「查询总计」；`DataTable.trailingRow`；三项已付按币种求和。  
101. **游戏管理导出**：第一行「厂商名称」右侧【导出】primary；第二行【添加游戏】；CSV `游戏管理-{YYYY-MM-DD}.csv`；`utils/listExport.ts`。
102. **付款设置**：原「预付分成管理」；抽屉两区块「预付分成管理」+「付费设置」；`sharePaymentCompany/Currency/Account`。  
103. **付费设置默认值**：游戏分成付款公司未保存时**为空**；付款币种默认人民币。  
104. **预付未填展示**：列表与抽屉「已抵扣/剩余」为 `-`；历史已抵扣/预付输入未保存时不显示 `0.00`。  
105. **游戏收入列序**：账户余额在账户总收入前。  
106. **标记付款付款方**：厂商付款管理仍为下拉 + 三按钮；**游戏付款管理**只读「分成付款公司」+ **两按钮**（无提交）；不在标记付款拦截未配置。  
107. **游戏表单必填**：添加/编辑含版号、运营状态；合同管理含合作状态。  
108. **厂商表单**：必填 **7 项**（无支付币种）；联系人/手机/邮箱/地址选填。  
109. **分成付款公司选项**：`SHARE_PAYMENT_COMPANY_OPTIONS` = 4399 / 纯游 / 纯游（美元） / 香港4399 / 游家时代；与游戏管理「付款方」六项独立。  
110. **游戏标记付款初始填充**：`gamePaymentMarkDefaults.ts`；三种情况；见 §51；实付 ≥ 0。  
111. **汇率表 mock**：`INITIAL_EXCHANGE_RATES`（2026-04~06）；申请 2026-07 取 2026-06 汇率 **7.21**。  
112. **游戏付款 mock 验收**：GP011–GP015 + GP002；详见 §51。  
113. **结算函快照**：游戏【申请付款】写入 `letterSnapshot`；只读与付款状态无关；标记已付款**不**更新结算函（含实付）。  
114. **结算函⑤两行**：按**支付币种**（申请快照）分支；申请快照剩余>0 才显示；见 §52。  
115. **游戏收入预付列币种**：列表预付/已抵扣/剩余取 `prepaymentCurrency` 快照（§48）。  
116. **ReadonlyCurrencyField**：【付款设置】已抵扣/剩余只读；前缀同 `CurrencyInput`。  
117. **支付币种**：合同管理维护 `Contract.currency`；预付首次保存写 `prepaymentCurrency`；**结算函/⑤ 取申请快照**；`utils/currencySnapshot.ts`。  
118. **操作记录金额**：合同变更日志金额 `formatOptionalCurrencyMoney`；见 §50。  
119. **批注系统**：`@axhub/annotation`；正文在 `docs/annotations/`；`buildAnnotationSource.ts` 合并 markdown；侧栏隐藏页未批注。  
120. **批注体验**：序号默认开；气泡宽 560px 需 Shadow DOM 注入（`annotationPanelWidth.ts`）。  
121. **收入汇总导出**：inline 在厂商名称右侧；`收入汇总统计-{维度}-{日期}.csv`；不含查询总计行。  
122. **游戏申请付款成功**：`applyGamePayment` 写入 `gamePayments` **首行**；Toast「申请付款成功，账户余额已清零」。  
123. **请款凭证格式说明**：`MockFileUpload.hint` — png、jpg、pdf。
