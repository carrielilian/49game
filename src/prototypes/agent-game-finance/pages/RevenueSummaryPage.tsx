import React, { useEffect, useMemo, useState } from 'react';
import { COL_ALIGN_RIGHT, CurrencyAmount, DataTable, DualCell, renderCurrencyTotals } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { MonthRangePicker } from '../components/MonthRangePicker';
import { ListSearchFields } from '../components/ListSearchFields';
import { useAppStore } from '../data/store';
import { EXTERNAL_CHANNELS, INTERNAL_CHANNELS } from '../data/mock-data';
import type { Contract, ContractCurrency, Game, GamePaymentRequest, SettlementRecord, Vendor } from '../data/types';
import { calcContractPaymentTotal } from '../utils/contractLog';
import { selectOptions } from '../utils/columnFilters';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';
import { getSampleMonthRange, isMonthInRange } from '../utils/monthRange';
import { isPaidPayment } from '../utils/payment';
import { formatCurrencyMoney, SETTLEMENT_CURRENCY } from '../utils/settlement';

type QueryDimension = 'game' | 'channel' | 'vendor';

interface SummaryRow {
  id: string;
  time: string;
  gameId?: string;
  gameName?: string;
  vendorId?: string;
  vendorName?: string;
  channel?: string;
  paymentAmount: number;
  paymentCurrency: ContractCurrency;
  totalRevenue: number;
  settlementIncome: number;
  settlementRefund: number;
  settlementPaymentAmount: number;
  /** 渠道/厂商维度汇总支付金额时关联的游戏 */
  paymentGameIds?: Set<string>;
}

function resolvePaymentCurrency(
  gameIds: string[],
  getGame: (id: string) => Game | undefined,
  getVendor: (id: string) => Vendor | undefined,
  fallbackVendorId?: string,
): ContractCurrency {
  if (fallbackVendorId) {
    return getVendor(fallbackVendorId)?.currency ?? '人民币';
  }
  const currencies = new Set<ContractCurrency>();
  for (const gameId of gameIds) {
    const game = getGame(gameId);
    if (!game) continue;
    currencies.add(getVendor(game.vendorId)?.currency ?? '人民币');
  }
  if (currencies.size === 1) return [...currencies][0];
  const firstGame = getGame(gameIds[0]);
  return firstGame ? (getVendor(firstGame.vendorId)?.currency ?? '人民币') : '人民币';
}

function attachPaymentAmount(
  rows: Array<Omit<SummaryRow, 'paymentAmount' | 'paymentCurrency'> & { paymentGameIds?: Set<string> }>,
  dimension: QueryDimension,
  contractMap: Map<string, Contract>,
  getGame: (id: string) => Game | undefined,
  getVendor: (id: string) => Vendor | undefined,
): SummaryRow[] {
  return rows.map((row) => {
    const gameIds = dimension === 'game'
      ? (row.gameId ? [row.gameId] : [])
      : Array.from(row.paymentGameIds ?? []);
    const paymentAmount = gameIds.reduce(
      (sum, gameId) => sum + calcContractPaymentTotal(contractMap.get(gameId)),
      0,
    );
    const paymentCurrency = resolvePaymentCurrency(
      gameIds,
      getGame,
      getVendor,
      dimension === 'vendor' ? row.vendorId : undefined,
    );
    const { paymentGameIds: _omit, ...rest } = row;
    return { ...rest, paymentAmount, paymentCurrency };
  });
}

function getPayMonth(payTime?: string): string | null {
  if (!payTime || payTime.length < 7) return null;
  return payTime.slice(0, 7);
}

