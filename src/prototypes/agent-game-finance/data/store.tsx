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
  BusinessType,
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
import {
  filterBalancesByBusiness,
  filterGamesByBusiness,
  filterPaymentsByBusiness,
  filterSettlementsByBusiness,
  filterVendorsByBusiness,
  GAME_ID_BASE,
  vendorIdsInBusiness,
  VENDOR_ID_BASE,
} from '../utils/businessScope';
import type { FinanceCenterRow } from '../utils/financeCenter';
import type { MonthRange } from '../utils/monthRange';
import { calcRecordSettlementIncome, formatDateTime, formatFormulaText, genId } from '../utils/settlement';
import { isFormulaConfigured } from './mock-data';

function nextNumericId(items: { id: string }[], base: number): string {
  const max = items.reduce((m, item) => Math.max(m, Number.parseInt(item.id, 10) || 0), base - 1);
  return String(max + 1);
}

interface InternalSettlementButtonState {
  pullCompleted: boolean;
  settleCompleted: boolean;
  monthRange?: MonthRange;
}

const INITIAL_INTERNAL_SETTLEMENT_BUTTONS: Record<BusinessType, Record<'internal' | 'refund', InternalSettlementButtonState>> = {
  '4399': {
    internal: { pullCompleted: false, settleCompleted: false },
    refund: { pullCompleted: false, settleCompleted: false },
  },
  '快爆': {
    internal: { pullCompleted: false, settleCompleted: false },
    refund: { pullCompleted: false, settleCompleted: false },
  },
};

interface ExternalSettlementButtonState {
  settleCompleted: boolean;
}

