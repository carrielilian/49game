import React, { useEffect, useMemo, useState } from 'react';
import { COL_ALIGN_RIGHT, DataTable, DualCell, renderCurrencyTotals } from '../components/DataTable';
import { ColumnFilter } from '../components/ColumnFilter';
import { FilterBar } from '../components/FilterBar';
import { MonthRangePicker } from '../components/MonthRangePicker';
import { ListSearchFields } from '../components/ListSearchFields';
import { Toast, type ToastType } from '../components/Modal';
import { useAppStore } from '../data/store';
import { EXTERNAL_CHANNELS, INTERNAL_CHANNELS } from '../data/mock-data';
import type { Contract, ContractCurrency, Game, GamePaymentRequest, SettlementRecord } from '../data/types';
import { sumContractPaymentsByCurrency } from '../utils/currencySnapshot';
import { selectOptions } from '../utils/columnFilters';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';
import { downloadCsv } from '../utils/listExport';
import { getSampleMonthRange, isMonthInRange } from '../utils/monthRange';
import { isPaidPayment } from '../utils/payment';
import { formatCurrencyMoney, formatDateTime, SETTLEMENT_CURRENCY } from '../utils/settlement';

type QueryDimension = 'game' | 'channel' | 'vendor';

interface SummaryRow {
  id: string;
  time: string;
  gameId?: string;
  gameName?: string;
  vendorId?: string;
  vendorName?: string;
  channel?: string;
  paymentByCurrency: Partial<Record<ContractCurrency, number>>;
  totalRevenue: number;
  settlementIncome: number;
  settlementRefund: number;
  settlementPaymentAmount: number;
  /** 渠道/厂商维度汇总支付金额时关联的游戏 */
  paymentGameIds?: Set<string>;
}

function attachPaymentAmount(
  rows: Array<Omit<SummaryRow, 'paymentByCurrency'> & { paymentGameIds?: Set<string> }>,
  dimension: QueryDimension,
  contractMap: Map<string, Contract>,
): SummaryRow[] {
  return rows.map((row) => {
    const gameIds = dimension === 'game'
      ? (row.gameId ? [row.gameId] : [])
      : Array.from(row.paymentGameIds ?? []);
    const paymentByCurrency = sumContractPaymentsByCurrency(gameIds, contractMap);
    const { paymentGameIds: _omit, ...rest } = row;
    return { ...rest, paymentByCurrency };
  });
}

function getPayMonth(payTime?: string): string | null {
  if (!payTime || payTime.length < 7) return null;
  return payTime.slice(0, 7);
}

function attachSettlementPaymentAmount(
  rows: Array<Omit<SummaryRow, 'paymentByCurrency'> & { paymentGameIds?: Set<string> }>,
  dimension: QueryDimension,
  gamePayments: GamePaymentRequest[],
  monthRange: { start: string; end: string },
  search: ListSearchQuery,
  getGame: (id: string) => Game | undefined,
  getGameName: (id: string) => string,
  getVendorName: (id: string) => string,
): Array<Omit<SummaryRow, 'paymentByCurrency'> & { paymentGameIds?: Set<string> }> {
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

function formatPaymentAmount(paymentByCurrency: Partial<Record<ContractCurrency, number>>): React.ReactNode {
  return renderCurrencyTotals(paymentByCurrency);
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
    for (const [currency, amount] of Object.entries(row.paymentByCurrency) as [ContractCurrency, number][]) {
      paymentByCurrency[currency] = (paymentByCurrency[currency] ?? 0) + amount;
    }
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
      <tr className="agf-table__summary-row" data-annotation-id="stats-summary-summary-row">
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
      <tr className="agf-table__summary-row" data-annotation-id="stats-summary-summary-row">
        <td>查询总计</td>
        <td />
        <td className={AMOUNT_CELL}>{paymentCell}</td>
        <td className={AMOUNT_CELL}>{revenueCell}</td>
        <td className={AMOUNT_CELL}>{settlementCell}</td>
      </tr>
    );
  }
  return (
    <tr className="agf-table__summary-row" data-annotation-id="stats-summary-summary-row">
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
  render: (r: SummaryRow) => formatPaymentAmount(r.paymentByCurrency),
};

