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

/** 上一自然月，格式 YYYY-MM（内部结算【数据拉取】写入的收入时间） */
export function getPreviousMonthKey(date = new Date()): string {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return formatYearMonth(d.getFullYear(), d.getMonth() + 1);
}

/** 默认查询近一个月（上一自然月） */
export function getDefaultMonthRange(): MonthRange {
  const ym = getPreviousMonthKey();
  return { start: ym, end: ym };
}

/** 近两个月：上个月 + 当前月 */
export function getRecentTwoMonthsRange(date = new Date()): MonthRange {
  const startDate = new Date(date);
  startDate.setDate(1);
  startDate.setMonth(startDate.getMonth() - 1);
  return {
    start: formatYearMonth(startDate.getFullYear(), startDate.getMonth() + 1),
    end: formatYearMonth(date.getFullYear(), date.getMonth() + 1),
  };
}

/** 原型样例数据月份范围（与结算三页默认近两个月对齐：2026-06 ~ 2026-07） */
export function getSampleMonthRange(): MonthRange {
  return { start: '2026-06', end: '2026-07' };
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
