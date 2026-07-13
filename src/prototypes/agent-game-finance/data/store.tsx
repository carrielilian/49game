import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  INITIAL_BALANCES,
  INITIAL_CONTRACTS,
  INITIAL_FORMULA_LOGS,
  INITIAL_FORMULAS,
  INITIAL_GAME_LOGS,
  INITIAL_GAMES,
  INITIAL_PAYMENTS,
  INITIAL_SETTLEMENTS,
  INITIAL_VENDORS,
  createEmptyFormula,
} from './mock-data';
import type {
  Contract,
  FormulaConfig,
  FormulaOperationLog,
  Game,
  GameOperationLog,
  ImportPreviewRow,
  PaymentRequest,
  SettlementRecord,
  SettlementType,
  Vendor,
  VendorBalance,
} from './types';
import { deriveBalances } from '../utils/balance';
import type { FinanceCenterRow } from '../utils/financeCenter';
import { calcRecordSettlementIncome, formatDateTime, formatFormulaText, genId } from '../utils/settlement';
import { isFormulaConfigured } from './mock-data';

const VENDOR_ID_BASE = 1001;
const GAME_ID_BASE = 4001;

function nextNumericId(items: { id: string }[], base: number): string {
  const max = items.reduce((m, item) => Math.max(m, Number.parseInt(item.id, 10) || 0), base - 1);
  return String(max + 1);
}

interface InternalSettlementButtonState {
  pullCompleted: boolean;
  settleCompleted: boolean;
}

const INITIAL_INTERNAL_SETTLEMENT_BUTTONS: Record<'internal' | 'refund', InternalSettlementButtonState> = {
  internal: { pullCompleted: false, settleCompleted: false },
  refund: { pullCompleted: false, settleCompleted: false },
};

interface ExternalSettlementButtonState {
  settleCompleted: boolean;
}

const INITIAL_EXTERNAL_SETTLEMENT_BUTTONS: ExternalSettlementButtonState = {
  settleCompleted: false,
};

interface AppState {
  vendors: Vendor[];
  games: Game[];
  contracts: Contract[];
  formulas: FormulaConfig[];
  settlements: SettlementRecord[];
  balances: VendorBalance[];
  payments: PaymentRequest[];
  gameLogs: GameOperationLog[];
  formulaLogs: FormulaOperationLog[];
}

interface AppContextValue extends AppState {
  getVendor: (id: string) => Vendor | undefined;
  getGame: (id: string) => Game | undefined;
  getVendorName: (id: string) => string;
  getGameName: (id: string) => string;
  addVendor: (v: Omit<Vendor, 'id'>) => void;
  updateVendor: (v: Vendor) => void;
  addGame: (g: Omit<Game, 'id'>) => void;
  updateGame: (g: Game) => void;
  updateContract: (c: Contract) => void;
  updateFormula: (f: FormulaConfig, operator?: string) => void;
  addGameLog: (log: Omit<GameOperationLog, 'id'>) => void;
  importExternal: (rows: ImportPreviewRow[]) => void;
  pullInternal: (type: 'internal' | 'refund', rows: FinanceCenterRow[], monthKey: string) => number;
  settleRecords: (ids: string[]) => void;
  applyPayment: (vendorId: string) => boolean;
  markPaid: (paymentId: string, data: Partial<PaymentRequest>) => void;
  recalcBalances: () => void;
  internalSettlementButtons: Record<'internal' | 'refund', InternalSettlementButtonState>;
  setInternalSettlementButtons: (
    type: 'internal' | 'refund',
    state: InternalSettlementButtonState,
  ) => void;
  externalSettlementButtons: ExternalSettlementButtonState;
  setExternalSettlementButtons: (state: ExternalSettlementButtonState) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [vendors, setVendors] = useState(INITIAL_VENDORS);
  const [games, setGames] = useState(INITIAL_GAMES);
  const [contracts, setContracts] = useState(INITIAL_CONTRACTS);
  const [formulas, setFormulas] = useState(INITIAL_FORMULAS);
  const [settlements, setSettlements] = useState(INITIAL_SETTLEMENTS);
  const [balances, setBalances] = useState(INITIAL_BALANCES);
  const [payments, setPayments] = useState(INITIAL_PAYMENTS);
  const [gameLogs, setGameLogs] = useState(INITIAL_GAME_LOGS);
  const [formulaLogs, setFormulaLogs] = useState(INITIAL_FORMULA_LOGS);
  const [internalSettlementButtons, setInternalSettlementButtonsState] = useState(INITIAL_INTERNAL_SETTLEMENT_BUTTONS);
  const [externalSettlementButtons, setExternalSettlementButtonsState] = useState(INITIAL_EXTERNAL_SETTLEMENT_BUTTONS);

