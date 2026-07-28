import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  INITIAL_GAME_BALANCES,
  INITIAL_GAME_PAYMENTS,
  INITIAL_CONTRACTS,
  INITIAL_EXCHANGE_RATES,
  INITIAL_FORMULA_LOGS,
  INITIAL_FORMULAS,
  INITIAL_GAME_LOGS,
  INITIAL_GAMES,
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
  GameBalance,
  GameOperationLog,
  GamePaymentRequest,
  ImportPreviewRow,
  SettlementRecord,
  SettlementType,
  Vendor,
  ExchangeRateRecord,
} from './types';
import { deriveGameBalances } from '../utils/balance';
import { buildContractChangeDetail, emptyContract } from '../utils/contractLog';
import {
  filterGameBalancesByBusiness,
  filterGamePaymentsByBusiness,
  filterGamesByBusiness,
  filterSettlementsByBusiness,
  filterVendorsByBusiness,
  GAME_ID_BASE,
  vendorIdsInBusiness,
  VENDOR_ID_BASE,
} from '../utils/businessScope';
import type { FinanceCenterRow } from '../utils/financeCenter';
import type { MonthRange } from '../utils/monthRange';
import {
  calcRecordSettlementIncome,
  formatDateTime,
  formatFormulaText,
  genId,
  getSettlementChannelOwnership,
  getSettlementFormulaText,
  isFormulaConfiguredForOwnership,
  isFormulaValidForOwnership,
  isUnsettledSettlement,
} from '../utils/settlement';
import { buildGamePaymentApplySnapshot } from '../utils/gamePaymentApplySnapshot';
import { getExternalFormulaText } from '../utils/externalImport';

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

interface AppState {
  vendors: Vendor[];
  games: Game[];
  contracts: Contract[];
  formulas: FormulaConfig[];
  settlements: SettlementRecord[];
  gameBalances: GameBalance[];
  gamePayments: GamePaymentRequest[];
  gameLogs: GameOperationLog[];
  formulaLogs: FormulaOperationLog[];
  exchangeRates: ExchangeRateRecord[];
}

