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
import { calcSettlement, formatFormulaText, genId } from '../utils/settlement';

const VENDOR_ID_BASE = 1001;
const GAME_ID_BASE = 4001;

function nextNumericId(items: { id: string }[], base: number): string {
  const max = items.reduce((m, item) => Math.max(m, Number.parseInt(item.id, 10) || 0), base - 1);
  return String(max + 1);
}

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
  addVendor: (v: Omit<Vendor, 'id'>) => void;
  updateVendor: (v: Vendor) => void;
  addGame: (g: Omit<Game, 'id'>) => void;
  updateGame: (g: Game) => void;
  updateContract: (c: Contract) => void;
  updateFormula: (f: FormulaConfig, operator?: string) => void;
  addGameLog: (log: Omit<GameOperationLog, 'id'>) => void;
  importExternal: (rows: ImportPreviewRow[]) => void;
  pullInternal: (type: 'internal' | 'refund') => void;
  settleRecords: (ids: string[]) => void;
  applyPayment: (vendorId: string) => boolean;
  markPaid: (paymentId: string, data: Partial<PaymentRequest>) => void;
  recalcBalances: () => void;
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

  const getVendor = useCallback((id: string) => vendors.find((v) => v.id === id), [vendors]);
  const getGame = useCallback((id: string) => games.find((g) => g.id === id), [games]);
  const getVendorName = useCallback((id: string) => vendors.find((v) => v.id === id)?.name ?? id, [vendors]);

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
      setContracts((cPrev) => [...cPrev, {
        gameId: id, prepayment: 0, agencyPayment: 0, developmentFee: 0, contractDescription: '', cooperationStatus: g.cooperationStatus,
      }]);
      setFormulas((fPrev) => [...fPrev, {
        gameId: id, internalTax: 0.06, internalChannelFee: 0.3, internalShare: 0.5,
        externalTax: 0.06, externalChannelFee: 0.25, externalShare: 0.45, invoiceMode: '跟随发票',
        channels: [],
      }]);
      setGameLogs((logs) => [...logs, {
        id: genId('GL'), gameId: id, operator: '当前用户', time: new Date().toLocaleString('zh-CN'), action: '添加游戏',
      }]);
      return [...prev, { ...g, id }];
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
    const text = `内部：${formatFormulaText(f.internalTax, f.internalChannelFee, f.internalShare, '内部')}；外部：${formatFormulaText(f.externalTax, f.externalChannelFee, f.externalShare, '外部')}`;
    setFormulaLogs((prev) => [...prev, { id: genId('FL'), gameId: f.gameId, operator, time: new Date().toLocaleString('zh-CN'), formulaText: text }]);
  }, []);

  const addGameLog = useCallback((log: Omit<GameOperationLog, 'id'>) => {
    setGameLogs((prev) => [...prev, { ...log, id: genId('GL') }]);
  }, []);

  const importExternal = useCallback((rows: ImportPreviewRow[]) => {
    const newRecords: SettlementRecord[] = rows.map((r) => {
      const game = games.find((g) => g.id === r.gameId);
      return {
        id: genId('S'), type: 'external' as SettlementType, incomeTime: r.incomeTime, gameId: r.gameId,
        channel: r.channel, grossRevenue: r.grossRevenue, settlementAmount: r.grossRevenue * 0.7,
        settlementIncome: r.settlementIncome, formulaText: r.formulaText,
        settlementTime: new Date().toISOString().slice(0, 10), paymentApplyStatus: '未提交' as const,
        settled: true, vendorId: game?.vendorId ?? '',
      };
    });
    setSettlements((prev) => [...prev, ...newRecords]);
  }, [games]);

  const pullInternal = useCallback((type: 'internal' | 'refund') => {
    const unsettled = games.filter((g) => {
      const hasPending = settlements.some((s) => s.gameId === g.id && s.type === type && !s.settled);
      return !hasPending && g.operationStatus === '已上线';
    }).slice(0, 3);
    const newRecords: SettlementRecord[] = unsettled.map((g) => {
      const f = formulas.find((x) => x.gameId === g.id);
      const gross = Math.round(Math.random() * 100000 + 20000);
      const tax = f?.internalTax ?? 0.06;
      const fee = f?.internalChannelFee ?? 0.3;
      const share = f?.internalShare ?? 0.5;
      const income = calcSettlement(gross, tax, fee, share);
      return {
        id: genId('S'), type, incomeTime: '2025-07', gameId: g.id,
        channel: type === 'refund' ? '好游快爆' : 'TapTap',
        grossRevenue: gross, settlementAmount: gross * (1 - tax - fee), settlementIncome: income,
        formulaText: formatFormulaText(tax, fee, share, type === 'refund' ? '退款' : '内部'),
        paymentApplyStatus: '未提交', settled: false, vendorId: g.vendorId,
      };
    });
    setSettlements((prev) => [...prev, ...newRecords]);
  }, [games, settlements, formulas]);

  const settleRecords = useCallback((ids: string[]) => {
    setSettlements((prev) => prev.map((s) => ids.includes(s.id)
      ? { ...s, settled: true, settlementTime: new Date().toISOString().slice(0, 10) }
      : s));
  }, []);

  const applyPayment = useCallback((vendorId: string) => {
    const bal = deriveBalances(settlements, vendors, contracts, games, payments).find((b) => b.vendorId === vendorId);
    if (!bal || bal.balance <= 0) return false;
    setPayments((prev) => [...prev, {
      id: genId('P'), vendorId, pendingAmount: bal.balance, status: '待付款',
      applyTime: new Date().toLocaleString('zh-CN'),
    }]);
    setSettlements((prev) => prev.map((s) =>
      s.vendorId === vendorId && s.settled && s.paymentApplyStatus === '未提交'
        ? { ...s, paymentApplyStatus: '已提交' as const }
        : s,
    ));
    return true;
  }, [settlements, vendors, contracts, games, payments]);

  const markPaid = useCallback((paymentId: string, data: Partial<PaymentRequest>) => {
    setPayments((prev) => prev.map((p) => p.id === paymentId
      ? { ...p, ...data, status: '已付款' as const, payTime: new Date().toLocaleString('zh-CN'), actualAmount: data.actualAmount ?? p.pendingAmount }
      : p));
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    vendors, games, contracts, formulas, settlements, balances, payments, gameLogs, formulaLogs,
    getVendor, getGame, getVendorName, addVendor, updateVendor, addGame, updateGame,
    updateContract, updateFormula, addGameLog, importExternal, pullInternal, settleRecords,
    applyPayment, markPaid, recalcBalances,
  }), [vendors, games, contracts, formulas, settlements, balances, payments, gameLogs, formulaLogs,
    getVendor, getGame, getVendorName, addVendor, updateVendor, addGame, updateGame,
    updateContract, updateFormula, addGameLog, importExternal, pullInternal, settleRecords,
    applyPayment, markPaid, recalcBalances]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}

export function buildImportPreview(games: Game[], formulas: FormulaConfig[]): ImportPreviewRow[] {
  return games.slice(0, 3).map((g) => {
    const f = formulas.find((x) => x.gameId === g.id);
    const gross = Math.round(Math.random() * 80000 + 10000);
    const income = calcSettlement(gross, f?.externalTax ?? 0.06, f?.externalChannelFee ?? 0.25, f?.externalShare ?? 0.45);
    return {
      incomeTime: '2025-07', gameId: g.id, gameName: g.name, channel: 'Steam',
      grossRevenue: gross, settlementIncome: income,
      formulaText: formatFormulaText(f?.externalTax ?? 0.06, f?.externalChannelFee ?? 0.25, f?.externalShare ?? 0.45, '外部'),
    };
  });
}
