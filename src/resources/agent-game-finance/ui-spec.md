# 代理游戏财务平台 — UI 规范

> 原型路径：`src/prototypes/agent-game-finance/`  
> 预览：`/prototypes/agent-game-finance`  
> 最后更新：2026-07-10（结算三页、公式格式、分页留白、厂商列）

本文档汇总「代理游戏财务」原型的 UI/交互规范，供后续对话、改页、加功能时统一引用。

---

## 1. 色彩

| 用途 | 值 | CSS 变量 |
|------|-----|----------|
| 主题主色 | `#4165d7` | `--color-primary` |
| 主色悬停 | `#5474db` | `--color-primary-hover` |
| 正文 | `#333333` | `--color-text` |
| 次要文字 | `#666666` | `--color-text-secondary` |
| 弱化文字 | `#999999` | `--color-text-muted` |
| 边框 | `#E8E8E8` | `--color-border` |
| 表头背景 | `#FAFAFA` | `--color-table-head` |
| 页面背景 | `#F0F2F5` | `--color-page-bg` |

**状态标签（StatusBadge）**

| 状态 | 样式 |
|------|------|
| 已上线、合作中、已申请、已付款 | success 绿 |
| 待付款、未申请 | warning 橙 |
| 合作终止 | danger 红 |
| 未上线 | muted 灰 |

---

## 2. 按钮

### 列表上方主按钮（Primary）

- 背景/边框：`#4165d7`，悬停 `#5474db`
- 文字：白色，14px
- 高度：32px，圆角 4px，padding `0 15px`
- class：`agf-btn agf-btn--primary`

### 次要按钮

- 白底 + 灰边框，悬停边框/文字变主色
- class：`agf-btn agf-btn--default`

### 表格内链接操作

- 无背景，主色文字
- class：`agf-btn agf-btn--link`

### 主按钮禁用态（`:disabled`）

| 项 | 值 |
|----|-----|
| 背景 | `#F5F5F5` |
| 边框 | `#E8E8E8` |
| 文字 | `#BFBFBF` |
| 鼠标 | `not-allowed` |
| 适用 | `agf-btn--primary`、`agf-btn--default` |

---

## 3. 列表查询栏

### 三栏独立查询（ListSearchFields）

按列表实际字段显示，多框为 **且** 关系：

| 输入框 placeholder | 匹配规则 |
|-------------------|----------|
| 游戏ID / 游戏名称 | 游戏 ID 或**游戏名称**（`onlineName`，上线后正式名称） |
| 合同游戏名称 | 仅**合同游戏名称**（合同内定义名）；仅游戏管理开启 |
| 厂商ID | 仅厂商 ID |
| 厂商名称 | 仅厂商名称 |

**各页模式**

| 模式 | 页面 |
|------|------|
| `gameAndVendor` + `showContractName` | **游戏管理** |
| `gameAndVendor` | 结算公式、**收入汇总统计**、**外部/内部/退款结算** |
| `vendor` | 厂商管理、付款管理、厂商收入、**厂商收入统计** |
| `game` | **游戏收入统计** |
| — | **渠道收入统计**：仅时间范围，无文字查询 |

**结算页时间查询**：外部收入结算、内部收入结算、内部退款结算顶部查询栏使用 `MonthRangePicker`（与收入汇总统计相同）；默认 `getSampleMonthRange()` → `2025-05 - 2025-06`；表头「收入时间 / 退款时间」列仅展示，不用 `ColumnFilter`。

组件：`components/ListSearchFields.tsx`  
逻辑：`utils/listKeyword.ts` → `matchesListSearch`

### 月份范围查询（MonthRangePicker）

用于**数据统计**各页顶部时间筛选；最小维度为**月**。

| 项 | 规范 |
|----|------|
| 组件 | `components/MonthRangePicker.tsx` |
| 工具 | `utils/monthRange.ts`（`getSampleMonthRange`、`getDefaultMonthRange`、`isMonthInRange`） |
| 展示格式 | `YYYY-MM - YYYY-MM`（如 `2025-05 - 2025-06`） |
| 输入框 | 左侧日历图标；`min-width: 228px`；高度 32px；padding `0 12px` |
| 展开态边框 | `border: 1px solid #4165d7`（class `agf-month-range__input--open`） |
| 下拉面板 | 双年并排；年间 `1px #e4e7ed` 竖线；选中月份蓝底圆点 + 区间浅蓝 `#eef2fc` |
| 未来月份 | 置灰不可选 |
| 默认范围（数据统计） | `getSampleMonthRange()` → `2025-05 - 2025-06`（对齐 mock） |
| 默认范围（结算三页） | 同上：外部/内部/退款结算 |
| 表头「时间」列 | **仅展示**，不用 `ColumnFilter` 筛选 |