interface AppContextValue extends AppState {
  businessType: BusinessType;
  setBusinessType: (type: BusinessType) => void;
  scopedVendors: Vendor[];
  scopedGames: Game[];
  scopedSettlements: SettlementRecord[];
  scopedGamePayments: GamePaymentRequest[];
  scopedGameBalances: GameBalance[];
  getVendor: (id: string) => Vendor | undefined;
  getGame: (id: string) => Game | undefined;
  getVendorName: (id: string) => string;
  getGameName: (id: string) => string;
  addVendor: (v: Omit<Vendor, 'id'>) => void;
  updateVendor: (v: Vendor) => void;
  addGame: (g: Omit<Game, 'id' | 'createdAt'>) => void;
  updateGame: (g: Game) => void;
  updateContract: (c: Contract) => void;
  updateFormula: (f: FormulaConfig, operator?: string) => void;
  addGameLog: (log: Omit<GameOperationLog, 'id'>) => void;
  importExternal: (rows: ImportPreviewRow[]) => void;
  pullInternal: (type: 'internal' | 'refund', rows: FinanceCenterRow[], monthKey: string) => number;
  settleRecords: (ids: string[]) => { ok: boolean; message?: string };
  applyGamePayment: (gameId: string, exchangeRateDate: string, exchangeRate: number) => boolean;
  markGamePaid: (paymentId: string, data: Partial<GamePaymentRequest>) => void;
  updateGamePayment: (paymentId: string, data: Partial<GamePaymentRequest>) => void;
  recalcBalances: () => void;
  internalSettlementButtons: Record<BusinessType, Record<'internal' | 'refund', InternalSettlementButtonState>>;
  setInternalSettlementButtons: (
    type: 'internal' | 'refund',
    state: Partial<InternalSettlementButtonState>,
  ) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function normalizeGamePaymentStatus(p: GamePaymentRequest): GamePaymentRequest {
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
  const [gameBalances, setGameBalances] = useState(INITIAL_GAME_BALANCES);
  const [gamePayments, setGamePayments] = useState(() => INITIAL_GAME_PAYMENTS.map(normalizeGamePaymentStatus));
  const [gameLogs, setGameLogs] = useState(INITIAL_GAME_LOGS);
  const [formulaLogs, setFormulaLogs] = useState(INITIAL_FORMULA_LOGS);
  const [internalSettlementButtons, setInternalSettlementButtonsState] = useState(INITIAL_INTERNAL_SETTLEMENT_BUTTONS);

  const scopedVendorIds = useMemo(() => vendorIdsInBusiness(vendors, businessType), [vendors, businessType]);
  const scopedVendors = useMemo(() => filterVendorsByBusiness(vendors, businessType), [vendors, businessType]);
  const scopedGames = useMemo(() => filterGamesByBusiness(games, scopedVendorIds), [games, scopedVendorIds]);
  const scopedGameIds = useMemo(() => new Set(scopedGames.map((g) => g.id)), [scopedGames]);
  const scopedSettlements = useMemo(
    () => filterSettlementsByBusiness(settlements, scopedVendorIds),
    [settlements, scopedVendorIds],
  );
  const scopedGamePayments = useMemo(
    () => filterGamePaymentsByBusiness(gamePayments, scopedGameIds),
    [gamePayments, scopedGameIds],
  );
  const scopedGameBalances = useMemo(
    () => filterGameBalancesByBusiness(gameBalances, scopedGameIds),
    [gameBalances, scopedGameIds],
  );

  const getVendor = useCallback((id: string) => vendors.find((v) => v.id === id), [vendors]);
  const getGame = useCallback((id: string) => games.find((g) => g.id === id), [games]);
  const getVendorName = useCallback((id: string) => vendors.find((v) => v.id === id)?.name ?? id, [vendors]);
  const getGameName = useCallback((id: string) => games.find((g) => g.id === id)?.onlineName ?? id, [games]);

  const recalcBalances = useCallback(() => {
    setGameBalances(deriveGameBalances(settlements, games, gamePayments, contracts));
  }, [settlements, games, gamePayments, contracts]);

  useEffect(() => {
    setGameBalances(deriveGameBalances(settlements, games, gamePayments, contracts));
  }, [settlements, games, gamePayments, contracts]);

  const addVendor = useCallback((v: Omit<Vendor, 'id' | 'businessType'>) => {
    setVendors((prev) => {
      const scoped = prev.filter((x) => x.businessType === businessType);
      const id = nextNumericId(scoped, VENDOR_ID_BASE[businessType]);
      return [...prev, { ...v, id, businessType }];
    });
  }, [businessType]);

  const updateVendor = useCallback((v: Vendor) => {
    setVendors((prev) => prev.map((x) => (x.id === v.id ? v : x)));
  }, []);

  const addGame = useCallback((g: Omit<Game, 'id' | 'createdAt'>) => {
    setGames((prev) => {
      const vendorIds = vendorIdsInBusiness(vendors, businessType);
      const scoped = prev.filter((x) => vendorIds.has(x.vendorId));
      const id = nextNumericId(scoped, GAME_ID_BASE[businessType]);
      setContracts((cPrev) => [{
        gameId: id,
        contractNumber: '',
        cooperationContents: [],
        supplementalNote: '',
        cooperationStatus: g.cooperationStatus,
      }, ...cPrev]);
      setFormulas((fPrev) => [createEmptyFormula(id), ...fPrev]);
      setGameLogs((logs) => [{
        id: genId('GL'), gameId: id, operator: '当前用户', time: formatDateTime(), action: '添加游戏',
      }, ...logs]);
      return [{ ...g, id, createdAt: new Date().toISOString() }, ...prev];
    });
  }, [businessType, vendors]);

  const updateGame = useCallback((g: Game) => {
    setGames((prev) => {
      const old = prev.find((x) => x.id === g.id);
      if (old) {
        if (old.operationStatus !== g.operationStatus) {
          setGameLogs((logs) => [...logs, {
            id: genId('GL'), gameId: g.id, operator: '当前用户', time: formatDateTime(),
            action: '运营状态', status: g.operationStatus,
          }]);
        }
        if (old.cooperationStatus !== g.cooperationStatus) {
          setGameLogs((logs) => [...logs, {
            id: genId('GL'), gameId: g.id, operator: '当前用户', time: formatDateTime(),
            action: '合作状态', status: g.cooperationStatus,
          }]);
        }
      }
      return prev.map((x) => (x.id === g.id ? g : x));
    });
  }, []);

  const updateContract = useCallback((c: Contract) => {
    setContracts((prev) => {
      const old = prev.find((x) => x.gameId === c.gameId) ?? emptyContract(c.gameId);
      const detail = buildContractChangeDetail(old, c);
      if (detail) {
        setGameLogs((logs) => [...logs, {
          id: genId('GL'), gameId: c.gameId, operator: '当前用户', time: formatDateTime(),
          action: '合同变更', detail,
        }]);
      }
      const exists = prev.some((x) => x.gameId === c.gameId);
      return exists ? prev.map((x) => (x.gameId === c.gameId ? c : x)) : [c, ...prev];
    });
    setGames((prev) => {
      const old = prev.find((x) => x.id === c.gameId);
      if (old && old.cooperationStatus !== c.cooperationStatus) {
        setGameLogs((logs) => [...logs, {
          id: genId('GL'), gameId: c.gameId, operator: '当前用户', time: formatDateTime(),
          action: '合作状态', status: c.cooperationStatus,
        }]);
      }
      return prev.map((x) => (x.id === c.gameId ? { ...x, cooperationStatus: c.cooperationStatus } : x));
    });
  }, []);

  const updateFormula = useCallback((f: FormulaConfig, operator = '当前用户') => {
    setFormulas((prev) => prev.map((x) => (x.gameId === f.gameId ? f : x)));
    const text = [
      formatFormulaText(f.internalTax, f.internalChannelFee, f.internalShare, '自有渠道'),
      formatFormulaText(f.externalTax, f.externalChannelFee, f.externalShare, '外部渠道'),
    ].join('\n');
    setFormulaLogs((prev) => [...prev, { id: genId('FL'), gameId: f.gameId, operator, time: formatDateTime(), formulaText: text }]);
  }, []);

  const addGameLog = useCallback((log: Omit<GameOperationLog, 'id'>) => {
    setGameLogs((prev) => [...prev, { ...log, id: genId('GL') }]);
  }, []);

  const importExternal = useCallback((rows: ImportPreviewRow[]) => {
    const newRecords: SettlementRecord[] = rows.map((r) => {
      const game = games.find((g) => g.id === r.gameId);
      const formula = formulas.find((f) => f.gameId === r.gameId);
      const vendor = vendors.find((v) => v.id === game?.vendorId);
      return {
        id: genId('S'), type: 'external' as SettlementType, incomeTime: r.incomeTime, gameId: r.gameId,
        channel: r.channel, grossRevenue: r.pendingAmount, settlementAmount: r.pendingAmount,
        settlementIncome: 0,
        formulaText: getExternalFormulaText(formula, vendor),
        paymentApplyStatus: '未申请' as const,
        settled: false, vendorId: game?.vendorId ?? '',
        dataSource: '文件导入',
        channelOwnership: 'external',
        externalChannelType: 'thirdParty',
        settlementRole: 'thirdParty',
        channelCategory: r.channel,
        businessType: vendor?.businessType,
      };
    });
    setSettlements((prev) => [...newRecords, ...prev]);
  }, [games, formulas, vendors]);

  const pullInternal = useCallback((type: 'internal' | 'refund', rows: FinanceCenterRow[], monthKey: string) => {
    const newRecords: SettlementRecord[] = rows.map((row) => {
      const game = games.find((g) => g.id === row.gameId);
      const f = formulas.find((x) => x.gameId === row.gameId);
      const vendor = vendors.find((v) => v.id === game?.vendorId);
      const formulaText = getSettlementFormulaText(
        f,
        vendor,
        row.channelOwnership,
        type === 'refund' ? '退款金额' : '待结算金额',
      );
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
        dataSource: '系统拉取',
        channelOwnership: row.channelOwnership,
        externalChannelType: row.channelOwnership === 'external' ? 'related' : undefined,
        settlementRole: row.settlementRole,
        channelCategory: row.channel,
        channelGameId: row.channelGameId,
        businessType: vendor?.businessType,
      };
    });
    setSettlements((prev) => {
      const kept = prev.filter((s) => !(s.type === type && s.incomeTime === monthKey && !s.settled));
      return [...newRecords, ...kept];
    });
    return newRecords.length;
  }, [games, formulas, vendors]);

