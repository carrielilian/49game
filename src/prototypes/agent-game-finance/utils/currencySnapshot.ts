import type { Contract, ContractCurrency, Game } from '../data/types';
import { calcContractPaymentTotal } from './contractLog';

export function withCurrencyOnFirstSave(
  existingCurrency: ContractCurrency | undefined,
  sourceCurrency: ContractCurrency | undefined,
): ContractCurrency | undefined {
  if (existingCurrency) return existingCurrency;
  return sourceCurrency;
}

export function resolveContractCurrency(
  contract: Contract | undefined,
): ContractCurrency | undefined {
  return contract?.currency;
}

export function resolvePrepaymentCurrency(
  entity: Pick<Game, 'prepaymentCurrency'> | undefined,
  contract: Contract | undefined,
): ContractCurrency | undefined {
  return entity?.prepaymentCurrency ?? contract?.currency;
}

/** 【标记付款】预付分成款与合同约定金额统一使用合同支付币种。 */
export function resolveMarkPaymentContractCurrency(
  _entity: Pick<Game, 'prepaymentCurrency'> | undefined,
  contract: Contract | undefined,
): ContractCurrency {
  return resolveContractCurrency(contract) ?? '人民币';
}

export function sumContractPaymentsByCurrency(
  gameIds: string[],
  contractMap: Map<string, Contract>,
): Partial<Record<ContractCurrency, number>> {
  const totals: Partial<Record<ContractCurrency, number>> = {};
  for (const gameId of gameIds) {
    const contract = contractMap.get(gameId);
    if (!contract?.currency) continue;
    const currency = contract.currency;
    totals[currency] = (totals[currency] ?? 0) + calcContractPaymentTotal(contract);
  }
  return totals;
}