交互：第一次点选起始月，第二次点选结束月后关闭并生效；同月则起止相同。

---

## 4. 表格

### 列表区布局

| 项 | 规范 |
|----|------|
| 左右留白 | `.agf-card` 设 `--agf-gutter: 24px`；查询栏（`agf-list-toolbar`）、表格区、分页左对齐 |
| 结构 | `agf-table-panel`（外边距）→ `agf-table-wrap`（边框容器）→ `agf-table` |
| 外边框 | `agf-table-wrap`：`border: 1px solid #E8E8E8`（`--color-border`）、`border-radius: 4px`、白底 |
| 分页位置 | 在表格外框**下方**，无上边框；`.agf-pagination` 底内边距 `16px`；`.agf-table-panel` 底外边距 `24px` |
| 末行 | `tbody tr:last-child td` 无底边框，避免与外框双线 |

**抽屉 / 弹窗内列表**：同样用 `agf-table-wrap` 包裹 `agf-table`（操作记录、导入预览等）；无 `agf-table-panel` 外边距（抽屉 body 自有 padding）。弹窗内表格与上方内容间距可用 `agf-table-wrap--spaced`（`margin-top: 16px`）。

组件：`components/DataTable.tsx`（主列表）；样式：`style.css`

### 列布局约定

- 表头字段：**加粗**（`font-weight: 700`）
- 游戏 ID + 名称：可用 `DualCell`，单行展示为 `ID / 名称`（如 `4001 / 星际探险OL`）；名称取 `onlineName`（游戏管理「游戏名称」字段）；表头文案斜杠前后加空格（如 `游戏ID / 游戏名称`）
- 厂商 ID、厂商名称：**分两列**，不合并
- 枚举列：表头带漏斗筛选（`ColumnFilter` + `utils/columnFilters.ts`）
- **列头筛选下拉**：选项文字 `font-weight: 400`，不继承表头 `700` 加粗（`.agf-col-filter__menu` / `__item`）

### 分页（Pagination + DataTable）

**所有使用 DataTable 的列表均启用分页。**

| 项 | 规范 |
|----|------|
| 默认每页 | 20 条 |
| 可选 | 10 / 20 / 30 / 50 / 100 / 200 |
| 布局 | 整体居中：「共 X 条」+ 条数下拉 + 页码导航 |
| 筛选后 | 自动回到第 1 页 |

**当前页按钮（选中态）**

- 背景：`#eef2fc`（浅蓝，非实心主色）
- 边框/文字：`#4165d7`
- 字重：500

**页码规则**

- 总页 ≤7：全部显示
- 否则：1…6…末页 或 1…当前±1…末页

组件：`components/Pagination.tsx`，内置于 `components/DataTable.tsx`

---

## 5. 抽屉（Drawer）

### 宽度

| 类型 | 宽度 | 场景 |
|------|------|------|
| 标准抽屉 | **730px** | 添加/编辑游戏、合同管理、结算公式、标记付款等（默认或 `large`） |
| 宽抽屉 | **1175px** | 厂商管理添加/编辑（`width={1175}`） |

### 730px 抽屉 — 横向表单

```
[标签 168px 右对齐]：[控件区 flex:1]
```

| 规则 | 说明 |
|------|------|
| 标签宽度 | 168px，`text-align: right` |
| 标签后缀 | CSS 自动追加 `：`（`::after`） |
| 标签 | `white-space: nowrap`，14px，`#333` |
| 控件/只读值 | 14px，`#333` |
| 表单项间距 | 20px |

### 只读字段（ReadonlyField）

- **纯文本**，无输入框边框/背景
- 参考：编辑广告位抽屉中的不可编辑行
- 组件：`components/FormFields.tsx` → `ReadonlyField`

### 抽屉内信息行（非表单布局）

