import type { PaymentStatus } from '../data/types';
import { formatCurrencyMoney } from './settlement';

/** 厂商付款管理：未付款（含历史「待付款」） */
export function isUnpaidPayment(status: PaymentStatus | string): boolean {
  return status === '未付款' || status === '待付款';
}

export function isPaidPayment(status: PaymentStatus | string): boolean {
  return status === '已付款';
}

export function formatOptionalAmountInput(value?: number): string {
  return value != null && Number.isFinite(value) ? value.toFixed(2) : '';
}

export function parseOptionalAmount(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return Math.round(parseFloat(trimmed) * 100) / 100;
}

export function validateOptionalUsdAmount(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return '实际付款美金精确至小数点后两位';
  const n = parseFloat(trimmed);
  if (Number.isNaN(n) || n < 0) return '实际付款美金不能小于0';
  return undefined;
}

export function formatCnyPaymentDisplay(value?: number): string {
  if (value == null || Number.isNaN(value)) return '-';
  return formatCurrencyMoney(value, '人民币');
}

export function formatUsdAmountDisplay(value?: number): string {
  if (value == null || Number.isNaN(value)) return '-';
  return formatCurrencyMoney(value, '美金');
}
