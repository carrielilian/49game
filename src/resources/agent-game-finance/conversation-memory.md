# 代理游戏财务 — 对话记忆 / 项目上下文

> **用途**：在新 Cursor 对话中快速恢复本项目背景、已做决策和待办，避免重复对齐。  
> **UI 细节**：改样式、表单、抽屉、分页等请优先读 [`ui-spec.md`](./ui-spec.md)。  
> **最后更新**：2026-07-09  
> **对应 Git**：见文末「Git 状态」；远程 https://github.com/carrielilian/49game.git `main`

---

## 在新对话里如何调取这份记忆

1. **@ 引用文件（推荐）**  
   在新对话输入框输入 `@`，选择或粘贴路径：  
   `src/resources/agent-game-finance/conversation-memory.md`  
   可同时 @ `ui-spec.md` 做 UI 改动。

2. **一句话指令**  
   > 请先阅读 `src/resources/agent-game-finance/conversation-memory.md` 和 `ui-spec.md`，再继续改代理游戏财务原型。

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
| 原型名 | 代理游戏财务（agent-game-finance） |
| 代码目录 | `src/prototypes/agent-game-finance/` |
| 预览路径 | `/prototypes/agent-game-finance` |
| 远程仓库 | https://github.com/carrielilian/49game.git ，分支 `main` |
| 目标 | 可运行、接近正式产品的后台原型（非线框） |
| 沟通语言 | 中文；用户不熟悉 CLI，验收需说明预览路径 |

---

## 本次对话完成的主要工作

### 1. 列表查询（8 个列表页 + 统计 Tab）

- 规则：**仅对列表存在的字段展示查询框**；多框为 **AND** 逻辑。
- 三个独立输入：游戏 ID/游戏名称 | 厂商 ID | 厂商名称。
- 组件：`ListSearchFields.tsx`；工具：`utils/listKeyword.ts`（`matchesListSearch`、`ListSearchQuery`）。
- 模式：`game` / `vendor` / `gameAndVendor`；统计页按 Tab 切换。

### 2. 列表列与枚举

- 游戏管理：**厂商 ID、厂商名称分两列**（不再合并 DualCell）。
- 运营状态：**已上线 / 未上线**（已移除「停运」）。
- 合作状态：**合作中 / 合作终止**（原「已终止」改为「合作终止」）。

### 3. 游戏添加 / 编辑表单

**添加顺序**：游戏名称* → 上线游戏名称* → 游戏负责人* → 归属厂商* → 版号(radio) → 运营状态(radio，默认未上线) → 备注。

**编辑顺序**：游戏 ID(只读) → 同上字段；**不含**上线时间、合作状态。

### 4. 合同管理抽屉

**字段顺序**：

1. 游戏 ID/游戏名称 — 只读，格式 `4001 / 星际探险`，无分割线  
2. 预付分成款  
3. 付款代理金  
4. 委托开发费用  
5. 合同信息说明（textarea）  
6. 合作状态 — radio 合作中/合作终止，默认合作中  

**已移除**：版号费、版号支付方、运营状态。

**类型**（`data/types.ts`）：`gameId, prepayment, agencyPayment, developmentFee, contractDescription, cooperationStatus`。  
保存合作状态时同步游戏列表并写操作记录（`store.tsx` → `updateContract`）。

### 5. 操作记录

- 类型：**添加游戏 | 运营状态变更 | 合作状态变更**。
- 「操作」列：添加游戏 → 固定文案「添加游戏」；状态变更 → `StatusBadge` 显示最新状态。
- 排序：**时间新→旧**。类型 `GameOperationLog` 使用 `action` + 可选 `status`。
- 游戏 4001 示例 mock：合作中(2024-06-01) → 已上线(2024-03-15) → 添加游戏(2024-03-01)。
- 写入点：`addGame`、`updateGame`（运营状态）、`updateContract`（合作状态）。
- 操作记录抽屉内表格**暂无分页**（数据量小，用户未要求）。

### 6. 分页（所有 DataTable 列表）

- `components/Pagination.tsx` + `DataTable.tsx` 集成。
- 默认 **20 条/页**；可选 10/20/30/50/100/200。
- 居中：共 X 条 + 每页条数 + 页码；当前页浅蓝底 `#eef2fc`、蓝字 `#4165d7`。
- 筛选或数据长度变化时重置到第 1 页；统计页 `key={tab}` 切换 Tab 重置。

### 7. UI 样式要点（详见 ui-spec.md）

| 项 | 值 |
|----|-----|
| 主色 | `#4165d7`，hover `#5474db` |
| 标准抽屉宽 | **730px** |
| 厂商抽屉宽 | **1175px** |
| 730px 抽屉标签列 | **168px** 右对齐，自动加「：」 |
| 只读字段 | `ReadonlyField`（`FormFields.tsx`） |
| 表单字号/颜色 | 14px `#333` |

### 8. 文档

- **`ui-spec.md`**：完整 UI/交互规范，后续改 UI 的统一引用。
- **`conversation-memory.md`**（本文件）：项目上下文与对话记忆。
- **`templates/conversation-memory-template.md`**：其他项目/对话可复用的记忆模板。