- 用于操作记录等「表格上方说明当前对象」的场景
- class：`agf-drawer-meta`
- 左对齐与下方表格首列文字齐平（`padding-left: 16px`，匹配 `th/td` 水平 padding）
- **不要**使用 168px 右对齐 `ReadonlyField` 表单布局

### 单选字段（Radio）

- 16px 圆形，选中：蓝色描边 + 蓝色实心圆点
- 未选中：灰色描边空心
- 选项横向排列，间距 24px，与标签垂直居中
- class：`agf-radio-group` / `agf-radio-item`

### 字段说明（FieldHint）

- 用于必填/重要输入框下方补充释义（如游戏添加/编辑的两个名称字段）
- 组件：`FormFields.tsx` → `FieldHint`；class：`agf-form-hint`
- 样式：12px，`--color-text-muted`，距输入框上缘 6px；位于 `FieldError` 下方
- 游戏名称：「游戏上线后所使用的正式名称」
- 合同游戏名称：「签约合同所使用的游戏名称」

### 多行文本（备注等）

- 聚焦边框：主题蓝 `#4165d7`，无浏览器默认 outline
- class：`agf-form-textarea`

### 必填与提交校验

- 标签前红色 `*`
- class：`agf-form-label--required`（宽表格用 `agf-form-grid__label--required`）
- **提交校验**：任一必填未填时
  1. 字段下方小号红字：`{字段名}不能为空`（`agf-form-error` / `agf-form-grid__error`，12px，`#F56C6C`）
  2. 顶部红色 Toast：`请完善所有信息`，显示 **3 秒**后隐藏（`Toast type="error"`）
  3. 不关闭抽屉、不提交
  4. 用户修改该字段时清除对应错误（`clearError`）

### Toast（`Modal.tsx` → `Toast`）

**全站统一**：成功用绿色、失败用红色；**不再使用**深色默认 Toast。`type` 必填：`ToastType = 'error' | 'success'`。

| 类型 | 场景 | 样式 |
|------|------|------|
| `success` | 结算成功、导入成功、拉取成功、标记付款等 | 浅绿底 `#F0F9EB`、绿字 `#67C23A`、边框 `#E1F3D8`、左侧绿勾图标 |
| `error` | 校验失败、无数据、余额不足等 | 浅红底 `#FEF0F0`、红字 `#F56C6C`、边框 `#FDE2E2`、左侧红叉图标 |

| 项 | 值 |
|----|-----|
| 时长 | 3000ms |
| class | `agf-toast` + `agf-toast--success` / `agf-toast--error` |

表单校验失败仍用 `type="error"`，文案「请完善所有信息」。

---

## 6. 业务枚举

| 字段 | 可选值 |
|------|--------|
| 运营状态 | 已上线 / 未上线 |
| 合作状态 | 合作中 / 合作终止 |
| 版号 | 有 / 无 |
| 申请付款状态（结算三页） | 未申请 / 已申请 |

### 结算公式列展示（结算三页 + 导入弹窗）

- 工具：`utils/settlement.ts` → `displaySettlementFormula(text)`、`formatFormulaText`
- **去掉前缀**：`外部：`、`外部渠道：`、`内部：`、`内部渠道：`、`退款：`
- **表达式格式**：`待结算金额*（1-{渠道费}-{税率}）*{分成}`
- 展示示例：`待结算金额*（1-0%-0%）*45%`
- **结算公式管理列表**仍保留「内部渠道：/外部渠道：」两行完整文案（不在此去前缀规则内）
- 未结算展示：`formatSettlementIncome` / `formatSettlementTime` → `-`

### 样例默认渠道费

| 渠道类型 | 渠道费 |
|----------|--------|
| 外部渠道 | **0%** |
| 内部渠道 | **5%** |

来源：`mock-data.ts` → `makeFormula`；样例结算 S001–S021 金额已对齐。

### 游戏名称字段约定

| 界面标签 | 数据字段 | 含义 | 示例（4001） |
|----------|---------|------|-------------|
| 游戏名称 | `onlineName` | 上线后正式名称 | 星际探险OL |
| 合同游戏名称 | `name` | 签约合同用名 | 星际探险 |

| 展示场景 | 取值 |
|----------|------|
| 「游戏ID / 游戏名称」列、抽屉只读、`agf-drawer-meta`、搜索「游戏ID / 游戏名称」 | `onlineName`（`store.getGameName(id)`） |
| 「合同游戏名称」列、搜索「合同游戏名称」 | `name` |

