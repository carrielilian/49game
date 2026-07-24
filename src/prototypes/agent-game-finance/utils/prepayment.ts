import type { Game, GamePaymentRequest } from '../data/types';
import { isPaidPayment } from './payment';

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
