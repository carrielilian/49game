# 代理游戏财务平台 — UI 规范

> 原型路径：`src/prototypes/agent-game-finance/`  
> 预览：`/prototypes/agent-game-finance`  
> 最后更新：2026-07-09

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
| 已上线、合作中、已提交、已付款 | success 绿 |
| 待付款、未提交 | warning 橙 |
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

---

## 3. 列表查询栏

### 三栏独立查询（ListSearchFields）

按列表实际字段显示，多框为 **且** 关系：

| 输入框 placeholder | 匹配规则 |
|-------------------|----------|
| 游戏ID / 游戏名称 | 游戏 ID 或名称 |
| 厂商ID | 仅厂商 ID |
| 厂商名称 | 仅厂商名称 |

**各页模式**

| 模式 | 页面 |
|------|------|
| `gameAndVendor` | 游戏管理、结算公式 |
| `vendor` | 厂商管理、付款管理、厂商收入 |
| `game` | 外部/内部/退款结算 |
| 按 Tab | 数据统计：厂商 Tab→vendor，游戏 Tab→game，渠道 Tab→无 |

组件：`components/ListSearchFields.tsx`  
逻辑：`utils/listKeyword.ts` → `matchesListSearch`

---

## 4. 表格

### 列布局约定

- 游戏 ID + 名称：可用 `DualCell`（主名称 + 副 ID）
- 厂商 ID、厂商名称：**分两列**，不合并
- 枚举列：表头带漏斗筛选（`ColumnFilter` + `utils/columnFilters.ts`）

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

### 单选字段（Radio）

- 16px 圆形，选中：蓝色描边 + 蓝色实心圆点
- 未选中：灰色描边空心
- 选项横向排列，间距 24px，与标签垂直居中
- class：`agf-radio-group` / `agf-radio-item`

### 多行文本（备注等）

- 聚焦边框：主题蓝 `#4165d7`，无浏览器默认 outline
- class：`agf-form-textarea`

### 必填

- 标签前红色 `*`
- class：`agf-form-label--required`

---

## 6. 业务枚举

| 字段 | 可选值 |
|------|--------|
| 运营状态 | 已上线 / 未上线 |
| 合作状态 | 合作中 / 合作终止 |
| 版号 | 有 / 无 |

---

## 7. 页面字段清单

### 游戏管理 — 添加游戏

1. 游戏名称（合同名称）*  
2. 上线游戏名称 *  
3. 游戏负责人 *  
4. 归属厂商 *  
5. 版号（单选）  
6. 运营状态（单选，默认未上线）  
7. 备注（末尾）

### 游戏管理 — 编辑游戏

1. 游戏ID（只读）  
2. 游戏名称（合同名称）*  
3. 上线游戏名称 *  
4. 游戏负责人 *  
5. 归属厂商 *  
6. 版号（单选）  
7. 运营状态（单选）  
8. 备注（末尾）

### 游戏管理 — 合同管理

1. 游戏ID/游戏名称（只读，`4001 / 星际探险`，无分割线）  
2. 预付分成款  
3. 付款代理金  
4. 委托开发费用  
5. 合同信息说明（多行）  
6. 合作状态（单选，默认合作中）

### 游戏管理 — 操作记录

| 记录类型 | 「操作」列展示 |
|----------|---------------|
| 添加游戏 | 固定文字「添加游戏」 |
| 运营状态变更 | StatusBadge（最新状态） |
| 合作状态变更 | StatusBadge（最新状态） |

- 排序：操作时间 **新 → 旧**

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
│   ├── FormFields.tsx           # ReadonlyField
│   ├── FilterBar.tsx
│   ├── ColumnFilter.tsx
│   └── StatusBadge.tsx
├── utils/
│   ├── listKeyword.ts
│   └── columnFilters.ts
└── pages/                       # 各业务列表页
```

---

## 10. 后续扩展原则

1. **新列表页**：复用 `DataTable`（自带分页）、`FilterBar`、`ListSearchFields`  
2. **新抽屉表单**：730px 默认，标签 168px + 冒号，只读用 `ReadonlyField`，单选用 `agf-radio-group`  
3. **新枚举列**：在 `columnFilters.ts` 增加选项，列配置加 `filter`  
4. **色彩/间距**：优先扩展 CSS 变量，不散落硬编码  
5. **与厂商 1175px 抽屉区分**：宽表格用 `agf-form-grid`，不走 730px 横向表单规则  

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
| 2026-07-09 | 初版：色彩、按钮、查询栏、分页、730/1175 抽屉、表单、枚举、操作记录 |