---

## 7. 页面字段清单

### 游戏管理 — 列表

| 列 | 说明 |
|----|------|
| 游戏ID / 游戏名称 | `DualCell`：游戏上线后的**正式名称**（`onlineName`） |
| 合同游戏名称 | 游戏未上线时合同内定义的名称（`name`） |
| 厂商ID、厂商名称、游戏负责人、版号、运营状态、合作状态、操作 | |

**查询栏**：游戏ID / 游戏名称、**合同游戏名称**、厂商ID、厂商名称（多框 AND）

### 游戏管理 — 添加游戏

1. **游戏名称** * — 绑定 `onlineName`；下方 `FieldHint`：「游戏上线后所使用的正式名称」  
2. **合同游戏名称** * — 绑定 `name`；下方 `FieldHint`：「签约合同所使用的游戏名称」  
3. 游戏负责人 *  
4. 归属厂商 *（下拉选择）  
5. 版号（单选）  
6. 运营状态（单选，默认未上线）  
7. 备注（末尾）

### 游戏管理 — 编辑游戏

1. 游戏ID（只读）  
2. **游戏名称** * — `onlineName` + `FieldHint`（同上）  
3. **合同游戏名称** * — `name` + `FieldHint`（同上）  
4. 游戏负责人 *  
5. 归属厂商（只读，`厂商ID / 厂商名称`；保存时 `vendorId` 不变）  
6. 版号（单选）  
7. 运营状态（单选）  
8. 备注（末尾）

**校验**：添加用 `ADD_GAME_REQUIRED`（含归属厂商）；编辑用 `EDIT_GAME_REQUIRED`（不含厂商）。

### 游戏管理 — 合同管理

1. 游戏ID / 游戏名称（只读，`4001 / 星际探险OL`，无分割线）  
2. 预付分成款 *  
3. 付款代理金  
4. 委托开发费用  
5. 合同信息说明（多行）  
6. 合作状态（单选，默认合作中）

### 游戏管理 — 操作记录

1. 游戏ID / 游戏名称（只读，`4001 / 星际探险OL`，表格上方；`agf-drawer-meta`，左对齐与表头「操作人」齐平，不用 168px 表单布局）

| 记录类型 | 「操作」列展示 |
|----------|---------------|
| 添加游戏 | 固定文字「添加游戏」 |
| 运营状态变更 | StatusBadge（最新状态） |
| 合作状态变更 | StatusBadge（最新状态） |

- 排序：操作时间 **新 → 旧**
- 表格：`agf-table-wrap` 灰色实线外框（同 §4 列表区布局）

### 外部收入结算 — 列表（`ExternalSettlementPage`）

**查询栏**：`MonthRangePicker` + `ListSearchFields`（**`gameAndVendor`**）+ **【结算】**、**【导入并结算】**

| 列 | 说明 |
|----|------|
| 收入时间 | 仅展示 |
| 游戏ID / 游戏名称 | `DualCell`，`getGameName` |
| 厂商ID | `vendorId` |
| 厂商名称 | `getVendorName` |
| 渠道 | 漏斗筛选 |
| 待结算金额 | `settlementAmount` |
| 结算收入 | 未结算 `-`；已结算 `formatSettlementIncome` |
| 结算公式 | `displaySettlementFormula` |
| 结算时间 | **无漏斗**；未结算 `-` |
| 申请付款状态 | 未申请 / 已申请；漏斗筛选 |

**【结算】**：对当前筛选结果中所有未结算行（`isUnsettledSettlement`）按公式计算结算收入并写入结算时间；无勾选列。

### 外部收入结算 — 导入并结算弹窗

**入口**：列表上方「导入并结算」；Modal `xl`（960px）、`plain`（无 header/footer 灰线）。

**态 1 — 上传**

| 区块 | 说明 |
|------|------|
| 外部渠道类型 | **单选** radio（`agf-radio-group`）；四选项：纯游外放、游乐IOS、快爆游IOS、49外放 |
| 说明 | FieldHint：「请选择要导入的外部渠道，选择后上传对应渠道报表」 |
| 上传报表 | 表格字段：渠道游戏ID、收入时间、待结算收入；点击 `agf-upload` 模拟解析 |
| 校验 | 未选渠道 → 红 Toast「请先选择外部渠道类型」；渠道无勾选游戏 → 红 Toast「当前渠道不存在运营游戏」 |