  const getVendor = useCallback((id: string) => vendors.find((v) => v.id === id), [vendors]);
  const getGame = useCallback((id: string) => games.find((g) => g.id === id), [games]);
  const getVendorName = useCallback((id: string) => vendors.find((v) => v.id === id)?.name ?? id, [vendors]);
  const getGameName = useCallback((id: string) => games.find((g) => g.id === id)?.onlineName ?? id, [games]);

  const recalcBalances = useCallback(() => {
    setBalances(deriveBalances(settlements, vendors, contracts, games, payments));
  }, [settlements, vendors, contracts, games, payments]);

  useEffect(() => {
    setBalances(deriveBalances(settlements, vendors, contracts, games, payments));
  }, [settlements, vendors, contracts, games, payments]);

  const addVendor = useCallback((v: Omit<Vendor, 'id'>) => {
    setVendors((prev) => {
      const id = nextNumericId(prev, VENDOR_ID_BASE);
      setBalances((bPrev) => [...bPrev, { vendorId: id, balance: 0, accountTotalIncome: 0, prepayment: 0, totalIncome: 0, totalRefund: 0 }]);
      return [...prev, { ...v, id }];
    });
  }, []);

  const updateVendor = useCallback((v: Vendor) => {
    setVendors((prev) => prev.map((x) => (x.id === v.id ? v : x)));
  }, []);

  const addGame = useCallback((g: Omit<Game, 'id'>) => {
    setGames((prev) => {
      const id = nextNumericId(prev, GAME_ID_BASE);
      setContracts((cPrev) => [{
        gameId: id, prepayment: 0, agencyPayment: 0, developmentFee: 0, contractDescription: '', cooperationStatus: g.cooperationStatus,
      }, ...cPrev]);
      setFormulas((fPrev) => [createEmptyFormula(id), ...fPrev]);
      setGameLogs((logs) => [{
        id: genId('GL'), gameId: id, operator: '当前用户', time: new Date().toLocaleString('zh-CN'), action: '添加游戏',
      }, ...logs]);
      return [{ ...g, id }, ...prev];
    });
  }, []);

  const updateGame = useCallback((g: Game) => {
    setGames((prev) => {
      const old = prev.find((x) => x.id === g.id);
      if (old) {
        if (old.operationStatus !== g.operationStatus) {
          setGameLogs((logs) => [...logs, {
            id: genId('GL'), gameId: g.id, operator: '当前用户', time: new Date().toLocaleString('zh-CN'),
            action: '运营状态', status: g.operationStatus,
          }]);
        }
        if (old.cooperationStatus !== g.cooperationStatus) {
          setGameLogs((logs) => [...logs, {
            id: genId('GL'), gameId: g.id, operator: '当前用户', time: new Date().toLocaleString('zh-CN'),
            action: '合作状态', status: g.cooperationStatus,
          }]);
        }
      }
      return prev.map((x) => (x.id === g.id ? g : x));
    });
  }, []);

  const updateContract = useCallback((c: Contract) => {
    setContracts((prev) => prev.map((x) => (x.gameId === c.gameId ? c : x)));
    setGames((prev) => {
      const old = prev.find((x) => x.id === c.gameId);
      if (old && old.cooperationStatus !== c.cooperationStatus) {
        setGameLogs((logs) => [...logs, {
          id: genId('GL'), gameId: c.gameId, operator: '当前用户', time: new Date().toLocaleString('zh-CN'),
          action: '合作状态', status: c.cooperationStatus,
        }]);
      }
      return prev.map((x) => (x.id === c.gameId ? { ...x, cooperationStatus: c.cooperationStatus } : x));
    });
  }, []);

  const updateFormula = useCallback((f: FormulaConfig, operator = '当前用户') => {
    setFormulas((prev) => prev.map((x) => (x.gameId === f.gameId ? f : x)));
    const text = [
      formatFormulaText(f.internalTax, f.internalChannelFee, f.internalShare, '内部渠道'),
      formatFormulaText(f.externalTax, f.externalChannelFee, f.externalShare, '外部渠道'),
    ].join('\n');
    setFormulaLogs((prev) => [...prev, { id: genId('FL'), gameId: f.gameId, operator, time: new Date().toLocaleString('zh-CN'), formulaText: text }]);
  }, []);

  const addGameLog = useCallback((log: Omit<GameOperationLog, 'id'>) => {
    setGameLogs((prev) => [...prev, { ...log, id: genId('GL') }]);
  }, []);

