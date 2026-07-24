import type { Game, GamePaymentRequest, SettlementRecord, GameBalance } from '../data/types';
import {
  calcDeductedPrepayment,
  calcGamePrepaymentSummary,
  calcRemainingUndeductedPrepayment,
  getGameHistoricalDeduction,
  getGamePrepayment,
  sumGamePaidActualAmount,
} from './prepayment';

/** 申请付款状态为「未申请」（未纳入付款申请）的已结算记录 */
function isUnappliedSettlement(s: SettlementRecord): boolean {
  return s.settled && s.paymentApplyStatus === '未申请';
}

/** 游戏收入各字段口径，按 gameId 聚合 */
export function deriveGameBalances(
  settlements: SettlementRecord[],
  games: Game[],
  gamePayments: GamePaymentRequest[],
): GameBalance[] {
  return games.map((g) => {
    const gameSettled = settlements.filter((s) => s.gameId === g.id && s.settled);
    const totalIncome = gameSettled
      .filter((s) => s.type === 'internal' || s.type === 'external')
      .reduce((sum, s) => sum + s.settlementIncome, 0);
    const totalRefund = gameSettled
      .filter((s) => s.type === 'refund')
      .reduce((sum, s) => sum + s.settlementIncome, 0);

    const internalIncome = gameSettled
      .filter((s) => s.type === 'internal' && isUnappliedSettlement(s))
      .reduce((sum, s) => sum + s.settlementIncome, 0);
    const externalIncome = gameSettled
      .filter((s) => s.type === 'external' && isUnappliedSettlement(s))
      .reduce((sum, s) => sum + s.settlementIncome, 0);
    const unappliedRefund = gameSettled
      .filter((s) => s.type === 'refund' && isUnappliedSettlement(s))
      .reduce((sum, s) => sum + s.settlementIncome, 0);

    const balance = Math.round((internalIncome + externalIncome - unappliedRefund) * 100) / 100;
    const accountTotalIncome = Math.round((totalIncome - totalRefund) * 100) / 100;

    const { prepayment, deductedPrepayment, remainingPrepayment } = calcGamePrepaymentSummary(g, g.id, gamePayments);

    return {
      gameId: g.id,
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

export { calcDeductedPrepayment, calcRemainingUndeductedPrepayment, getGamePrepayment, getGameHistoricalDeduction, sumGamePaidActualAmount };