**态 2 — 列表**（上传完成后**整页切换**，隐藏上传区）

| 项 | 说明 |
|----|------|
| 顶部 meta | `外部渠道：{渠道名称}`（`agf-import-meta`） |
| 表格 | `DataTable` + 分页（与主列表一致） |
| 列 | 渠道游戏ID、收入时间、游戏ID / 游戏名称、待结算收入、结算公式、结算收入 |
| 结算公式 | 上传后即读取；展示用 `displaySettlementFormula` |
| 结算收入 | 点击「结算」前为 `-` |

**底部按钮**

| 按钮 | 样式 | 启用条件 |
|------|------|----------|
| 取消 | default | 始终 |
| 结算 | **primary** | 已上传；**结算完成后禁用** |
| 确认导入 | **primary** | 全部行已匹配游戏+公式且无错误；**不要求**弹窗内先点「结算」 |

**Toast**：结算成功 → 绿「结算成功」；导入成功 → 绿「导入成功，已加入外部收入结算列表」；失败 → 红。

**工具**：`utils/externalImport.ts`；`importExternal`（`store.tsx`）写入主列表置顶，状态为**未结算**（结算收入/时间为空，主列表【结算】后生效）。

### 内部收入结算 — 列表（`InternalSettlementPage`，`type=internal`）

**查询栏**：`MonthRangePicker` + `ListSearchFields`（**`gameAndVendor`**）+ **数据拉取**、**【结算】**

| 列 | 说明 |
|----|------|
| 收入时间 | 仅展示 |
| 游戏ID / 游戏名称 | `DualCell`，`getGameName` |
| 厂商ID | `vendorId` |
| 厂商名称 | `getVendorName` |
| 渠道 | 内部渠道；漏斗 |
| 待结算金额 | `settlementAmount` |
| 结算收入 | 未结算 `-`；已结算格式化金额 |
| 结算公式 | `displaySettlementFormula` |
| 结算时间 | **无漏斗**；未结算 `-` |
| 申请付款状态 | 未申请 / 已申请；漏斗 |

**【结算】**：结算当前筛选列表中所有未结算行；**无勾选列**。数据拉取写入未结算记录。

### 内部退款结算 — 列表（`InternalSettlementPage`，`type=refund`）

列与内部收入结算相同（含厂商ID/名称、无勾选、结算时间无漏斗），差异：

| 项 | 值 |
|----|-----|
| 时间列标题 | 退款时间 |
| 收入列标题 | 结算退款 |

### 厂商管理 — 添加 / 编辑厂商（1175px，`agf-form-grid`）

**厂商信息**

1. 厂商ID（只读，添加时显示 `-`）  
2. 厂商名称（公司名称）*  
3. 联系人 *  
4. 手机 *  
5. 邮箱 *  
6. 单位地址 *  
7. 发票信息 *  

**银行信息**

1. 开户名称 *  
2. 开户银行 *  
3. 开户银行所在地 *  
4. 支行名称 *  
5. 银行卡号 *  

校验：`VendorForm` → `validateVendorForm` / `VENDOR_REQUIRED`（共 11 项必填）。

### 数据统计 — 厂商收入统计（`stats-vendor`）

**查询栏**：`MonthRangePicker` + `ListSearchFields`（`vendor`）

| 列 | 说明 |
|----|------|
| 时间 | 月，如 `2025-05` |
| 厂商ID / 厂商名称 | 分两列 |
| 总收入 | 已结算内部/外部 `grossRevenue` 合计 |
| 结算收入 / 结算退款 | `settlementIncome` 分项汇总 |

### 数据统计 — 渠道收入统计（`stats-channel`）

**查询栏**：仅 `MonthRangePicker`

| 列 | 说明 |
|----|------|
| 时间 | 月 |
| 渠道 | |
| 总收入 | 已结算内部/外部 `grossRevenue` 合计 |
| 结算收入 / 结算退款 | |

### 数据统计 — 游戏收入统计（`stats-game`）

**查询栏**：`MonthRangePicker` + `ListSearchFields`（`game`）