function attachSettlementPaymentAmount(
  rows: Array<Omit<SummaryRow, 'paymentAmount' | 'paymentCurrency'> & { paymentGameIds?: Set<string> }>,
  dimension: QueryDimension,
  gamePayments: GamePaymentRequest[],
  monthRange: { start: string; end: string },
  search: ListSearchQuery,
  getGame: (id: string) => Game | undefined,
  getGameName: (id: string) => string,
  getVendorName: (id: string) => string,
): Array<Omit<SummaryRow, 'paymentAmount' | 'paymentCurrency'> & { paymentGameIds?: Set<string> }> {
  return rows.map((row) => {
    let settlementPaymentAmount = 0;
    for (const payment of gamePayments) {
      if (!isPaidPayment(payment.status) || payment.actualAmount == null) continue;
      const payMonth = getPayMonth(payment.payTime);
      if (!payMonth || payMonth !== row.time || !isMonthInRange(payMonth, monthRange)) continue;

      const game = getGame(payment.gameId);
      if (!game) continue;
      if (!matchesListSearch(search, {
        gameId: payment.gameId,
        gameName: getGameName(payment.gameId),
        vendorId: game.vendorId,
        vendorName: getVendorName(game.vendorId),
      })) continue;

      const matchesDimension = dimension === 'game'
        ? payment.gameId === row.gameId
        : dimension === 'vendor'
          ? game.vendorId === row.vendorId
          : row.paymentGameIds?.has(payment.gameId) ?? false;
      if (!matchesDimension) continue;

      settlementPaymentAmount += payment.actualAmount;
    }
    return { ...row, settlementPaymentAmount };
  });
}

function formatPaymentAmount(amount: number, currency: ContractCurrency): React.ReactNode {
  return <CurrencyAmount amount={amount} currency={currency} />;
}

const SETTLEMENT_AMOUNT = (value: number) => formatCurrencyMoney(value, SETTLEMENT_CURRENCY);

interface SummaryTotals {
  paymentByCurrency: Partial<Record<ContractCurrency, number>>;
  totalRevenue: number;
  settlementPaymentAmount: number;
}

function computeSummaryTotals(rows: SummaryRow[]): SummaryTotals {
  const paymentByCurrency: Partial<Record<ContractCurrency, number>> = {};
  let totalRevenue = 0;
  let settlementPaymentAmount = 0;
  for (const row of rows) {
    paymentByCurrency[row.paymentCurrency] = (paymentByCurrency[row.paymentCurrency] ?? 0) + row.paymentAmount;
    totalRevenue += row.totalRevenue;
    settlementPaymentAmount += row.settlementPaymentAmount;
  }
  return { paymentByCurrency, totalRevenue, settlementPaymentAmount };
}

function renderPaymentTotal(paymentByCurrency: Partial<Record<ContractCurrency, number>>): React.ReactNode {
  return renderCurrencyTotals(paymentByCurrency);
}

const AMOUNT_CELL = 'agf-table__cell--right';

function buildSummaryLeadingRow(dimension: QueryDimension, totals: SummaryTotals): React.ReactNode {
  const paymentCell = renderPaymentTotal(totals.paymentByCurrency);
  const revenueCell = SETTLEMENT_AMOUNT(totals.totalRevenue);
  const settlementCell = SETTLEMENT_AMOUNT(totals.settlementPaymentAmount);

  if (dimension === 'game') {
    return (
      <tr className="agf-table__summary-row">
        <td>查询总计</td>
        <td />
        <td className={AMOUNT_CELL}>{paymentCell}</td>
        <td className={AMOUNT_CELL}>{revenueCell}</td>
        <td className={AMOUNT_CELL}>{settlementCell}</td>
      </tr>
    );
  }
  if (dimension === 'channel') {
    return (
      <tr className="agf-table__summary-row">
        <td>查询总计</td>
        <td />
        <td className={AMOUNT_CELL}>{paymentCell}</td>
        <td className={AMOUNT_CELL}>{revenueCell}</td>
        <td className={AMOUNT_CELL}>{settlementCell}</td>
      </tr>
    );
  }
  return (
    <tr className="agf-table__summary-row">
      <td>查询总计</td>
      <td />
      <td />
      <td className={AMOUNT_CELL}>{paymentCell}</td>
      <td className={AMOUNT_CELL}>{revenueCell}</td>
      <td className={AMOUNT_CELL}>{settlementCell}</td>
    </tr>
  );
}

