export type PaymentApplyStatus = '未申请' | '已申请';
export type PaymentStatus = '未付款' | '已付款';
export type OperationStatus = '未上线' | '已上线';
export type CooperationStatus = '合作中' | '合作终止';
export type LicenseStatus = '有' | '无';
export type GamePayer = '4399' | '纯游' | '游乐' | '游戏之家' | '香港4399' | '游家时代';
export type SharePaymentCompany = '4399' | '纯游' | '纯游（美元）' | '香港4399' | '游家时代';
export type SettlementType = 'external' | 'internal' | 'refund';
export type ChannelType = 'internal' | 'external';
export type BusinessType = '4399' | '快爆';
export type SettlementDataSource = '系统拉取' | '文件导入';
export type ChannelOwnership = 'own' | 'external';
export type ExternalChannelType = 'related' | 'thirdParty';
export type SettlementRole = 'agency' | 'distribution' | 'thirdParty';

export interface Vendor {
  id: string;
  businessType: BusinessType;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  invoiceInfo: string;
  accountName: string;
  bank: string;
  /** 银行代码（选填） */
  bankCode?: string;
  bankLocation: string;
  branch: string;
  cardNumber: string;
}

export interface Game {
  id: string;
  name: string;
  onlineName: string;
  /** 游戏英文名称（选填） */
  englishName?: string;
  vendorId: string;
  launchDate: string;
  manager: string;
  /** 付款方 */
  payer?: GamePayer;
  license: LicenseStatus;
  operationStatus: OperationStatus;
  cooperationStatus: CooperationStatus;
  remark?: string;
  licenseFee?: number;
  licensePayer?: string;
  /** 游戏添加时间，用于列表默认排序 */
  createdAt: string;
  /** @deprecated 历史原型字段；现行预付分成款读取 Contract.paidPrepayment */
  prepayment?: number;
  /** @deprecated 历史原型字段；现行预付分成款币种读取 Contract.currency */
  prepaymentCurrency?: ContractCurrency;
  /** 历史已抵扣分成款（线下手动处理），默认 0 */
  historicalDeduction?: number;
  /** 付款设置 — 是否有预付分成款 */
  hasPrepayment?: boolean;
  /** 付费设置 — 分成付款公司 */
  sharePaymentCompany?: SharePaymentCompany;
  /** 付费设置 — 付款币种 */
  sharePaymentCurrency?: ContractCurrency;
}

export type ContractCurrency = '人民币' | '美金';
export type CooperationContent = '游戏代理金' | '预付分成款' | '委托开发费';

export interface Contract {
  gameId: string;
  contractNumber: string;
  /** 支付币种，在合同管理中维护 */
  currency?: ContractCurrency;
  contractAmount?: number;
  /** 合作内容多选 */
  cooperationContents: CooperationContent[];
  /** 游戏代理金（合同约定金额） */
  agencyFee?: number;
  /** 预付分成款（合同约定金额） */
  prepaymentAmount?: number;
  /** 委托开发费（合同约定金额） */
  developmentFee?: number;
  /** 已付游戏代理金（勾选游戏代理金时） */
  paidAgencyFee?: number;
  /** 已付预付分成款（勾选预付分成款时） */
  paidPrepayment?: number;
  /** 已付委托开发费（勾选委托开发费时） */
  paidDevelopmentFee?: number;
  /** 补充说明 */
  supplementalNote: string;
  cooperationStatus: CooperationStatus;
}

export interface FormulaChannel {
  id: string;
  name: string;
  type: ChannelType;
  enabled: boolean;
  channelGameId?: string;
}

export type TaxMode = '跟随发票' | '自定义';

export interface FormulaConfig {
  gameId: string;
  internalTaxMode: TaxMode;
  internalTax: number;
  internalChannelFee: number;
  internalShare: number;
  externalTaxMode: TaxMode;
  externalTax: number;
  externalChannelFee: number;
  externalShare: number;
  channels: FormulaChannel[];
}

