import type {
  Contract,
  ContractCurrency,
  ExchangeRateRecord,
  Game,
  GamePaymentRequest,
  PaymentRequest,
  SettlementLetterSnapshot,
  SettlementRecord,
  Vendor,
} from '../data/types';
import { getExchangeRateByApplyTime } from './exchangeRate';
import { resolveGameMarkPaymentDefaults } from './gamePaymentMarkDefaults';
import { calcGamePrepaymentSummary, calcVendorPrepaymentSummary } from './prepayment';
import { displaySettlementFormula } from './settlement';
import {
  buildLetterIncomeRows,
  buildLetterRefundRows,
  calcGameLetterPrepaymentDeduction,
  calcLetterPrepaymentDeduction,
  type LetterIncomeRow,
  type LetterRefundRow,
} from './settlementLetter';

function formatLetterFormula(formulaText?: string, marker: '①' | '③' = '①'): string {
  const expr = displaySettlementFormula(formulaText);
  if (expr === '-') return '-';
  return expr.replace('待结算金额', marker);
}

export interface BuildSettlementLetterSnapshotInput {
  vendorId: string;
  amount: number;
  settlementIds?: string[];
  applyTime?: string;
  gameId?: string;
  vendor?: Vendor;
  game?: Game;
  contract?: Contract;
  settlements: SettlementRecord[];
  payments: PaymentRequest[];
  gamePayments: GamePaymentRequest[];
  exchangeRates: ExchangeRateRecord[];
  games: Game[];
  getGameName: (id: string) => string;
  /** 标记已付款时写入表单中的实际付款金额（优先于实时计算） */
  letterPayAmountOverride?: number;
}

function buildLetterRows(input: BuildSettlementLetterSnapshotInput): {
  incomeRows: LetterIncomeRow[];
  refundRows: LetterRefundRow[];
} {
  const { vendorId, amount, settlementIds, gameId, games, getGameName, settlements } = input;
  const linked = settlementIds?.length
    ? settlements.filter((s) => settlementIds.includes(s.id) && s.settled)
    : [];

  if (linked.length > 0) {
    const incomeRecords = linked.filter((s) => s.type !== 'refund');
    const refundRecords = linked.filter((s) => s.type === 'refund');
    return {
      incomeRows: buildLetterIncomeRows(incomeRecords, getGameName, (t) => formatLetterFormula(t, '①')),
      refundRows: buildLetterRefundRows(refundRecords, getGameName, (t) => formatLetterFormula(t, '③')),
    };
  }

  const fallbackGame = gameId ? games.find((g) => g.id === gameId) : games.find((g) => g.vendorId === vendorId);
  if (!fallbackGame) return { incomeRows: [], refundRows: [] };

  return {
    incomeRows: [{
      id: 'fallback',
      productName: `《${getGameName(fallbackGame.id)}》快爆付费`,
      period: '2025.06',
      revenue: amount,
      formula: '①* (1-5%-0%) *50%',
      settlementAmount: amount,
    }],
    refundRows: [],
  };
}

export function buildSettlementLetterSnapshot(input: BuildSettlementLetterSnapshotInput): SettlementLetterSnapshot {
  const {
    vendorId,
    amount,
    applyTime,
    gameId,
    vendor,
    game,
    contract,
    payments,
    gamePayments,
    exchangeRates,
    letterPayAmountOverride,
  } = input;

  const isGameLetter = Boolean(gameId);
  const { incomeRows, refundRows } = buildLetterRows(input);
  const incomeTotal = incomeRows.reduce((sum, row) => sum + row.settlementAmount, 0);
  const refundTotal = refundRows.reduce((sum, row) => sum + row.settlementRefund, 0);
  const netTotal = Math.round((incomeTotal - refundTotal) * 100) / 100;
  const paymentCurrency: ContractCurrency = game?.sharePaymentCurrency ?? vendor?.sharePaymentCurrency ?? '人民币';
  const showExchangeRate = paymentCurrency === '美金';
  const exchangeRate = (applyTime ? getExchangeRateByApplyTime(applyTime, exchangeRates) : undefined) ?? 7.21;

  const prepaymentSummary = isGameLetter && gameId
    ? calcGamePrepaymentSummary(game, gameId, gamePayments)
    : calcVendorPrepaymentSummary(vendor, vendorId, payments);
  const showPrepaymentDeductionRows = prepaymentSummary.remainingPrepayment > 0;
  const { deduction: prepaidDeduction, remainingUndeducted, payAmount: formulaPayAmount } = isGameLetter && gameId
    ? calcGameLetterPrepaymentDeduction(game, gameId, gamePayments, incomeTotal, refundTotal)
    : calcLetterPrepaymentDeduction(vendor, vendorId, payments, incomeTotal, refundTotal);

  let letterPayAmount = formulaPayAmount;
  if (letterPayAmountOverride !== undefined) {
    letterPayAmount = letterPayAmountOverride;
  } else if (isGameLetter && gameId) {
    const defaults = resolveGameMarkPaymentDefaults(
      amount,
      game,
      vendor,
      contract,
      prepaymentSummary.remainingPrepayment,
      exchangeRate,
    );
    letterPayAmount = paymentCurrency === '美金'
      ? (defaults.actualAmountUsd ?? 0)
      : defaults.actualAmount;
  }

  return {
    incomeRows,
    refundRows,
    incomeTotal,
    refundTotal,
    netTotal,
    paymentCurrency,
    showExchangeRate,
    exchangeRate: showExchangeRate ? exchangeRate : undefined,
    showPrepaymentDeductionRows,
    prepaidDeduction: showPrepaymentDeductionRows ? prepaidDeduction : undefined,
    remainingUndeducted: showPrepaymentDeductionRows ? remainingUndeducted : undefined,
    letterPayAmount,
  };
}