| 列 | 说明 |
|----|------|
| 时间 | 月 |
| 游戏ID / 游戏名称 | `DualCell`，名称取 `onlineName`（`getGameName`） |
| 总收入 | 已结算内部/外部 `grossRevenue` 合计 |
| 结算收入 / 结算退款 | |

**注意**：三页均已移除「累计流水」列；导航为侧栏独立菜单，**无页内 Tab**。

### 数据统计 — 收入汇总统计（`stats-summary`）

**查询栏**：查询维度下拉（游戏/渠道/厂商）+ `MonthRangePicker` + `ListSearchFields`（`gameAndVendor`）

列表列随查询维度切换：

| 维度 | 列 |
|------|-----|
| 游戏 | 时间、游戏ID / 游戏名称、总收入、结算收入、结算退款 |
| 渠道 | 时间、渠道、总收入、结算收入、结算退款 |
| 厂商 | 时间、厂商ID、厂商名称、总收入、结算收入、结算退款 |

**总收入** = 结算收入 − 结算退款（与本节前三页口径不同）。

实现：`pages/RevenueSummaryPage.tsx`；切换维度时 `DataTable` 设 `key={dimension}` 重置分页。

### 结算公式管理 — 列表

| 列 | 说明 |
|----|------|
| 游戏ID / 游戏名称 | `DualCell`，名称取 `onlineName` |
| 厂商ID / 厂商名称 | 分两列 |
| 结算公式 | 两行正文色：`内部渠道：收入×(1-税率-渠道费)×分成` / `外部渠道：…`；未配置 `-` |
| 操作 | 结算公式、支持渠道、操作记录 |

- **数据来源**：与游戏管理列表同步；游戏管理「添加游戏」成功后，结算公式管理自动增加该游戏一行（置顶）。
- **初始状态**：新游戏结算公式为空，列表「结算公式」列显示 `-`；配置并保存后才展示公式文案。
- 实现：`createEmptyFormula` / `isFormulaConfigured`（`data/mock-data.ts`）；`store.addGame` 写入空公式；列表公式列按当前配置实时计算（非历史 `formulaText` 快照）。

### 结算公式管理 — 支持渠道（抽屉）

**顶部只读**：游戏ID / 游戏名称、厂商名称（`agf-channel-drawer-meta` 收紧与「内部渠道」间距）。

**内部渠道**

- 小标题：**内部渠道**（不加「勾选」后缀，标题不缩进）
- 说明（`FieldHint`）：「请勾选支持的内部渠道，并填写该渠道下对应的游戏ID」
- 每行：`[勾选] 渠道名称 [渠道游戏ID]`；行左缩进 `48px`（`agf-channel-row`）；输入框宽 **200px**
- 勾选后渠道游戏ID**必填**；未勾选不校验

**外部渠道**

- 小标题：**外部渠道**
- 说明：「请勾选支持的外部渠道」
- 每行：仅 `[勾选] 渠道名称`，**无**输入框

渠道清单：

- 内部（7）：快爆付费、H5游戏、快爆内购、游戏盒付费、游戏盒内购、快爆小游戏广告、49广告联盟
- 外部（4）：纯游外放、游乐IOS、快爆游IOS、49外放

校验失败：字段红字 + Toast「请完善所有信息」。

### 结算公式管理 — 操作记录

- 抽屉顶部 `agf-drawer-meta`：`游戏ID / 游戏名称：{id}/{onlineName}`
- 表格：`agf-table-wrap` 外框；列：操作人、操作时间、结算公式

### 结算公式管理 — 结算公式设置

1. 游戏ID / 游戏名称（只读，`4001/星际探险OL`）  
2. 厂商ID、厂商名称（只读）  
3. 结算公式（只读，基础信息区）：当前已生效公式，两行  
   `内部渠道：待结算金额*（1-5%-0%）*50%`  
   `外部渠道：待结算金额*（1-0%-0%）*45%`  
   无则 `-`  
4. **内部渠道结算公式设置**（小标题加粗）  
   - 税率 *：单选「跟随发票」/「自定义」；需手输时输入框必填  
   - 渠道费 *、分成 *：百分数输入（0–100 整数，右侧 `%` 后缀，下方提示「请输入0-100的整数」）；存储仍为小数  
5. **外部渠道结算公式设置**（同上）

提交校验：任一必填未填 → 字段下红字 + Toast「请完善所有信息」，不关闭抽屉。

