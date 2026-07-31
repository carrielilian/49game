import type {
  ChannelOwnership,
  ContractCurrency,
  FormulaConfig,
  SettlementDataSource,
  SettlementRecord,
  Vendor,
} from '../data/types';
import { resolveFollowInvoiceTax } from './invoiceTax';
import { getInternalChannelCategory, getSelfChannelCategory } from './financeCenter';

export const SETTLEMENT_CURRENCY: ContractCurrency = '人民币';

export function currencySymbol(currency?: ContractCurrency): string {
  if (!currency) return '';
  return currency === '美金' ? '$' : '￥';
}

export function formatMoney(value: number): string {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCurrencyMoney(value: number, currency: ContractCurrency = '人民币'): string {
  return `${currencySymbol(currency)}${formatMoney(value)}`;
}

export function formatOptionalCurrencyMoney(value: number, currency?: ContractCurrency): string {
  if (!currency) return formatMoney(value);
  return formatCurrencyMoney(value, currency);
}

export function calcSettlement(
  gross: number,
  tax: number,
  channelFee: number,
  share: number,
): number {
  const net = gross * (1 - tax - channelFee) * share;
  return Math.round(net * 100) / 100;
}

function formatRatePercent(rate: number): string {
  const p = rate * 100;
  if (Number.isInteger(p) || Math.abs(p - Math.round(p)) < 1e-9) return `${Math.round(p)}%`;
  return `${parseFloat(p.toFixed(2))}%`;
}

export function formatFormulaText(
  tax: number,
  channelFee: number,
  share: number,
  channelLabel: string,
): string {
  return `${channelLabel}：待结算金额*（1-${formatRatePercent(channelFee)}-${formatRatePercent(tax)}）*${formatRatePercent(share)}`;
}

/** 列表「结算公式」列：去掉「外部：/内部：/外部渠道：」等前缀，仅展示公式表达式 */
export function displaySettlementFormula(text?: string): string {
  if (!text) return '-';
  return text
    .replace(/^(自有渠道|外部渠道|外部|内部渠道|内部|退款)：/, '')
    .replace(/^收入×/, '待结算金额*')
    .replace(/×/g, '*');
}

export function getSettlementDataSource(record: SettlementRecord): SettlementDataSource {
  return record.dataSource ?? (record.type === 'external' ? '文件导入' : '系统拉取');
}

export function getSettlementChannelOwnership(
  record: SettlementRecord,
  vendor: Vendor | undefined,
): ChannelOwnership {
  if (record.channelOwnership) return record.channelOwnership;
  if (record.type === 'external') return 'external';
  if (!vendor) return 'own';
  return getInternalChannelCategory(record.channel) === getSelfChannelCategory(vendor.businessType)
    ? 'own'
    : 'external';
}

/** 退款无论渠道归属均使用外部渠道结算公式；收入仍按实际渠道归属选择公式。 */
export function getSettlementFormulaOwnership(
  record: SettlementRecord,
  vendor: Vendor | undefined,
): ChannelOwnership {
  return record.type === 'refund'
    ? 'external'
    : getSettlementChannelOwnership(record, vendor);
}

export function isFormulaConfiguredForOwnership(
  formula: FormulaConfig | undefined,
  ownership: ChannelOwnership,
): boolean {
  if (!formula) return false;
  const fields = ownership === 'own'
    ? [formula.internalTax, formula.internalChannelFee, formula.internalShare]
    : [formula.externalTax, formula.externalChannelFee, formula.externalShare];
  return fields.every(Number.isFinite);
}

export function isFormulaValidForOwnership(
  formula: FormulaConfig | undefined,
  ownership: ChannelOwnership,
): boolean {
  if (!isFormulaConfiguredForOwnership(formula, ownership)) return false;
  const fields = ownership === 'own'
    ? [formula!.internalTax, formula!.internalChannelFee, formula!.internalShare]
    : [formula!.externalTax, formula!.externalChannelFee, formula!.externalShare];
  return fields.every((value) => value >= 0 && value <= 1);
}

export function getSettlementFormulaText(
  formula: FormulaConfig | undefined,
  vendor: Vendor | undefined,
  ownership: ChannelOwnership,
  amountLabel = '待结算金额',
): string {
  if (!isFormulaConfiguredForOwnership(formula, ownership)) return '-';
  const isOwn = ownership === 'own';
  const configuredTax = isOwn ? formula!.internalTax : formula!.externalTax;
  const taxMode = isOwn ? formula!.internalTaxMode : formula!.externalTaxMode;
  const tax = taxMode === '跟随发票' && vendor
    ? resolveFollowInvoiceTax(vendor.invoiceInfo, configuredTax, vendor.taxPoint)
    : configuredTax;
  const text = formatFormulaText(
    tax,
    isOwn ? formula!.internalChannelFee : formula!.externalChannelFee,
    isOwn ? formula!.internalShare : formula!.externalShare,
    isOwn ? '自有渠道' : '外部渠道',
  );
  return amountLabel === '退款金额' ? text.replace('待结算金额', amountLabel) : text;
}

export function isUnsettledSettlement(s: SettlementRecord): boolean {
  return !s.settled || !s.settlementTime;
}

export function formatSettlementIncome(s: SettlementRecord): string {
  return isUnsettledSettlement(s) ? '-' : formatCurrencyMoney(s.settlementIncome, SETTLEMENT_CURRENCY);
}

export function formatSettlementTime(s: SettlementRecord): string {
  return s.settlementTime && s.settled ? s.settlementTime : '-';
}

export function calcRecordSettlementIncome(
  record: SettlementRecord,
  formula: FormulaConfig | undefined,
  vendor: Vendor | undefined,
): number {
  const ownership = getSettlementFormulaOwnership(record, vendor);
  if (!isFormulaConfiguredForOwnership(formula, ownership)) return record.settlementIncome;
  if (ownership === 'external') {
    const tax = formula.externalTaxMode === '跟随发票' && vendor
      ? resolveFollowInvoiceTax(vendor.invoiceInfo, formula.externalTax, vendor.taxPoint)
      : formula.externalTax;
    return calcSettlement(record.settlementAmount, tax, formula.externalChannelFee, formula.externalShare);
  }
  const tax = formula.internalTaxMode === '跟随发票' && vendor
    ? resolveFollowInvoiceTax(vendor.invoiceInfo, formula.internalTax, vendor.taxPoint)
    : formula.internalTax;
  return calcSettlement(record.settlementAmount, tax, formula.internalChannelFee, formula.internalShare);
}

/** 结算时间等：精确到秒，格式 YYYY-MM-DD HH:mm:ss */
export function formatDateTime(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function genId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