const PAYMENT_COLUMN = {
  ...COL_ALIGN_RIGHT,
  key: 'paymentAmount',
  title: '支付金额',
  render: (r: SummaryRow) => formatPaymentAmount(r.paymentAmount, r.paymentCurrency),
};

function buildSummaryRows(
  settlements: SettlementRecord[],
  dimension: QueryDimension,
  monthRange: { start: string; end: string },
  search: ListSearchQuery,
  getVendorName: (id: string) => string,
  getGameName: (id: string) => string,
): Array<Omit<SummaryRow, 'paymentAmount' | 'paymentCurrency'>> {
  const map = new Map<string, Omit<SummaryRow, 'paymentAmount' | 'paymentCurrency'> & { paymentGameIds?: Set<string> }>();

  for (const s of settlements) {
    if (!s.settled || !isMonthInRange(s.incomeTime, monthRange)) continue;

    const gameName = getGameName(s.gameId);
    const vendorName = getVendorName(s.vendorId);
    if (!matchesListSearch(search, {
      gameId: s.gameId,
      gameName,
      vendorId: s.vendorId,
      vendorName,
    })) continue;

    const key = dimension === 'game'
      ? `${s.incomeTime}|${s.gameId}`
      : dimension === 'channel'
        ? `${s.incomeTime}|${s.channel}`
        : `${s.incomeTime}|${s.vendorId}`;

    let row = map.get(key);
    if (!row) {
      row = {
        id: key,
        time: s.incomeTime,
        settlementIncome: 0,
        settlementRefund: 0,
        settlementPaymentAmount: 0,
        ...(dimension === 'game' ? { gameId: s.gameId, gameName } : {}),
        ...(dimension === 'channel' ? { channel: s.channel, paymentGameIds: new Set<string>() } : {}),
        ...(dimension === 'vendor' ? { vendorId: s.vendorId, vendorName, paymentGameIds: new Set<string>() } : {}),
      };
      map.set(key, row);
    }

    if (dimension !== 'game') {
      if (!row.paymentGameIds) row.paymentGameIds = new Set<string>();
      row.paymentGameIds.add(s.gameId);
    }

    if (s.type === 'refund') {
      row.settlementRefund += s.settlementIncome;
    } else {
      row.settlementIncome += s.settlementIncome;
    }
  }

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      totalRevenue: row.settlementIncome - row.settlementRefund,
    }))
    .sort((a, b) => {
      const byTime = b.time.localeCompare(a.time);
      if (byTime !== 0) return byTime;
      const keyA = a.gameId ?? a.channel ?? a.vendorId ?? '';
      const keyB = b.gameId ?? b.channel ?? b.vendorId ?? '';
      return keyA.localeCompare(keyB);
    });
}

const DIMENSION_OPTIONS: { value: QueryDimension; label: string }[] = [
  { value: 'game', label: '游戏' },
  { value: 'channel', label: '渠道' },
  { value: 'vendor', label: '厂商' },
];

const REVENUE_CHANNEL_FILTER_OPTIONS = selectOptions([...INTERNAL_CHANNELS, ...EXTERNAL_CHANNELS]);

const SETTLEMENT_PAYMENT_COLUMN = {
  ...COL_ALIGN_RIGHT,
  key: 'settlementPaymentAmount',
  title: '结算付款金额',
  render: (r: SummaryRow) => SETTLEMENT_AMOUNT(r.settlementPaymentAmount),
};

