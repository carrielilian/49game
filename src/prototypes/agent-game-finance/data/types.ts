export type PaymentApplyStatus = '未申请' | '已申请';
export type PaymentStatus = '未付款' | '已付款';
export type OperationStatus = '未上线' | '已上线';
export type CooperationStatus = '合作中' | '合作终止';
export type LicenseStatus = '有' | '无';
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
}

export interface Game {
  id: string;
  name: string;
  onlineName: string;
  vendorId: string;
  launchDate: string;
  manager: string;
  license: LicenseStatus;
  operationStatus: OperationStatus;
  cooperationStatus: CooperationStatus;
  remark?: string;
  licenseFee?: number;
  licensePayer?: string;
}

export interface Contract {
  gameId: string;
  agencyPayment: number;
  developmentFee: number;
  contractDescription: string;
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

export interface PaymentRequest {
  id: string;
  vendorId: string;
  pendingAmount: number;
  actualAmount?: number;
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
}

export type GameOperationLogAction = '添加游戏' | '运营状态' | '合作状态';

export interface GameOperationLog {
  id: string;
  gameId: string;
  operator: string;
  time: string;
  action: GameOperationLogAction;
  status?: string;
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
  channelGameId: string;
  incomeTime: string;
  pendingAmount: number;
  channel: string;
  gameId?: string;
  gameName?: string;
  formulaText?: string;
  settlementIncome?: number;
  calculated: boolean;
  error?: string;
}
