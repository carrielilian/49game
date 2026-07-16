import type { ContractCurrency, FormulaConfig, SettlementRecord, Vendor } from '../data/types';
import { resolveFollowInvoiceTax } from './invoiceTax';

export const SETTLEMENT_CURRENCY: ContractCurrency = '人民币';

export function currencySymbol(currency: ContractCurrency = '人民币'): string {
  return currency === '美金' ? '$' : '￥';
}

export function formatMoney(value: number): string {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCurrencyMoney(value: number, currency: ContractCurrency = '人民币'): string {
  return `${currencySymbol(currency)}${formatMoney(value)}`;
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
    .replace(/^(外部渠道|外部|内部渠道|内部|退款)：/, '')
    .replace(/^收入×/, '待结算金额*')
    .replace(/×/g, '*');
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
  if (!formula) return record.settlementIncome;
  if (record.type === 'external') {
    const tax = formula.externalTaxMode === '跟随发票' && vendor
      ? resolveFollowInvoiceTax(vendor.invoiceInfo, formula.externalTax)
      : formula.externalTax;
    return calcSettlement(record.settlementAmount, tax, formula.externalChannelFee, formula.externalShare);
  }
  const tax = formula.internalTaxMode === '跟随发票' && vendor
    ? resolveFollowInvoiceTax(vendor.invoiceInfo, formula.internalTax)
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
