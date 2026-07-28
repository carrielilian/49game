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
import { getExchangeRateByApplyTime } from './exchangeRate';

export function formatVendorReceiptInfo(vendor?: Vendor): string {
  if (!vendor) return '';
  const lines = [
    `开户名称：${vendor.accountName}`,
    `开户银行：${vendor.bank}`,
    `开户银行所在地：${vendor.bankLocation}`,
    `支行名称：${vendor.branch}`,
    `银行卡号：${vendor.cardNumber.replace(/\s+/g, '')}`,
  ];
  if (vendor.bankCode?.trim()) lines.splice(2, 0, `银行代码：${vendor.bankCode.trim()}`);
  return lines.join('\n');
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
  exchangeRateDate?: string;
  exchangeRate?: number;
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
    exchangeRateDate,
    exchangeRate,
  } = input;

  const prepaymentSummary = calcGamePrepaymentSummary(game, contract, gameId, gamePayments);
  const lockedExchangeRate =
    exchangeRate ?? getExchangeRateByApplyTime(applyTime, exchangeRates) ?? 7.21;
  const lockedExchangeRateDate = exchangeRateDate ?? applyTime.slice(0, 10);

  const applySnapshot: GamePaymentApplySnapshot = {
    gameId,
    gameName: getGameName(gameId),
    gameEnglishName: game.englishName?.trim() ?? '',
    contractPaymentCurrency: resolveMarkPaymentContractCurrency(game, contract),
    vendorId: vendor.id,
    vendorName: vendor.name,
    receiptInfo: formatVendorReceiptInfo(vendor),
    prepayment: prepaymentSummary.prepayment,
    remainingPrepayment: prepaymentSummary.remainingPrepayment,
    sharePaymentCompany: game.sharePaymentCompany ?? '',
    sharePaymentCurrency: game.sharePaymentCurrency ?? '人民币',
    exchangeRateDate: lockedExchangeRateDate,
    exchangeRate: lockedExchangeRate,
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
    exchangeRateOverride: lockedExchangeRate,
  });

  return { applySnapshot, letterSnapshot };
}
