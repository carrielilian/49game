import type { Contract, ContractCurrency, Game, GamePaymentRequest } from '../data/types';
import { isPaidPayment } from './payment';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 申请成功时直接抵扣；美金合同先用申请汇率把人民币待付折算为美金。 */
export function calcApplyPrepaymentDeduction(
  pendingAmount: number,
  remainingPrepayment: number,
  contractPaymentCurrency: ContractCurrency,
  exchangeRate: number,
): number {
  if (remainingPrepayment <= 0 || pendingAmount <= 0) return 0;
  const deductibleBase = contractPaymentCurrency === '美金'
    ? (exchangeRate > 0 ? pendingAmount / exchangeRate : 0)
    : pendingAmount;
  return round2(Math.min(Math.max(deductibleBase, 0), remainingPrepayment));
}

/** 已抵扣分成款 = 历史已抵扣 + 历次付款申请直接抵扣；最大不超过预付分成款。 */
export function calcDeductedPrepayment(
  prepayment: number,
  appliedDeductionSum: number,
  historicalDeduction: number,
): number {
  const consumed = appliedDeductionSum + historicalDeduction;
  const net = prepayment - consumed;
  if (net <= 0) return round2(prepayment);
  return round2(consumed);
}

/** 剩余未抵扣分成款 */
export function calcRemainingUndeductedPrepayment(prepayment: number, deducted: number): number {
  const diff = prepayment - deducted;
  if (diff > 0) return Math.round(diff * 100) / 100;
  return 0;
}

export function isPaidPrepaymentMaintained(contract?: Contract): boolean {
  return contract?.paidPrepayment != null && !Number.isNaN(contract.paidPrepayment);
}

export function getGamePrepayment(_game?: Game, contract?: Contract): number {
  if (!isPaidPrepaymentMaintained(contract)) return 0;
  return contract?.paidPrepayment ?? 0;
}

/** 历史已抵扣分成款不能大于已付预付分成款；未维护已付金额时按 0 校验。 */
export function isHistoricalDeductionWithinPaidPrepayment(
  historicalDeduction: number,
  contract?: Contract,
): boolean {
  const paidPrepayment = isPaidPrepaymentMaintained(contract)
    ? contract?.paidPrepayment ?? 0
    : 0;
  return historicalDeduction <= paidPrepayment;
}

export function getGameHistoricalDeduction(game?: Game): number {
  return game?.historicalDeduction ?? 0;
}

function getAppliedPrepaymentDeduction(payment: GamePaymentRequest): number {
  const explicit = payment.prepaymentDeductionAmount
    ?? payment.applySnapshot?.prepaymentDeductionAmount;
  if (explicit != null && Number.isFinite(explicit)) return explicit;
  // 兼容缺少显式抵扣字段、但已有申请快照的旧数据。
  if (payment.applySnapshot && isPaidPayment(payment.status)) {
    return calcApplyPrepaymentDeduction(
      payment.pendingAmount,
      payment.applySnapshot.remainingPrepayment,
      payment.applySnapshot.contractPaymentCurrency,
      payment.applySnapshot.exchangeRate,
    );
  }
  // 更早的旧已付款数据没有申请快照，只能沿用人民币待付金额作为兼容值。
  return isPaidPayment(payment.status) ? payment.pendingAmount : 0;
}

export function sumGameAppliedPrepaymentDeduction(
  gameId: string,
  payments: GamePaymentRequest[],
): number {
  return payments
    .filter((payment) => payment.gameId === gameId)
    .reduce((sum, payment) => sum + getAppliedPrepaymentDeduction(payment), 0);
}

export function calcGamePrepaymentSummary(
  game: Game | undefined,
  contract: Contract | undefined,
  gameId: string,
  payments: GamePaymentRequest[],
) {
  const prepayment = getGamePrepayment(game, contract);
  const historicalDeduction = getGameHistoricalDeduction(game);
  const appliedDeductionSum = sumGameAppliedPrepaymentDeduction(gameId, payments);
  const deductedPrepayment = calcDeductedPrepayment(prepayment, appliedDeductionSum, historicalDeduction);
  const remainingPrepayment = calcRemainingUndeductedPrepayment(prepayment, deductedPrepayment);
  return {
    prepayment,
    historicalDeduction,
    appliedDeductionSum,
    deductedPrepayment,
    remainingPrepayment,
  };
}

export function isGamePrepaymentMissing(contract?: Contract): boolean {
  const contractIncludesPrepayment = contract?.cooperationContents.includes('预付分成款') ?? false;
  return contractIncludesPrepayment && !isPaidPrepaymentMaintained(contract);
}