export interface SettlementRecord {
  id: string;
  type: SettlementType;
  incomeTime: string;
  gameId: string;
  channel: string;
  grossRevenue: number;
  settlementAmount: number;
  settlementIncome: number;
  formulaText: string;
  settlementTime?: string;
  paymentApplyStatus: PaymentApplyStatus;
  settled: boolean;
  vendorId: string;
  /** 数据进入系统的方式；历史记录未保存时由 type 兼容推导 */
  dataSource?: SettlementDataSource;
  /** 相对于当前业务类型的渠道归属 */
  channelOwnership?: ChannelOwnership;
  /** 外部渠道细分；自有渠道不填写 */
  externalChannelType?: ExternalChannelType;
  /** 结算业务角色 */
  settlementRole?: SettlementRole;
  /** 渠道总类；系统拉取为游戏盒/快爆，文件导入为实际渠道 */
  channelCategory?: string;
  /** 拉取时冻结的渠道游戏ID */
  channelGameId?: string;
  /** 记录生成时的业务类型快照 */
  businessType?: BusinessType;
}

export interface GameBalance {
  gameId: string;
  balance: number;
  accountTotalIncome: number;
  prepayment: number;
  deductedPrepayment: number;
  remainingPrepayment: number;
  totalIncome: number;
  totalRefund: number;
}

/** 标记已付款时冻结的结算函展示数据，之后不再随汇率/预付等外部数据变化 */
export interface SettlementLetterSnapshot {
  incomeRows: Array<{
    id: string;
    productName: string;
    period: string;
    revenue: number;
    formula: string;
    settlementAmount: number;
  }>;
  refundRows: Array<{
    id: string;
    productName: string;
    period: string;
    refundAmount: number;
    formula: string;
    settlementRefund: number;
  }>;
  incomeTotal: number;
  refundTotal: number;
  netTotal: number;
  /** 付款币种（付费设置 sharePaymentCurrency）；汇率行、实际付款金额 */
  paymentCurrency: ContractCurrency;
  /** 支付币种（Contract.currency）；⑤ 结算/抵扣与剩余 */
  contractPaymentCurrency: ContractCurrency;
  showExchangeRate: boolean;
  exchangeRate?: number;
  showPrepaymentDeductionRows: boolean;
  prepaidDeduction?: number;
  remainingUndeducted?: number;
  letterPayAmount: number;
}

/** 游戏【申请付款】成功时刻冻结的信息 */
export interface GamePaymentApplySnapshot {
  gameId: string;
  gameName: string;
  /** 申请付款时冻结的游戏英文名称；英文结算函优先使用 */
  gameEnglishName?: string;
  /** 支付币种：Contract.currency */
  contractPaymentCurrency: ContractCurrency;
  vendorId: string;
  vendorName: string;
  receiptInfo: string;
  prepayment: number;
  remainingPrepayment: number;
  sharePaymentCompany: string;
  sharePaymentCurrency: ContractCurrency;
  /** 申请付款时手工填写的汇率取值日期 */
  exchangeRateDate: string;
  /** 申请付款时手工填写并冻结的汇率 */
  exchangeRate: number;
  applyTime: string;
}

export interface GamePaymentRequest {
  id: string;
  gameId: string;
  pendingAmount: number;
  actualAmount?: number;
  /** 实际付款美金（选填） */
  actualAmountUsd?: number;
  status: PaymentStatus;
  applyTime: string;
  exchangeRateDate?: string;
  exchangeRate?: number;
  payTime?: string;
  payBank?: string;
  receiptInfo?: string;
  settlementLetter?: string;
  invoice?: string;
  remark?: string;
  settlementIds?: string[];
  applySnapshot?: GamePaymentApplySnapshot;
  /** 申请付款时写入；标记已付款不更新本快照 */
  letterSnapshot?: SettlementLetterSnapshot;
}

/** 月末（最后工作日）从外部接口同步的 USD/CNY 汇率；1 USD = rate 人民币 */
export interface ExchangeRateRecord {
  /** 汇率所属月份 YYYY-MM */
  month: string;
  /** 汇率值 */
  rate: number;
  /** 外部接口实际拉取日（该月最后工作日）YYYY-MM-DD */
  fetchDate: string;
}

export type GameOperationLogAction = '添加游戏' | '运营状态' | '合作状态' | '合同变更';

export interface GameOperationLog {
  id: string;
  gameId: string;
  operator: string;
  time: string;
  action: GameOperationLogAction;
  status?: string;
  /** 合同金额/已付变更等多行说明 */
  detail?: string;
}

export interface FormulaOperationLog {
  id: string;
  gameId: string;
  operator: string;
  time: string;
  formulaText: string;
}

export interface ImportPreviewRow {
  id: string;
  incomeTime: string;
  channel: string;
  gameId: string;
  gameName: string;
  vendorName: string;
  pendingAmount: number;
  error?: string;
}
