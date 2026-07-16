import type { Game, GamePaymentRequest, PaymentRequest, Vendor } from '../data/types';
import { isPaidPayment } from './payment';

export function getVendorPrepayment(vendor?: Vendor): number {
  return vendor?.prepayment ?? 0;
}

export function getVendorHistoricalDeduction(vendor?: Vendor): number {
  return vendor?.historicalDeduction ?? 0;
}

/** 当前厂商「已付款」记录的待付款金额之和 */
export function sumVendorPaidActualAmount(vendorId: string, payments: PaymentRequest[]): number {
  return payments
    .filter((p) => p.vendorId === vendorId && isPaidPayment(p.status))
    .reduce((sum, p) => sum + p.pendingAmount, 0);
}

/** 已抵扣分成款 = 已付款待付款金额之和 + 历史已抵扣分成款；若预付分成款 − 上述合计 ≤ 0，则取预付分成款 */
export function calcDeductedPrepayment(
  prepayment: number,
  paidActualSum: number,
  historicalDeduction: number,
): number {
  const consumed = paidActualSum + historicalDeduction;
  const net = prepayment - consumed;
  if (net <= 0) return Math.round(prepayment * 100) / 100;
  return Math.round(consumed * 100) / 100;
}

/** 剩余未抵扣分成款 */
export function calcRemainingUndeductedPrepayment(prepayment: number, deducted: number): number {
  const diff = prepayment - deducted;
  if (diff > 0) return Math.round(diff * 100) / 100;
  return 0;
}

export function calcVendorPrepaymentSummary(
  vendor: Vendor | undefined,
  vendorId: string,
  payments: PaymentRequest[],
) {
  const prepayment = getVendorPrepayment(vendor);
  const historicalDeduction = getVendorHistoricalDeduction(vendor);
  const paidActualSum = sumVendorPaidActualAmount(vendorId, payments);
  const deductedPrepayment = calcDeductedPrepayment(prepayment, paidActualSum, historicalDeduction);
  const remainingPrepayment = calcRemainingUndeductedPrepayment(prepayment, deductedPrepayment);
  return { prepayment, historicalDeduction, paidActualSum, deductedPrepayment, remainingPrepayment };
}

export function isVendorPrepaymentMissing(vendor?: Vendor): boolean {
  return !vendor || vendor.prepayment == null || Number.isNaN(vendor.prepayment);
}

export function getGamePrepayment(game?: Game): number {
  return game?.prepayment ?? 0;
}

export function getGameHistoricalDeduction(game?: Game): number {
  return game?.historicalDeduction ?? 0;
}

export function sumGamePaidActualAmount(gameId: string, payments: GamePaymentRequest[]): number {
  return payments
    .filter((p) => p.gameId === gameId && isPaidPayment(p.status))
    .reduce((sum, p) => sum + p.pendingAmount, 0);
}

export function calcGamePrepaymentSummary(
  game: Game | undefined,
  gameId: string,
  payments: GamePaymentRequest[],
) {
  const prepayment = getGamePrepayment(game);
  const historicalDeduction = getGameHistoricalDeduction(game);
  const paidActualSum = sumGamePaidActualAmount(gameId, payments);
  const deductedPrepayment = calcDeductedPrepayment(prepayment, paidActualSum, historicalDeduction);
  const remainingPrepayment = calcRemainingUndeductedPrepayment(prepayment, deductedPrepayment);
  return { prepayment, historicalDeduction, paidActualSum, deductedPrepayment, remainingPrepayment };
}

export function isGamePrepaymentMissing(game?: Game): boolean {
  return !game || game.prepayment == null || Number.isNaN(game.prepayment);
}