  const importExternal = useCallback((rows: ImportPreviewRow[]) => {
    const now = formatDateTime();
    const newRecords: SettlementRecord[] = rows.map((r) => {
      const game = games.find((g) => g.id === r.gameId);
      const formula = formulas.find((f) => f.gameId === r.gameId);
      const vendor = vendors.find((v) => v.id === game?.vendorId);
      const settlementIncome = r.settlementIncome != null
        ? r.settlementIncome
        : calcRecordSettlementIncome(
            { type: 'external', gameId: r.gameId!, channel: r.channel, settlementAmount: r.pendingAmount, formulaText: r.formulaText! } as SettlementRecord,
            formula,
            vendor,
          );
      return {
        id: genId('S'), type: 'external' as SettlementType, incomeTime: r.incomeTime, gameId: r.gameId!,
        channel: r.channel, grossRevenue: r.pendingAmount, settlementAmount: r.pendingAmount,
        settlementIncome, formulaText: r.formulaText!,
        paymentApplyStatus: '未申请' as const,
        settled: true, vendorId: game?.vendorId ?? '', settlementTime: now,
      };
    });
    setSettlements((prev) => [...newRecords, ...prev]);
  }, [games, formulas, vendors]);

  const pullInternal = useCallback((type: 'internal' | 'refund', rows: FinanceCenterRow[], monthKey: string) => {
    const newRecords: SettlementRecord[] = rows.map((row) => {
      const game = games.find((g) => g.id === row.gameId);
      const f = formulas.find((x) => x.gameId === row.gameId);
      const tax = f?.internalTax ?? 0;
      const fee = f?.internalChannelFee ?? 0;
      const share = f?.internalShare ?? 0;
      const label = type === 'refund' ? '退款' : '内部';
      const formulaText = isFormulaConfigured(f)
        ? formatFormulaText(tax, fee, share, label)
        : '-';
      return {
        id: genId('S'),
        type,
        incomeTime: monthKey,
        gameId: row.gameId,
        channel: row.channel,
        grossRevenue: row.amount,
        settlementAmount: row.amount,
        settlementIncome: 0,
        formulaText,
        paymentApplyStatus: '未申请' as const,
        settled: false,
        vendorId: game?.vendorId ?? '',
      };
    });
    setSettlements((prev) => {
      const kept = prev.filter((s) => !(s.type === type && s.incomeTime === monthKey && !s.settled));
      return [...newRecords, ...kept];
    });
    return newRecords.length;
  }, [games, formulas]);

  const settleRecords = useCallback((ids: string[]) => {
    setSettlements((prev) => prev.map((s) => {
      if (!ids.includes(s.id)) return s;
      const f = formulas.find((x) => x.gameId === s.gameId);
      const vendor = vendors.find((v) => v.id === s.vendorId);
      return {
        ...s,
        settled: true,
        settlementTime: formatDateTime(),
        settlementIncome: calcRecordSettlementIncome(s, f, vendor),
      };
    }));
  }, [formulas, vendors]);

  const applyPayment = useCallback((vendorId: string) => {
    const bal = deriveBalances(settlements, vendors, contracts, games, payments).find((b) => b.vendorId === vendorId);
    if (!bal || bal.balance <= 0) return false;
    setPayments((prev) => [...prev, {
      id: genId('P'), vendorId, pendingAmount: bal.balance, status: '待付款',
      applyTime: new Date().toLocaleString('zh-CN'),
    }]);
    setSettlements((prev) => prev.map((s) =>
      s.vendorId === vendorId && s.settled && s.paymentApplyStatus === '未申请'
        ? { ...s, paymentApplyStatus: '已申请' as const }
        : s,
    ));
    return true;
  }, [settlements, vendors, contracts, games, payments]);

  const markPaid = useCallback((paymentId: string, data: Partial<PaymentRequest>) => {
    setPayments((prev) => prev.map((p) => p.id === paymentId
      ? { ...p, ...data, status: '已付款' as const, payTime: new Date().toLocaleString('zh-CN'), actualAmount: data.actualAmount ?? p.pendingAmount }
      : p));
  }, []);

  const setInternalSettlementButtons = useCallback((
    type: 'internal' | 'refund',
    state: InternalSettlementButtonState,
  ) => {
    setInternalSettlementButtonsState((prev) => ({ ...prev, [type]: state }));
  }, []);

  const setExternalSettlementButtons = useCallback((state: ExternalSettlementButtonState) => {
    setExternalSettlementButtonsState(state);
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    vendors, games, contracts, formulas, settlements, balances, payments, gameLogs, formulaLogs,
    getVendor, getGame, getVendorName, getGameName, addVendor, updateVendor, addGame, updateGame,
    updateContract, updateFormula, addGameLog, importExternal, pullInternal, settleRecords,
    applyPayment, markPaid, recalcBalances, internalSettlementButtons, setInternalSettlementButtons,
    externalSettlementButtons, setExternalSettlementButtons,
  }), [vendors, games, contracts, formulas, settlements, balances, payments, gameLogs, formulaLogs,
    internalSettlementButtons, externalSettlementButtons,
    getVendor, getGame, getVendorName, getGameName, addVendor, updateVendor, addGame, updateGame,
    updateContract, updateFormula, addGameLog, importExternal, pullInternal, settleRecords,
    applyPayment, markPaid, recalcBalances, setInternalSettlementButtons, setExternalSettlementButtons]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}

