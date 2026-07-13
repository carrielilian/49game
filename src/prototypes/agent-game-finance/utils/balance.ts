import type { Contract, Game, PaymentRequest, SettlementRecord, Vendor, VendorBalance } from '../data/types';

/** 申请付款状态为「未申请」（未纳入付款申请）的已结算记录 */
function isUnappliedSettlement(s: SettlementRecord): boolean {
  return s.settled && s.paymentApplyStatus === '未申请';
}

/** 厂商收入各字段口径（见 ui-spec「厂商收入」） */
export function deriveBalances(
  settlements: SettlementRecord[],
  vendors: Vendor[],
  contracts: Contract[],
  games: Game[],
  _payments: PaymentRequest[],
): VendorBalance[] {
  return vendors.map((v) => {
    const vendorSettled = settlements.filter((s) => s.vendorId === v.id && s.settled);
    // 累计收入：内部 + 外部收入结算「结算收入」合计（已结算）
    const totalIncome = vendorSettled
      .filter((s) => s.type === 'internal' || s.type === 'external')
      .reduce((sum, s) => sum + s.settlementIncome, 0);
    // 累计退款：内部退款结算「结算退款」合计（已结算，存于 settlementIncome）
    const totalRefund = vendorSettled
      .filter((s) => s.type === 'refund')
      .reduce((sum, s) => sum + s.settlementIncome, 0);
    const prepayment = contracts
      .filter((c) => games.find((g) => g.id === c.gameId)?.vendorId === v.id)
      .reduce((s, c) => s + c.prepayment, 0);

    const internalIncome = vendorSettled
      .filter((s) => s.type === 'internal' && isUnappliedSettlement(s))
      .reduce((sum, s) => sum + s.settlementIncome, 0);
    const externalIncome = vendorSettled
      .filter((s) => s.type === 'external' && isUnappliedSettlement(s))
      .reduce((sum, s) => sum + s.settlementIncome, 0);
    const unappliedRefund = vendorSettled
      .filter((s) => s.type === 'refund' && isUnappliedSettlement(s))
      .reduce((sum, s) => sum + s.settlementIncome, 0);

    // 账户余额 = 内外部未申请结算收入 − 退款未申请结算退款 − 预付分成款
    const balance = Math.round((internalIncome + externalIncome - unappliedRefund - prepayment) * 100) / 100;
    // 账户总收入 = 累计收入 − 累计退款
    const accountTotalIncome = Math.round((totalIncome - totalRefund) * 100) / 100;

    return {
      vendorId: v.id,
      balance,
      accountTotalIncome,
      prepayment,
      totalIncome,
      totalRefund,
    };
  });
}

export function calcVendorBalanceFromSettlements(
  settlements: SettlementRecord[],
  vendorId: string,
  prepayment = 0,
): number {
  const vendorSettled = settlements.filter((s) => s.vendorId === vendorId && s.settled);
  const internalIncome = vendorSettled.filter((s) => s.type === 'internal' && isUnappliedSettlement(s)).reduce((sum, s) => sum + s.settlementIncome, 0);
  const externalIncome = vendorSettled.filter((s) => s.type === 'external' && isUnappliedSettlement(s)).reduce((sum, s) => sum + s.settlementIncome, 0);
  const unappliedRefund = vendorSettled.filter((s) => s.type === 'refund' && isUnappliedSettlement(s)).reduce((sum, s) => sum + s.settlementIncome, 0);
  return Math.round((internalIncome + externalIncome - unappliedRefund - prepayment) * 100) / 100;
}