export function RevenueSummaryPage() {
  const { scopedSettlements, scopedGamePayments, contracts, getVendorName, getGameName, getGame, getVendor } = useAppStore();
  const [dimension, setDimension] = useState<QueryDimension>('game');
  const [monthRange, setMonthRange] = useState(getSampleMonthRange);
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [channelFilter, setChannelFilter] = useState('');

  useEffect(() => {
    setChannelFilter('');
  }, [dimension]);

  const contractMap = useMemo(
    () => new Map(contracts.map((c) => [c.gameId, c])),
    [contracts],
  );

  const allRows = useMemo(() => {
    const base = buildSummaryRows(
      scopedSettlements,
      dimension,
      monthRange,
      search,
      getVendorName,
      getGameName,
    );
    const withSettlementPayment = attachSettlementPaymentAmount(
      base,
      dimension,
      scopedGamePayments,
      monthRange,
      search,
      getGame,
      getGameName,
      getVendorName,
    );
    return attachPaymentAmount(withSettlementPayment, dimension, contractMap, getGame, getVendor);
  }, [scopedSettlements, scopedGamePayments, dimension, monthRange, search, getVendorName, getGameName, contractMap, getGame, getVendor]);

  const rows = useMemo(() => {
    if (dimension !== 'channel' || !channelFilter) return allRows;
    return allRows.filter((row) => row.channel === channelFilter);
  }, [allRows, dimension, channelFilter]);

  const summaryTotals = useMemo(() => computeSummaryTotals(rows), [rows]);
  const leadingRow = rows.length > 0 ? buildSummaryLeadingRow(dimension, summaryTotals) : undefined;

  const columns = dimension === 'game'
    ? [
        { key: 'time', title: '时间', render: (r: SummaryRow) => r.time },
        { key: 'game', title: '游戏ID / 游戏名称', render: (r: SummaryRow) => <DualCell main={r.gameName!} sub={r.gameId!} /> },
        PAYMENT_COLUMN,
        { ...COL_ALIGN_RIGHT, key: 'totalRevenue', title: '总收入', render: (r: SummaryRow) => SETTLEMENT_AMOUNT(r.totalRevenue) },
        SETTLEMENT_PAYMENT_COLUMN,
      ]
    : dimension === 'channel'
      ? [
          { key: 'time', title: '时间', render: (r: SummaryRow) => r.time },
          {
            key: 'channel',
            title: '渠道',
            filter: {
              type: 'select' as const,
              value: channelFilter,
              onChange: setChannelFilter,
              options: REVENUE_CHANNEL_FILTER_OPTIONS,
            },
            render: (r: SummaryRow) => r.channel,
          },
          PAYMENT_COLUMN,
          { ...COL_ALIGN_RIGHT, key: 'totalRevenue', title: '总收入', render: (r: SummaryRow) => SETTLEMENT_AMOUNT(r.totalRevenue) },
          SETTLEMENT_PAYMENT_COLUMN,
        ]
      : [
          { key: 'time', title: '时间', render: (r: SummaryRow) => r.time },
          { key: 'vendorId', title: '厂商ID', render: (r: SummaryRow) => r.vendorId },
          { key: 'vendorName', title: '厂商名称', render: (r: SummaryRow) => r.vendorName },
          PAYMENT_COLUMN,
          { ...COL_ALIGN_RIGHT, key: 'totalRevenue', title: '总收入', render: (r: SummaryRow) => SETTLEMENT_AMOUNT(r.totalRevenue) },
          SETTLEMENT_PAYMENT_COLUMN,
        ];

  return (
    <div className="agf-card">
      <FilterBar>
        <select
          className="agf-select"
          value={dimension}
          onChange={(e) => setDimension(e.target.value as QueryDimension)}
          aria-label="查询维度"
        >
          {DIMENSION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <MonthRangePicker value={monthRange} onChange={setMonthRange} />
        <ListSearchFields mode="gameAndVendor" value={search} onChange={setSearch} />
      </FilterBar>
      <DataTable key={dimension} rowKey={(r) => r.id} data={rows} columns={columns} leadingRow={leadingRow} />
    </div>
  );
}