**税率规则**

| 模式 | 展示 |
|------|------|
| 跟随发票 | 按厂商「发票信息」映射只读税率；发票为「其他」时改为输入框 |
| 自定义 | 输入框手输税率（小数，如 `0.06`） |

| 发票信息 | 税率 |
|----------|------|
| 增值税专用发票（6%） | 0% |
| 增值税专用发票（3%） | 3.36% |
| 增值税专用发票（1%） | 5.6% |
| 普通发票 | 6.72% |
| 其他 | 手输 |

- 抽屉内只读区与分区之间**无灰色分割线**  
- 已移除底部独立「发票设置」区块（并入税率单选）  
- 工具：`utils/invoiceTax.ts`

---

## 8. ID 规则

- 厂商 ID：从 **1001** 起递增  
- 游戏 ID：从 **4001** 起递增  

---

## 9. 关键文件索引

```
src/prototypes/agent-game-finance/
├── style.css                    # 全局样式、抽屉、分页、表单
├── components/
│   ├── DataTable.tsx            # 表格 + 分页
│   ├── Pagination.tsx
│   ├── ListSearchFields.tsx
│   ├── FormFields.tsx           # ReadonlyField、FieldError、FieldHint、PercentInput
│   ├── FilterBar.tsx
│   ├── ColumnFilter.tsx
│   ├── StatusBadge.tsx
│   ├── MonthRangePicker.tsx     # 月份范围选择器
│   ├── VendorForm.tsx           # 厂商 1175 宽表 + 必填校验
│   └── Modal.tsx                # Drawer、Modal（plain/xl）、Toast（success/error）
├── utils/
│   ├── listKeyword.ts           # contractName 等搜索字段
│   ├── columnFilters.ts
│   ├── monthRange.ts
│   ├── invoiceTax.ts            # 发票→税率映射
│   ├── settlement.ts            # calcSettlement、displaySettlementFormula、calcRecordSettlementIncome
│   └── externalImport.ts        # 外部导入解析与结算
├── data/store.tsx               # getGameName / getVendorName
└── pages/                       # 各业务列表页（含 StatisticsPage、RevenueSummaryPage）
```

---

## 10. 后续扩展原则

1. **新列表页**：复用 `DataTable`（自带分页）、`FilterBar`、`ListSearchFields`  
2. **数据统计时间筛选**：复用 `MonthRangePicker` + `getSampleMonthRange`；勿在表头「时间」列加 `ColumnFilter`  
3. **新抽屉表单**：730px 默认，标签 168px + 冒号，只读用 `ReadonlyField`，单选用 `agf-radio-group`  
4. **新枚举列**：在 `columnFilters.ts` 增加选项，列配置加 `filter`；下拉项保持常规字重  
5. **色彩/间距**：优先扩展 CSS 变量，不散落硬编码  
6. **与厂商 1175px 抽屉区分**：宽表格用 `agf-form-grid`，不走 730px 横向表单规则  
7. **游戏名称**：「游戏ID / 游戏名称」用 `getGameName`（`onlineName`）；「合同游戏名称」用 `name`  
8. **结算公式列表**：新游戏同步空公式；未配置 `-`；公式列内外两行  
9. **列表表格**：`--agf-gutter 24px` 留白 + `agf-table-wrap` 灰色实线外框；抽屉/弹窗内表同理  
10. **结算三页**：无「总收入」；「待结算金额」；申请付款状态「未申请/已申请」；结算公式 `待结算金额*（1-渠道费-税率）*分成`；无勾选；结算时间无漏斗；未结算收入/时间 `-`；主列表【结算】处理当前筛选未结算行
11. **Toast**：仅 `success`（绿）/ `error`（红）
12. **外部导入弹窗**：渠道单选；上传后列表态；弹窗结算可选；确认导入写未结算主列表
13. **样例渠道费**：外部 0%、内部 5%
14. **结算三页查询**：`gameAndVendor`；列含厂商ID、厂商名称（游戏列右侧）
15. **分页**：表格外框下方留白；分页底 `16px` + 列表区底 `24px`

---

## 引用方式（给 AI / 后续对话）

### 方法一：@ 文件（推荐）

在 Cursor 对话输入框输入 `@`，选择：

```text
src/resources/agent-game-finance/ui-spec.md
```

然后说明任务，例如：

