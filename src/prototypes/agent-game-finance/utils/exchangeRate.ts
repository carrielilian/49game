import type { ExchangeRateRecord } from '../data/types';

/** 从申请时间解析月份 YYYY-MM */
export function parseMonthKeyFromDateTime(dateTime: string): string {
  const datePart = dateTime.trim().split(/[\sT]/)[0];
  return datePart.slice(0, 7);
}

/** 上一个月 YYYY-MM */
export function getPreviousMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return monthKey;
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 【标记付款】/ 结算函：按申请时间月份取「上个月」月末（最后工作日）外部汇率。
 * 1 USD = rate 人民币
 */
export function getExchangeRateByApplyTime(
  applyTime: string,
  rates: ExchangeRateRecord[],
): number | undefined {
  const applyMonth = parseMonthKeyFromDateTime(applyTime);
  const rateMonth = getPreviousMonthKey(applyMonth);
  const sorted = [...rates].sort((a, b) => a.month.localeCompare(b.month));
  const exact = sorted.find((r) => r.month === rateMonth);
  if (exact) return exact.rate;
  // 无精确月份时取最近一条不晚于目标月的汇率
  const fallback = sorted.filter((r) => r.month <= rateMonth).at(-1);
  return fallback?.rate;
}

export function formatExchangeRate(value: number): string {
  return value.toFixed(4);
}

/** @deprecated 原型旧逻辑，请改用 getExchangeRateByApplyTime */
export function getMockExchangeRate(seed = 'default'): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return Math.round((7.0 + (hash % 3000) / 10000) * 10000) / 10000;
}