function buildSummaryRows(
  settlements: SettlementRecord[],
  dimension: QueryDimension,
  monthRange: { start: string; end: string },
  search: ListSearchQuery,
  getVendorName: (id: string) => string,
  getGameName: (id: string) => string,
): Array<Omit<SummaryRow, 'paymentByCurrency'>> {
  const map = new Map<string, Omit<SummaryRow, 'paymentByCurrency'> & { paymentGameIds?: Set<string> }>();

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

const DIMENSION_LABEL: Record<QueryDimension, string> = {
  game: '游戏',
  channel: '渠道',
  vendor: '厂商',
};

const PAYMENT_CURRENCY_ORDER: ContractCurrency[] = ['人民币', '美金'];

function formatPaymentAmountExport(paymentByCurrency: Partial<Record<ContractCurrency, number>>): string {
  const lines = PAYMENT_CURRENCY_ORDER
    .map((currency) => ({ currency, amount: paymentByCurrency[currency] ?? 0 }))
    .filter(({ amount }) => amount !== 0);
  if (lines.length === 0) return formatCurrencyMoney(0, '人民币');
  return lines.map(({ currency, amount }) => formatCurrencyMoney(amount, currency)).join('\n');
}

function getExportHeaders(dimension: QueryDimension): string[] {
  if (dimension === 'game') {
    return ['时间', '游戏ID / 游戏名称', '支付金额', '总收入', '结算付款金额'];
  }
  if (dimension === 'channel') {
    return ['时间', '渠道', '支付金额', '总收入', '结算付款金额'];
  }
  return ['时间', '厂商ID', '厂商名称', '支付金额', '总收入', '结算付款金额'];
}

function rowToExport(row: SummaryRow, dimension: QueryDimension): string[] {
  const payment = formatPaymentAmountExport(row.paymentByCurrency);
  const totalRevenue = formatCurrencyMoney(row.totalRevenue, SETTLEMENT_CURRENCY);
  const settlementPayment = formatCurrencyMoney(row.settlementPaymentAmount, SETTLEMENT_CURRENCY);
  if (dimension === 'game') {
    return [row.time, `${row.gameId!} / ${row.gameName!}`, payment, totalRevenue, settlementPayment];
  }
  if (dimension === 'channel') {
    return [row.time, row.channel!, payment, totalRevenue, settlementPayment];
  }
  return [row.time, row.vendorId!, row.vendorName!, payment, totalRevenue, settlementPayment];
}

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
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

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
    return attachPaymentAmount(withSettlementPayment, dimension, contractMap);
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
            header: (
              <span data-annotation-id="stats-summary-channel-col">
                <ColumnFilter
                  title="渠道"
                  filter={{
                    type: 'select',
                    value: channelFilter,
                    onChange: setChannelFilter,
                    options: REVENUE_CHANNEL_FILTER_OPTIONS,
                  }}
                />
              </span>
            ),
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

  const handleExport = () => {
    const exportRows = rows.map((row) => rowToExport(row, dimension));
    const date = formatDateTime().slice(0, 10);
    downloadCsv(
      `收入汇总统计-${DIMENSION_LABEL[dimension]}-${date}.csv`,
      getExportHeaders(dimension),
      exportRows,
    );
    setToast({ message: '导出成功', type: 'success' });
  };

  return (
    <div className="agf-card">
      <div data-annotation-id="stats-summary-query">
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
          <button
            type="button"
            className="agf-btn agf-btn--primary"
            data-annotation-id="stats-summary-export"
            onClick={handleExport}
          >
            导出
          </button>
        </FilterBar>
      </div>
      <div data-annotation-id="stats-summary-table">
      <DataTable key={dimension} rowKey={(r) => r.id} data={rows} columns={columns} leadingRow={leadingRow} />
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