```text
@src/resources/agent-game-finance/ui-spec.md
按 UI 规范给「结算公式」页增加一个新抽屉表单
```

### 方法二：直接说明路径

```text
请先读取 src/resources/agent-game-finance/ui-spec.md，
再修改 xxx 页面，样式与字段规则按该文档执行。
```

### 方法三：写入项目规则（长期生效）

若希望每次对话自动遵守，可在 `.cursor/rules` 或 `AGENTS.md` 中加一条：

```text
修改 agent-game-finance 原型时，UI/交互以
src/resources/agent-game-finance/ui-spec.md 为准。
```

### 方法四：与原型代码一起引用

复杂改动时同时 @ 规范 + 目标文件：

```text
@src/resources/agent-game-finance/ui-spec.md
@src/prototypes/agent-game-finance/pages/GameListPage.tsx
按规范调整合同管理抽屉字段顺序
```

---

## 变更记录

| 日期 | 摘要 |
|------|------|
| 2026-07-10 | 结算三页：厂商ID/名称列；查询 gameAndVendor；无勾选；结算时间无漏斗；未结算 `-`；主列表【结算】 |
| 2026-07-10 | 结算公式展示改为 `待结算金额*（1-渠道费-税率）*分成`；外部导入写未结算记录 |
| 2026-07-10 | 分页下方留白：pagination 底 16px + table-panel 底 24px |
| 2026-07-10 | 外部导入并结算：单选渠道、两态弹窗、结算/确认导入、externalImport |
| 2026-07-10 | Toast 全站 success 绿 / error 红；主按钮禁用灰样式 |
| 2026-07-10 | 结算三页/导入列表结算公式列去前缀；displaySettlementFormula |
| 2026-07-10 | 样例渠道费：外部 0%、内部 5%；mock 结算重算 |
| 2026-07-10 | 列表布局：`--agf-gutter 24px`、表格外框 `agf-table-wrap`；分页在边框外 |
| 2026-07-10 | 抽屉/弹窗内表格同步灰色实线外框 |
| 2026-07-10 | 支持渠道抽屉：内部/外部渠道、FieldHint、勾选+ID 校验、外部无输入框 |
| 2026-07-10 | 结算三页：移除总收入；结算金额→待结算金额；申请付款状态→未申请/已申请 |
| 2026-07-10 | 游戏名称字段约定：`onlineName` vs `name`；新增 `getGameName` |
| 2026-07-10 | 游戏添加/编辑：FieldHint 字段说明；编辑归属厂商只读；校验 ADD/EDIT 拆分 |
| 2026-07-10 | 结算公式列表：完整列清单、支持渠道、操作记录 meta；公式列两行展示 |
| 2026-07-10 | 游戏管理：合同游戏名称列/搜索；两名称释义明确 |
| 2026-07-10 | 全站「游戏ID / 游戏名称」统一取 `onlineName`，非合同游戏名称 |
| 2026-07-10 | 结算公式列表：新增游戏同步空公式；未配置显示 `-` |
| 2026-07-10 | 外部/内部/退款结算：顶部 `MonthRangePicker` 时间检索，去掉表头时间漏斗 |
| 2026-07-10 | 结算公式抽屉：去灰线、小标题加粗；税点→税率单选（跟随发票/自定义）+ 发票映射 |
| 2026-07-09 | 初版：色彩、按钮、查询栏、分页、730/1175 抽屉、表单、枚举、操作记录 |
| 2026-07-09 | DualCell 单行 `ID / 名称`；表头 `游戏ID / 游戏名称`（斜杠前后空格）；表头加粗 700 |
| 2026-07-09 | 操作记录增加 `agf-drawer-meta` 游戏信息行 |
| 2026-07-09 | 必填校验：字段下红字 + 红色 Toast「请完善所有信息」3 秒；合同预付分成款必填 |
| 2026-07-09 | 厂商「开户银行所在地」改为必填；补全厂商字段清单 |
| 2026-07-09 | 列头筛选下拉不加粗；`MonthRangePicker` 月份范围查询规范 |
| 2026-07-09 | 数据统计 4 页：无 Tab、顶部时间查询、字段清单；移除「累计流水」；渠道加「总收入」 |
| 2026-07-09 | 新增「收入汇总统计」页；mock 结算 S001–S021；默认 `getSampleMonthRange` |
