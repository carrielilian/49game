import type { Contract, ContractCurrency, Game, GamePaymentApplySnapshot, Vendor } from '../data/types';
import { resolveMarkPaymentContractCurrency } from './currencySnapshot';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 若 ≤ 0 则为 0，否则保留两位小数 */
function nonNegative(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return round2(n);
}

export interface GameMarkPaymentDefaultsInput {
  pendingAmount: number;
  prepayment: number;
  remainingPrepayment: number;
  contractPaymentCurrency: ContractCurrency;
  paymentCurrency: ContractCurrency;
  exchangeRate: number;
}

export interface GameMarkPaymentDefaults {
  actualAmount: number;
  actualAmountUsd?: number;
}

/**
 * 【标记付款】三种自动填充：
 * 1. 无预付 → ￥=待付；付款美金时 $=待付÷汇率
 * 2. 有预付 + 合同人民币 → ￥=net，$=net÷汇率
 * 3. 有预付 + 合同美金 → ￥=usdNet×汇率，$=usdNet
 */
export function calcGameMarkPaymentDefaults(input: GameMarkPaymentDefaultsInput): GameMarkPaymentDefaults {
  const {
    pendingAmount,
    prepayment,
    remainingPrepayment,
    contractPaymentCurrency,
    paymentCurrency,
    exchangeRate,
  } = input;
  const pending = round2(pendingAmount);
  const remaining = round2(remainingPrepayment);
  const rate = exchangeRate;

  if (prepayment <= 0) {
    const result: GameMarkPaymentDefaults = { actualAmount: pending };
    if (paymentCurrency === '美金' && rate > 0) {
      result.actualAmountUsd = nonNegative(pending / rate);
    }
    return result;
  }

  if (contractPaymentCurrency === '人民币') {
    const net = nonNegative(pending - remaining);
    const result: GameMarkPaymentDefaults = { actualAmount: net };
    if (rate > 0) {
      result.actualAmountUsd = nonNegative(net / rate);
    }
    return result;
  }

  const usdNet = rate > 0 ? nonNegative(pending / rate - remaining) : 0;
  return {
    actualAmountUsd: usdNet,
    actualAmount: rate > 0 ? nonNegative(usdNet * rate) : 0,
  };
}

export function resolveGameMarkPaymentDefaults(
  pendingAmount: number,
  game: Game | undefined,
  vendor: Vendor | undefined,
  contract: Contract | undefined,
  remainingPrepayment: number,
  exchangeRate: number,
): GameMarkPaymentDefaults {
  return calcGameMarkPaymentDefaults({
    pendingAmount,
    prepayment: game?.prepayment ?? 0,
    remainingPrepayment,
    contractPaymentCurrency: resolveMarkPaymentContractCurrency(game, contract),
    paymentCurrency: game?.sharePaymentCurrency ?? '人民币',
    exchangeRate,
  });
}

export function resolveGameMarkPaymentDefaultsFromSnapshot(
  pendingAmount: number,
  snapshot: GamePaymentApplySnapshot,
  exchangeRate: number,
): GameMarkPaymentDefaults {
  return calcGameMarkPaymentDefaults({
    pendingAmount,
    prepayment: snapshot.prepayment,
    remainingPrepayment: snapshot.remainingPrepayment,
    contractPaymentCurrency: snapshot.contractPaymentCurrency,
    paymentCurrency: snapshot.sharePaymentCurrency,
    exchangeRate,
  });
}

/** 结算函单行实付：按付款币种取 ￥ 或 $ 对应数值 */
export function resolveLetterPayAmount(
  defaults: GameMarkPaymentDefaults,
  paymentCurrency: ContractCurrency,
): number {
  if (paymentCurrency === '美金') {
    return defaults.actualAmountUsd ?? 0;
  }
  return defaults.actualAmount;
}