### 9. 表单必填校验（本地新增，相对 3cc8c59）

**通用规则**：提交时若有必填未填 → 字段下红字 + 顶部红色 Toast「请完善所有信息」（3 秒）→ **不关闭抽屉、不提交**。

| 场景 | 必填字段 | 实现 |
|------|----------|------|
| 添加/编辑游戏 | 游戏名称、上线游戏名称、游戏负责人、归属厂商 | `GameListPage` → `validateGameForm` + `FieldError` |
| 合同管理 | **预付分成款**（带 *） | 空值视为 NaN，提示「预付分成款不能为空」 |
| 添加/编辑厂商 | 厂商名称、联系人、手机、邮箱、单位地址、发票信息、开户名称、开户银行、支行名称、银行卡号（10 项） | `VendorForm` → `validateVendorForm` + `VENDOR_REQUIRED` |

**组件**：
- `FormFields.tsx` → `FieldError`（class `agf-form-error`）
- `VendorForm.tsx` → `agf-form-grid__error`；输入时 `clearError` 清除对应项
- `Modal.tsx` → `Toast` 支持 `type="error"`（浅红底 `#FEF0F0`、红字 `#F56C6C`、图标）

**厂商表单**：开户银行所在地**非必填**（其余 10 项必填）。

### 10. 列表与展示统一（本地新增）

- **DualCell**：单行 `ID / 名称`（如 `4001 / 星际探险`），不再主副两行。
- **表头文案**：斜杠前后加空格，统一为 `游戏ID / 游戏名称`（各列表页、外部结算预览表头已改）。
- **表头样式**：`font-weight: 700` 加粗。
- **操作记录抽屉**：表格上方增加只读行 `游戏ID / 游戏名称：4001 / 星际探险`（class `agf-drawer-meta`，与表头「操作人」列左对齐，**不用** 168px 表单布局）。

### 11. Git

- Windows 环境 Git 可能不在 PATH，可用：`"C:\Program Files\Git\cmd\git.exe"`。
- 用户说「推送到 git」时再 commit/push，不要主动提交。

---

## 关键文件地图

```text
src/prototypes/agent-game-finance/
├── index.tsx, style.css
├── components/
│   ├── DataTable.tsx, Pagination.tsx, ListSearchFields.tsx
│   ├── FormFields.tsx, VendorForm.tsx, Modal.tsx
│   ├── FilterBar.tsx, ColumnFilter.tsx, StatusBadge.tsx
│   └── AdminLayout.tsx, Sidebar.tsx, SettlementLetterDrawer.tsx
├── data/types.ts, mock-data.ts, store.tsx
├── utils/listKeyword.ts, columnFilters.ts, balance.ts, settlement.ts
└── pages/
    ├── GameListPage.tsx      # 游戏 CRUD、合同、操作记录
    ├── VendorListPage.tsx
    ├── FormulaListPage.tsx, PaymentListPage.tsx
    ├── InternalSettlementPage.tsx, ExternalSettlementPage.tsx
    ├── VendorIncomePage.tsx, StatisticsPage.tsx

src/resources/agent-game-finance/
├── ui-spec.md                # UI/交互规范（改样式必读）
└── conversation-memory.md    # 本文件（上下文/决策/进度）
```

---

## 数据与 ID 规则

- 厂商 ID 从 **1001** 起；游戏 ID 从 **4001** 起（`store.tsx` 内 `nextNumericId`）。
- Mock 约 12 条游戏；默认 20 条/页时分页不明显，改为 10 条/页可见。

---

## 已知缺口 / 未做 / 注意

- 厂商 **1175px** 抽屉用 `agf-form-grid`，不完全遵循 730px 横向表单规则。
- 操作记录抽屉表格无分页。
- 未在 `AGENTS.md` 添加自动加载 ui-spec / conversation-memory 的规则（用户未确认）。
- 合同抽屉中付款代理金、委托开发费用**暂未**做必填校验（仅预付分成款必填）。

---

## 历史问题（已修复）

- 编辑游戏表单曾因合并函数签名损坏 → 已恢复 `EditGameForm` 独立闭包。

---

## Git 状态

| 项 | 值 |
|----|-----|
| 远程 | https://github.com/carrielilian/49game.git |
| 分支 | `main` |
| 上一版已推 | `3cc8c59` — 合同管理、操作记录、分页、ui-spec |
| 本次待推 | 表单校验、DualCell/表头统一、操作记录 meta、conversation-memory + 模板 |

---

## 给下一轮 AI 的提示

1. 改 UI 前先读 `ui-spec.md`，避免抽屉宽度、标签列、按钮色不一致。  
2. 列表查询遵循「有列才出框、多框 AND」。  
3. 状态枚举勿恢复旧值（停运、已终止等）。  
4. 合同保存要同步合作状态 + 写操作日志；预付分成款必填。  
5. 表单提交必须走校验：字段红字 + Toast，失败不关闭抽屉。  
6. DualCell / 表头用 `ID / 名称` 格式，斜杠前后有空格。  
7. 用户说「推送到 git」时再 commit/push，不要主动提交。  
8. 产品需求或设计方案有重大分歧时，按 `AGENTS.md` 门禁先对齐再继续实现。