const INITIAL_EXTERNAL_SETTLEMENT_BUTTONS: Record<BusinessType, ExternalSettlementButtonState> = {
  '4399': { settleCompleted: false },
  '快爆': { settleCompleted: false },
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
  businessType: BusinessType;
  setBusinessType: (type: BusinessType) => void;
  scopedVendors: Vendor[];
  scopedGames: Game[];
  scopedSettlements: SettlementRecord[];
  scopedPayments: PaymentRequest[];
  scopedBalances: VendorBalance[];
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
  updatePayment: (paymentId: string, data: Partial<PaymentRequest>) => void;
  recalcBalances: () => void;
  internalSettlementButtons: Record<BusinessType, Record<'internal' | 'refund', InternalSettlementButtonState>>;
  setInternalSettlementButtons: (
    type: 'internal' | 'refund',
    state: Partial<InternalSettlementButtonState>,
  ) => void;
  externalSettlementButtons: Record<BusinessType, ExternalSettlementButtonState>;
  setExternalSettlementButtons: (state: Partial<ExternalSettlementButtonState>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function normalizePaymentStatus(p: PaymentRequest): PaymentRequest {
  if ((p.status as string) === '待付款') return { ...p, status: '未付款' };
  return p;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [businessType, setBusinessType] = useState<BusinessType>('4399');
  const [vendors, setVendors] = useState(INITIAL_VENDORS);
  const [games, setGames] = useState(INITIAL_GAMES);
  const [contracts, setContracts] = useState(INITIAL_CONTRACTS);
  const [formulas, setFormulas] = useState(INITIAL_FORMULAS);
  const [settlements, setSettlements] = useState(INITIAL_SETTLEMENTS);
  const [balances, setBalances] = useState(INITIAL_BALANCES);
  const [payments, setPayments] = useState(() => INITIAL_PAYMENTS.map(normalizePaymentStatus));
  const [gameLogs, setGameLogs] = useState(INITIAL_GAME_LOGS);
  const [formulaLogs, setFormulaLogs] = useState(INITIAL_FORMULA_LOGS);
  const [internalSettlementButtons, setInternalSettlementButtonsState] = useState(INITIAL_INTERNAL_SETTLEMENT_BUTTONS);
  const [externalSettlementButtons, setExternalSettlementButtonsState] = useState(INITIAL_EXTERNAL_SETTLEMENT_BUTTONS);

  const scopedVendorIds = useMemo(() => vendorIdsInBusiness(vendors, businessType), [vendors, businessType]);
  const scopedVendors = useMemo(() => filterVendorsByBusiness(vendors, businessType), [vendors, businessType]);
  const scopedGames = useMemo(() => filterGamesByBusiness(games, scopedVendorIds), [games, scopedVendorIds]);
  const scopedSettlements = useMemo(
    () => filterSettlementsByBusiness(settlements, scopedVendorIds),
    [settlements, scopedVendorIds],
  );
  const scopedPayments = useMemo(
    () => filterPaymentsByBusiness(payments, scopedVendorIds),
    [payments, scopedVendorIds],
  );
  const scopedBalances = useMemo(
    () => filterBalancesByBusiness(balances, scopedVendorIds),
    [balances, scopedVendorIds],
  );

  const getVendor = useCallback((id: string) => vendors.find((v) => v.id === id), [vendors]);
  const getGame = useCallback((id: string) => games.find((g) => g.id === id), [games]);
  const getVendorName = useCallback((id: string) => vendors.find((v) => v.id === id)?.name ?? id, [vendors]);
  const getGameName = useCallback((id: string) => games.find((g) => g.id === id)?.onlineName ?? id, [games]);

  const recalcBalances = useCallback(() => {
    setBalances(deriveBalances(settlements, vendors, payments));
  }, [settlements, vendors, payments]);

  useEffect(() => {
    setBalances(deriveBalances(settlements, vendors, payments));
  }, [settlements, vendors, payments]);

  const addVendor = useCallback((v: Omit<Vendor, 'id' | 'businessType'>) => {
    setVendors((prev) => {
      const scoped = prev.filter((x) => x.businessType === businessType);
      const id = nextNumericId(scoped, VENDOR_ID_BASE[businessType]);
      setBalances((bPrev) => [...bPrev, {
        vendorId: id, balance: 0, accountTotalIncome: 0, prepayment: 0,
        deductedPrepayment: 0, remainingPrepayment: 0, totalIncome: 0, totalRefund: 0,
      }]);
      return [...prev, { ...v, id, businessType, historicalDeduction: v.historicalDeduction ?? 0 }];
    });
  }, [businessType]);

  const updateVendor = useCallback((v: Vendor) => {
    setVendors((prev) => prev.map((x) => (x.id === v.id ? v : x)));
  }, []);

  const addGame = useCallback((g: Omit<Game, 'id'>) => {
    setGames((prev) => {
      const vendorIds = vendorIdsInBusiness(vendors, businessType);
      const scoped = prev.filter((x) => vendorIds.has(x.vendorId));
      const id = nextNumericId(scoped, GAME_ID_BASE[businessType]);
      setContracts((cPrev) => [{
        gameId: id, agencyPayment: 0, developmentFee: 0, contractDescription: '', cooperationStatus: g.cooperationStatus,
      }, ...cPrev]);
      setFormulas((fPrev) => [createEmptyFormula(id), ...fPrev]);
      setGameLogs((logs) => [{
        id: genId('GL'), gameId: id, operator: '当前用户', time: new Date().toLocaleString('zh-CN'), action: '添加游戏',
      }, ...logs]);
      return [{ ...g, id }, ...prev];
    });
  }, [businessType, vendors]);

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
    const vendor = vendors.find((v) => v.id === vendorId);
    if (!vendor || vendor.businessType !== businessType) return false;
    const bal = deriveBalances(settlements, vendors, payments).find((b) => b.vendorId === vendorId);
    if (!bal || bal.balance <= 0) return false;
    const toApply = settlements.filter(
      (s) => s.vendorId === vendorId && s.settled && s.paymentApplyStatus === '未申请',
    );
    const settlementIds = toApply.map((s) => s.id);
    setPayments((prev) => [...prev, {
      id: genId('P'), vendorId, pendingAmount: bal.balance, status: '未付款',
      applyTime: formatDateTime(),
      settlementIds,
    }]);
    setSettlements((prev) => prev.map((s) =>
      settlementIds.includes(s.id)
        ? { ...s, paymentApplyStatus: '已申请' as const }
        : s,
    ));
    return true;
  }, [businessType, settlements, vendors, payments]);

  const markPaid = useCallback((paymentId: string, data: Partial<PaymentRequest>) => {
    setPayments((prev) => prev.map((p) => p.id === paymentId
      ? { ...p, ...data, status: '已付款' as const, payTime: formatDateTime(), actualAmount: data.actualAmount ?? p.pendingAmount }
      : p));
  }, []);

  const updatePayment = useCallback((paymentId: string, data: Partial<PaymentRequest>) => {
    setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, ...data } : p)));
  }, []);

  const setInternalSettlementButtons = useCallback((
    type: 'internal' | 'refund',
    state: Partial<InternalSettlementButtonState>,
  ) => {
    setInternalSettlementButtonsState((prev) => ({
      ...prev,
      [businessType]: {
        ...prev[businessType],
        [type]: { ...prev[businessType][type], ...state },
      },
    }));
  }, [businessType]);

  const setExternalSettlementButtons = useCallback((state: Partial<ExternalSettlementButtonState>) => {
    setExternalSettlementButtonsState((prev) => ({
      ...prev,
      [businessType]: { ...prev[businessType], ...state },
    }));
  }, [businessType]);

  const value = useMemo<AppContextValue>(() => ({
    vendors, games, contracts, formulas, settlements, balances, payments, gameLogs, formulaLogs,
    businessType, setBusinessType,
    scopedVendors, scopedGames, scopedSettlements, scopedPayments, scopedBalances,
    getVendor, getGame, getVendorName, getGameName, addVendor, updateVendor, addGame, updateGame,
    updateContract, updateFormula, addGameLog, importExternal, pullInternal, settleRecords,
    applyPayment, markPaid, updatePayment, recalcBalances, internalSettlementButtons, setInternalSettlementButtons,
    externalSettlementButtons, setExternalSettlementButtons,
  }), [vendors, games, contracts, formulas, settlements, balances, payments, gameLogs, formulaLogs,
    businessType, scopedVendors, scopedGames, scopedSettlements, scopedPayments, scopedBalances,
    internalSettlementButtons, externalSettlementButtons,
    getVendor, getGame, getVendorName, getGameName, addVendor, updateVendor, addGame, updateGame,
    updateContract, updateFormula, addGameLog, importExternal, pullInternal, settleRecords,
    applyPayment, markPaid, updatePayment, recalcBalances, setInternalSettlementButtons, setExternalSettlementButtons]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}