  const settleRecords = useCallback((ids: string[]) => {
    const uniqueIds = [...new Set(ids)];
    const records = uniqueIds
      .map((id) => settlements.find((record) => record.id === id))
      .filter((record): record is SettlementRecord => Boolean(record));
    if (records.length !== uniqueIds.length || records.some((record) => !isUnsettledSettlement(record))) {
      return { ok: false, message: '结算失败，本次数据均未结算：记录状态已变化' };
    }

    const missingFormulaGameIds = [...new Set(records
      .filter((record) => {
        const vendor = vendors.find((item) => item.id === record.vendorId);
        const formula = formulas.find((item) => item.gameId === record.gameId);
        const ownership = getSettlementChannelOwnership(record, vendor);
        return !isFormulaConfiguredForOwnership(formula, ownership);
      })
      .map((record) => record.gameId))];
    if (missingFormulaGameIds.length > 0) {
      return { ok: false, message: `${missingFormulaGameIds.join('、')}缺少结算公式` };
    }

    const hasInvalidFormula = records.some((record) => {
      const vendor = vendors.find((item) => item.id === record.vendorId);
      const formula = formulas.find((item) => item.gameId === record.gameId);
      return !isFormulaValidForOwnership(
        formula,
        getSettlementChannelOwnership(record, vendor),
      );
    });
    if (hasInvalidFormula) {
      return { ok: false, message: '结算失败，本次数据均未结算：结算公式无效' };
    }

    if (records.some((record) => !Number.isFinite(record.settlementAmount) || record.settlementAmount < 0)) {
      return { ok: false, message: '结算失败，本次数据均未结算：来源金额无效' };
    }

    const settlementTime = formatDateTime();
    const updates = new Map<string, SettlementRecord>();
    for (const record of records) {
      const formula = formulas.find((item) => item.gameId === record.gameId);
      const vendor = vendors.find((item) => item.id === record.vendorId);
      const ownership = getSettlementChannelOwnership(record, vendor);
      const settlementIncome = calcRecordSettlementIncome(record, formula, vendor);
      if (!Number.isFinite(settlementIncome)) {
        return { ok: false, message: '结算失败，本次数据均未结算：结算公式无效' };
      }
      updates.set(record.id, {
        ...record,
        settled: true,
        settlementTime,
        settlementIncome,
        formulaText: getSettlementFormulaText(
          formula,
          vendor,
          ownership,
          record.type === 'refund' ? '退款金额' : '待结算金额',
        ),
      });
    }
    setSettlements((prev) => prev.map((record) => updates.get(record.id) ?? record));
    return { ok: true };
  }, [settlements, formulas, vendors]);

