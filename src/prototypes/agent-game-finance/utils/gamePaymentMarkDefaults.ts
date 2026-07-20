import type { Contract, ContractCurrency, Game, Vendor } from '../data/types';
import { resolvePrepaymentCurrency } from './currencySnapshot';

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
  vendorCurrency: ContractCurrency;
  paymentCurrency: ContractCurrency;
  exchangeRate: number;
}

export interface GameMarkPaymentDefaults {
  actualAmount: number;
  actualAmountUsd?: number;
}

export function calcGameMarkPaymentDefaults(input: GameMarkPaymentDefaultsInput): GameMarkPaymentDefaults {
  const {
    pendingAmount,
    prepayment,
    remainingPrepayment,
    vendorCurrency,
    paymentCurrency,
    exchangeRate,
  } = input;
  const pending = round2(pendingAmount);
  const remaining = round2(remainingPrepayment);
  const rate = exchangeRate;

  // 预付分成款 ≤ 0
  if (prepayment <= 0) {
    if (paymentCurrency === '美金' && rate > 0) {
      return {
        actualAmount: pending,
        actualAmountUsd: nonNegative(pending / rate),
      };
    }
    return { actualAmount: pending };
  }

  // 预付分成款 > 0，厂商支付币种 = 人民币
  if (vendorCurrency === '人民币') {
    const net = nonNegative(pending - remaining);
    if (paymentCurrency === '美金' && rate > 0) {
      return {
        actualAmount: net,
        actualAmountUsd: nonNegative(net / rate),
      };
    }
    return { actualAmount: net };
  }

  // 预付分成款 > 0，厂商支付币种 = 美金
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
    vendorCurrency: resolvePrepaymentCurrency(game, contract) ?? '人民币',
    paymentCurrency: game?.sharePaymentCurrency ?? '人民币',
    exchangeRate,
  });
}
