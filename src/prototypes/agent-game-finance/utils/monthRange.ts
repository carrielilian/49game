export interface MonthRange {
  start: string;
  end: string;
}

export function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function parseYearMonth(ym: string): { year: number; month: number } {
  const [y, m] = ym.split('-').map(Number);
  return { year: y, month: m };
}

/** 默认查询近一个月（上一自然月） */
export function getDefaultMonthRange(): MonthRange {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  const ym = formatYearMonth(d.getFullYear(), d.getMonth() + 1);
  return { start: ym, end: ym };
}

/** 原型样例数据月份范围（mock 结算数据覆盖 2025-05 ~ 2025-06） */
export function getSampleMonthRange(): MonthRange {
  return { start: '2025-05', end: '2025-06' };
}

export function isMonthInRange(month: string, range: MonthRange): boolean {
  return month >= range.start && month <= range.end;
}

export function formatMonthRangeLabel(range: MonthRange): string {
  return `${range.start} - ${range.end}`;
}

export function compareYearMonth(a: string, b: string): number {
  return a.localeCompare(b);
}

export function normalizeMonthRange(start: string, end: string): MonthRange {
  return compareYearMonth(start, end) <= 0 ? { start, end } : { start: end, end: start };
}
