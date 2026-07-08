import type { Contract, Game, PaymentRequest, SettlementRecord, Vendor, VendorBalance } from '../data/types';

/** 申请付款状态为「未提交」（未纳入付款申请）的已结算记录 */
function isUnappliedSettlement(s: SettlementRecord): boolean {
  return s.settled && s.paymentApplyStatus === '未提交';
}

export function deriveBalances(
  settlements: SettlementRecord[],
  vendors: Vendor[],
  contracts: Contract[],
  games: Game[],
  _payments: PaymentRequest[],
): VendorBalance[] {
  return vendors.map((v) => {
    const vendorSettled = settlements.filter((s) => s.vendorId === v.id && s.settled);
    const income = vendorSettled.filter((s) => s.type !== 'refund').reduce((sum, s) => sum + s.settlementIncome, 0);
    const refund = vendorSettled.filter((s) => s.type === 'refund').reduce((sum, s) => sum + s.settlementIncome, 0);
    const prepayment = contracts.filter((c) => games.find((g) => g.id === c.gameId)?.vendorId === v.id).reduce((s, c) => s + c.prepayment, 0);

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
    const accountTotalIncome = Math.round((income - prepayment - refund) * 100) / 100;

    return {
      vendorId: v.id,
      balance,
      accountTotalIncome,
      prepayment,
      totalIncome: income,
      totalRefund: refund,
    };
  });
}

export function calcVendorBalanceFromSettlements(settlements: SettlementRecord[], vendorId: string): number {
  const vendorSettled = settlements.filter((s) => s.vendorId === vendorId && s.settled);
  const internalIncome = vendorSettled.filter((s) => s.type === 'internal' && isUnappliedSettlement(s)).reduce((sum, s) => sum + s.settlementIncome, 0);
  const externalIncome = vendorSettled.filter((s) => s.type === 'external' && isUnappliedSettlement(s)).reduce((sum, s) => sum + s.settlementIncome, 0);
  const unappliedRefund = vendorSettled.filter((s) => s.type === 'refund' && isUnappliedSettlement(s)).reduce((sum, s) => sum + s.settlementIncome, 0);
  return Math.round((internalIncome + externalIncome - unappliedRefund) * 100) / 100;
}