  const applyGamePayment = useCallback((gameId: string, exchangeRateDate: string, exchangeRate: number) => {
    const game = games.find((g) => g.id === gameId);
    if (!game || !scopedGameIds.has(gameId)) return false;
    const vendor = vendors.find((v) => v.id === game.vendorId);
    if (!vendor) return false;
    const bal = deriveGameBalances(settlements, games, gamePayments, contracts).find((b) => b.gameId === gameId);
    if (!bal || bal.balance <= 0) return false;
    const toApply = settlements.filter(
      (s) => s.gameId === gameId && s.settled && s.paymentApplyStatus === '未申请',
    );
    const settlementIds = toApply.map((s) => s.id);
    const applyTime = formatDateTime();
    const contract = contracts.find((c) => c.gameId === gameId);
    const { applySnapshot, letterSnapshot } = buildGamePaymentApplySnapshot({
      gameId,
      pendingAmount: bal.balance,
      applyTime,
      settlementIds,
      game,
      vendor,
      contract,
      settlements,
      gamePayments,
      exchangeRates: INITIAL_EXCHANGE_RATES,
      games,
      getGameName: (id) => {
        const g = games.find((x) => x.id === id);
        return g?.onlineName ?? g?.name ?? id;
      },
      exchangeRateDate,
      exchangeRate,
    });
    setGamePayments((prev) => [{
      id: genId('GP'),
      gameId,
      pendingAmount: bal.balance,
      status: '未付款',
      applyTime,
      exchangeRateDate,
      exchangeRate,
      settlementIds,
      applySnapshot,
      letterSnapshot,
    }, ...prev]);
    setSettlements((prev) => prev.map((s) =>
      settlementIds.includes(s.id)
        ? { ...s, paymentApplyStatus: '已申请' as const }
        : s,
    ));
    return true;
  }, [scopedGameIds, settlements, games, gamePayments, vendors, contracts]);

  const markGamePaid = useCallback((paymentId: string, data: Partial<GamePaymentRequest>) => {
    setGamePayments((prev) => prev.map((p) => p.id === paymentId
      ? { ...p, ...data, status: '已付款' as const, payTime: formatDateTime(), actualAmount: data.actualAmount ?? p.pendingAmount }
      : p));
  }, []);

  const updateGamePayment = useCallback((paymentId: string, data: Partial<GamePaymentRequest>) => {
    setGamePayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, ...data } : p)));
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

  const value = useMemo<AppContextValue>(() => ({
    vendors, games, contracts, formulas, settlements, gameBalances, gamePayments, gameLogs, formulaLogs,
    exchangeRates: INITIAL_EXCHANGE_RATES,
    businessType, setBusinessType,
    scopedVendors, scopedGames, scopedSettlements, scopedGamePayments, scopedGameBalances,
    getVendor, getGame, getVendorName, getGameName, addVendor, updateVendor, addGame, updateGame,
    updateContract, updateFormula, addGameLog, importExternal, pullInternal, settleRecords,
    applyGamePayment, markGamePaid, updateGamePayment, recalcBalances,
    internalSettlementButtons, setInternalSettlementButtons,
  }), [vendors, games, contracts, formulas, settlements, gameBalances, gamePayments, gameLogs, formulaLogs,
    businessType, scopedVendors, scopedGames, scopedSettlements, scopedGamePayments, scopedGameBalances,
    internalSettlementButtons,
    getVendor, getGame, getVendorName, getGameName, addVendor, updateVendor, addGame, updateGame,
    updateContract, updateFormula, addGameLog, importExternal, pullInternal, settleRecords,
    applyGamePayment, markGamePaid, updateGamePayment, recalcBalances,
    setInternalSettlementButtons]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
