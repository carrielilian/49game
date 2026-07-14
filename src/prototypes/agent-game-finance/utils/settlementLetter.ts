import type { PaymentRequest, SettlementRecord, Vendor } from '../data/types';
import { calcVendorPrepaymentSummary } from './prepayment';

function monthToIndex(incomeTime: string): number {
  const [y, m] = incomeTime.split('-').map(Number);
  return y * 12 + m;
}

export function formatLetterPeriod(incomeTime: string): string {
  const [year, month] = incomeTime.split('-');
  if (!year || !month) return incomeTime;
  return `${year}.${month.padStart(2, '0')}`;
}

export function formatLetterPeriodRange(times: string[]): string {
  if (times.length === 0) return '';
  const sorted = [...times].sort();
  const start = formatLetterPeriod(sorted[0]);
  if (sorted.length === 1) return start;
  return `${start}-${formatLetterPeriod(sorted[sorted.length - 1])}`;
}

function groupByProduct(
  records: SettlementRecord[],
  getGameName: (id: string) => string,
): { productName: string; records: SettlementRecord[] }[] {
  const map = new Map<string, { productName: string; records: SettlementRecord[] }>();
  for (const s of records) {
    const key = `${s.gameId}|${s.channel}`;
    const productName = `《${getGameName(s.gameId)}》${s.channel}`;
    if (!map.has(key)) map.set(key, { productName, records: [] });
    map.get(key)!.records.push(s);
  }
  return [...map.values()];
}

function splitConsecutiveSegments(records: SettlementRecord[]): SettlementRecord[][] {
  const sorted = [...records].sort((a, b) => monthToIndex(a.incomeTime) - monthToIndex(b.incomeTime));
  const segments: SettlementRecord[][] = [];
  let current: SettlementRecord[] = [];
  for (const r of sorted) {
    if (current.length === 0) {
      current.push(r);
      continue;
    }
    const prev = current[current.length - 1];
    if (monthToIndex(r.incomeTime) - monthToIndex(prev.incomeTime) === 1) {
      current.push(r);
    } else {
      segments.push(current);
      current = [r];
    }
  }
  if (current.length) segments.push(current);
  return segments;
}

export interface LetterIncomeRow {
  id: string;
  productName: string;
  period: string;
  revenue: number;
  formula: string;
  settlementAmount: number;
}

export interface LetterRefundRow {
  id: string;
  productName: string;
  period: string;
  refundAmount: number;
  formula: string;
  settlementRefund: number;
}

export function buildLetterIncomeRows(
  records: SettlementRecord[],
  getGameName: (id: string) => string,
  formatFormula: (text?: string) => string,
): LetterIncomeRow[] {
  const rows: LetterIncomeRow[] = [];
  for (const group of groupByProduct(records, getGameName)) {
    for (const segment of splitConsecutiveSegments(group.records)) {
      const times = segment.map((s) => s.incomeTime);
      rows.push({
        id: segment.map((s) => s.id).join('+'),
        productName: group.productName,
        period: formatLetterPeriodRange(times),
        revenue: segment.reduce((sum, s) => sum + s.grossRevenue, 0),
        formula: formatFormula(segment[0].formulaText),
        settlementAmount: segment.reduce((sum, s) => sum + s.settlementIncome, 0),
      });
    }
  }
  return rows;
}

export function buildLetterRefundRows(
  records: SettlementRecord[],
  getGameName: (id: string) => string,
  formatFormula: (text?: string) => string,
): LetterRefundRow[] {
  const rows: LetterRefundRow[] = [];
  for (const group of groupByProduct(records, getGameName)) {
    for (const segment of splitConsecutiveSegments(group.records)) {
      const times = segment.map((s) => s.incomeTime);
      rows.push({
        id: segment.map((s) => s.id).join('+'),
        productName: group.productName,
        period: formatLetterPeriodRange(times),
        refundAmount: segment.reduce((sum, s) => sum + s.grossRevenue, 0),
        formula: formatFormula(segment[0].formulaText),
        settlementRefund: segment.reduce((sum, s) => sum + s.settlementIncome, 0),
      });
    }
  }
  return rows;
}

/** 结算函：⑤ 与剩余未抵扣预付分成（基于厂商「剩余未抵扣分成款」） */
export function calcLetterPrepaymentDeduction(
  vendor: Vendor | undefined,
  vendorId: string,
  payments: PaymentRequest[],
  incomeTotal: number,
  refundTotal: number,
): { deduction: number; remainingUndeducted: number; payAmount: number } {
  const net = Math.round((incomeTotal - refundTotal) * 100) / 100;
  const { remainingPrepayment: vendorRemaining } = calcVendorPrepaymentSummary(vendor, vendorId, payments);
  const deduction = vendorRemaining - net > 0
    ? net
    : Math.round(vendorRemaining * 100) / 100;
  const remainingUndeducted = Math.round((vendorRemaining - deduction) * 100) / 100;
  const payAmount = Math.round((net - deduction) * 100) / 100;
  return { deduction, remainingUndeducted, payAmount };
}
