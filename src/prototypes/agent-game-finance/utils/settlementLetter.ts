import type { ContractCurrency, Game, GamePaymentRequest, PaymentRequest, SettlementRecord, Vendor } from '../data/types';
import { calcGamePrepaymentSummary, calcVendorPrepaymentSummary } from './prepayment';

/** 结算函汇率行：付款币种=美金，或（支付币种=美金 且 申请付款时 remaining>0） */
export function resolveLetterShowExchangeRate(
  sharePaymentCurrency: ContractCurrency,
  contractPaymentCurrency: ContractCurrency,
  remainingPrepayment: number,
): boolean {
  if (sharePaymentCurrency === '美金') return true;
  if (contractPaymentCurrency === '美金' && remainingPrepayment > 0) return true;
  return false;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface LetterPrepaymentDeductionResult {
  deduction: number;
  remainingUndeducted: number;
  payAmount: number;
}

/**
 * 结算函「结算/抵扣金额」与「剩余未抵扣预付分成款」。
 * remaining > 0 时：支付币种=美金用 (②−④)/汇率 与 remain 比较；人民币用 (②−④) 与 remain 比较。
 */
export function calcLetterPrepaymentDeductionCore(
  remaining: number,
  incomeTotal: number,
  refundTotal: number,
  contractPaymentCurrency: ContractCurrency,
  exchangeRate: number,
): LetterPrepaymentDeductionResult {
  const net = round2(incomeTotal - refundTotal);
  const remain = round2(remaining);

  if (remain <= 0) {
    return { deduction: 0, remainingUndeducted: 0, payAmount: net };
  }

  if (contractPaymentCurrency === '美金' && exchangeRate > 0) {
    const netUsd = round2(net / exchangeRate);
    if (netUsd - remain >= 0) {
      return {
        deduction: remain,
        remainingUndeducted: 0,
        payAmount: round2(net - remain * exchangeRate),
      };
    }
    return {
      deduction: netUsd,
      remainingUndeducted: round2(remain - netUsd),
      payAmount: round2(net - netUsd * exchangeRate),
    };
  }

  if (net - remain >= 0) {
    return {
      deduction: remain,
      remainingUndeducted: 0,
      payAmount: round2(net - remain),
    };
  }
  return {
    deduction: net,
    remainingUndeducted: round2(remain - net),
    payAmount: 0,
  };
}

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
  contractPaymentCurrency: ContractCurrency,
  exchangeRate: number,
  excludePaymentId?: string,
): LetterPrepaymentDeductionResult {
  const scopedPayments = excludePaymentId
    ? payments.filter((p) => p.id !== excludePaymentId)
    : payments;
  const { remainingPrepayment } = calcVendorPrepaymentSummary(vendor, vendorId, scopedPayments);
  return calcLetterPrepaymentDeductionCore(
    remainingPrepayment,
    incomeTotal,
    refundTotal,
    contractPaymentCurrency,
    exchangeRate,
  );
}

/** 游戏维度结算函：⑤ 基于游戏「剩余未抵扣分成款」 */
export function calcGameLetterPrepaymentDeduction(
  game: Game | undefined,
  gameId: string,
  payments: GamePaymentRequest[],
  incomeTotal: number,
  refundTotal: number,
  contractPaymentCurrency: ContractCurrency,
  exchangeRate: number,
  excludePaymentId?: string,
): LetterPrepaymentDeductionResult {
  const scopedPayments = excludePaymentId
    ? payments.filter((p) => p.id !== excludePaymentId)
    : payments;
  const { remainingPrepayment } = calcGamePrepaymentSummary(game, gameId, scopedPayments);
  return calcLetterPrepaymentDeductionCore(
    remainingPrepayment,
    incomeTotal,
    refundTotal,
    contractPaymentCurrency,
    exchangeRate,
  );
}
