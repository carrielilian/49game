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

export interface Vendor {
  id: string;
  businessType: BusinessType;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  /** 支付币种，默认人民币 */
  currency: ContractCurrency;
  invoiceInfo: string;
  accountName: string;
  bank: string;
  bankLocation: string;
  branch: string;
  cardNumber: string;
  /** 厂商级预付分成款；未填视为未补充 */
  prepayment?: number;
  /** 历史已抵扣分成款（线下手动处理），默认 0 */
  historicalDeduction?: number;
  /** 付费设置 — 分成付款公司 */
  sharePaymentCompany?: SharePaymentCompany;
  /** 付费设置 — 付款币种 */
  sharePaymentCurrency?: ContractCurrency;
  /** 付费设置 — 付款账号 */
  sharePaymentAccount?: string;
}

export interface Game {
  id: string;
  name: string;
  onlineName: string;
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
  /** 游戏级预付分成款；未填视为未补充 */
  prepayment?: number;
  /** 历史已抵扣分成款（线下手动处理），默认 0 */
  historicalDeduction?: number;
  /** 付费设置 — 分成付款公司 */
  sharePaymentCompany?: SharePaymentCompany;
  /** 付费设置 — 付款币种 */
  sharePaymentCurrency?: ContractCurrency;
  /** 付费设置 — 付款账号 */
  sharePaymentAccount?: string;
}

export type ContractCurrency = '人民币' | '美金';
export type CooperationContent = '游戏代理金' | '预付分成款' | '委托开发费';

export interface Contract {
  gameId: string;
  contractNumber: string;
  contractAmount?: number;
  /** 合作内容多选 */
  cooperationContents: CooperationContent[];
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
}

export interface VendorBalance {
  vendorId: string;
  balance: number;
  accountTotalIncome: number;
  prepayment: number;
  deductedPrepayment: number;
  remainingPrepayment: number;
  totalIncome: number;
  totalRefund: number;
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
  paymentCurrency: ContractCurrency;
  showExchangeRate: boolean;
  exchangeRate?: number;
  showPrepaymentDeductionRows: boolean;
  prepaidDeduction?: number;
  remainingUndeducted?: number;
  letterPayAmount: number;
}

export interface PaymentRequest {
  id: string;
  vendorId: string;
  pendingAmount: number;
  actualAmount?: number;
  /** 实际付款美金（选填） */
  actualAmountUsd?: number;
  status: PaymentStatus;
  applyTime: string;
  payTime?: string;
  payBank?: string;
  receiptInfo?: string;
  settlementLetter?: string;
  invoice?: string;
  remark?: string;
  /** 申请付款时标记为「已申请」的结算记录 ID */
  settlementIds?: string[];
  /** 标记已付款时写入；打开结算函优先读此快照 */
  letterSnapshot?: SettlementLetterSnapshot;
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
  payTime?: string;
  payBank?: string;
  receiptInfo?: string;
  settlementLetter?: string;
  invoice?: string;
  remark?: string;
  settlementIds?: string[];
  /** 标记已付款时写入；打开结算函优先读此快照 */
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
  /** 上传报表「游戏名称」，匹配 onlineName */
  gameName: string;
  /** 上传报表「厂商名称」 */
  vendorName: string;
  pendingAmount: number;
  channel: string;
  gameId?: string;
  formulaText?: string;
  settlementIncome?: number;
  calculated: boolean;
  error?: string;
}
