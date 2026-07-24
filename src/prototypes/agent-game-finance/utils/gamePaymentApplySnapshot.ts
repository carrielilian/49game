import type {
  Contract,
  ExchangeRateRecord,
  Game,
  GamePaymentApplySnapshot,
  GamePaymentRequest,
  SettlementLetterSnapshot,
  SettlementRecord,
  Vendor,
} from '../data/types';
import { resolveMarkPaymentContractCurrency } from './currencySnapshot';
import { calcGamePrepaymentSummary } from './prepayment';
import { buildSettlementLetterSnapshot } from './settlementLetterSnapshot';

export function formatVendorReceiptInfo(vendor?: Vendor): string {
  if (!vendor) return '';
  return [
    `开户名称：${vendor.accountName}`,
    `开户银行：${vendor.bank}`,
    `开户银行所在地：${vendor.bankLocation}`,
    `支行名称：${vendor.branch}`,
    `银行卡号：${vendor.cardNumber.replace(/\s+/g, '')}`,
  ].join('\n');
}

export interface BuildGamePaymentApplySnapshotInput {
  gameId: string;
  pendingAmount: number;
  applyTime: string;
  settlementIds: string[];
  game: Game;
  vendor: Vendor;
  contract?: Contract;
  settlements: SettlementRecord[];
  gamePayments: GamePaymentRequest[];
  exchangeRates: ExchangeRateRecord[];
  games: Game[];
  getGameName: (id: string) => string;
}

export function buildGamePaymentApplySnapshot(
  input: BuildGamePaymentApplySnapshotInput,
): { applySnapshot: GamePaymentApplySnapshot; letterSnapshot: SettlementLetterSnapshot } {
  const {
    gameId,
    pendingAmount,
    applyTime,
    settlementIds,
    game,
    vendor,
    contract,
    settlements,
    gamePayments,
    exchangeRates,
    games,
    getGameName,
  } = input;

  const prepaymentSummary = calcGamePrepaymentSummary(game, gameId, gamePayments);

  const applySnapshot: GamePaymentApplySnapshot = {
    gameId,
    gameName: getGameName(gameId),
    contractPaymentCurrency: resolveMarkPaymentContractCurrency(game, contract),
    vendorId: vendor.id,
    vendorName: vendor.name,
    receiptInfo: formatVendorReceiptInfo(vendor),
    prepayment: prepaymentSummary.prepayment,
    remainingPrepayment: prepaymentSummary.remainingPrepayment,
    sharePaymentCompany: game.sharePaymentCompany ?? '',
    sharePaymentCurrency: game.sharePaymentCurrency ?? '人民币',
    sharePaymentAccount: game.sharePaymentAccount ?? '',
    applyTime,
  };

  const letterSnapshot = buildSettlementLetterSnapshot({
    vendorId: vendor.id,
    gameId,
    amount: pendingAmount,
    settlementIds,
    applyTime,
    vendor,
    game,
    contract,
    settlements,
    gamePayments,
    exchangeRates,
    games,
    getGameName,
  });

  return { applySnapshot, letterSnapshot };
}
