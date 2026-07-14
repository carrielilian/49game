import type { PaymentRequest, SettlementRecord, Vendor, VendorBalance } from '../data/types';
import {
  calcDeductedPrepayment,
  calcRemainingUndeductedPrepayment,
  calcVendorPrepaymentSummary,
  getVendorHistoricalDeduction,
  getVendorPrepayment,
  sumVendorPaidActualAmount,
} from './prepayment';

/** 申请付款状态为「未申请」（未纳入付款申请）的已结算记录 */
function isUnappliedSettlement(s: SettlementRecord): boolean {
  return s.settled && s.paymentApplyStatus === '未申请';
}

/** 厂商收入各字段口径（见 ui-spec「厂商收入」） */
export function deriveBalances(
  settlements: SettlementRecord[],
  vendors: Vendor[],
  payments: PaymentRequest[],
): VendorBalance[] {
  return vendors.map((v) => {
    const vendorSettled = settlements.filter((s) => s.vendorId === v.id && s.settled);
    const totalIncome = vendorSettled
      .filter((s) => s.type === 'internal' || s.type === 'external')
      .reduce((sum, s) => sum + s.settlementIncome, 0);
    const totalRefund = vendorSettled
      .filter((s) => s.type === 'refund')
      .reduce((sum, s) => sum + s.settlementIncome, 0);

    const internalIncome = vendorSettled
      .filter((s) => s.type === 'internal' && isUnappliedSettlement(s))
      .reduce((sum, s) => sum + s.settlementIncome, 0);
    const externalIncome = vendorSettled
      .filter((s) => s.type === 'external' && isUnappliedSettlement(s))
      .reduce((sum, s) => sum + s.settlementIncome, 0);
    const unappliedRefund = vendorSettled
      .filter((s) => s.type === 'refund' && isUnappliedSettlement(s))
      .reduce((sum, s) => sum + s.settlementIncome, 0);

    const balance = Math.round((internalIncome + externalIncome - unappliedRefund) * 100) / 100;
    const accountTotalIncome = Math.round((totalIncome - totalRefund) * 100) / 100;

    const { prepayment, deductedPrepayment, remainingPrepayment } = calcVendorPrepaymentSummary(v, v.id, payments);

    return {
      vendorId: v.id,
      balance,
      accountTotalIncome,
      prepayment,
      deductedPrepayment,
      remainingPrepayment,
      totalIncome,
      totalRefund,
    };
  });
}

export function calcVendorBalanceFromSettlements(
  settlements: SettlementRecord[],
  vendorId: string,
): number {
  const vendorSettled = settlements.filter((s) => s.vendorId === vendorId && s.settled);
  const internalIncome = vendorSettled.filter((s) => s.type === 'internal' && isUnappliedSettlement(s)).reduce((sum, s) => sum + s.settlementIncome, 0);
  const externalIncome = vendorSettled.filter((s) => s.type === 'external' && isUnappliedSettlement(s)).reduce((sum, s) => sum + s.settlementIncome, 0);
  const unappliedRefund = vendorSettled.filter((s) => s.type === 'refund' && isUnappliedSettlement(s)).reduce((sum, s) => sum + s.settlementIncome, 0);
  return Math.round((internalIncome + externalIncome - unappliedRefund) * 100) / 100;
}

export { calcDeductedPrepayment, calcRemainingUndeductedPrepayment, getVendorPrepayment, getVendorHistoricalDeduction, sumVendorPaidActualAmount };
