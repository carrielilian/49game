import React, { useMemo, useState } from 'react';
import { DataTable, DualCell } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { MonthRangePicker } from '../components/MonthRangePicker';
import { ListSearchFields } from '../components/ListSearchFields';
import { useAppStore } from '../data/store';
import type { SettlementRecord } from '../data/types';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';
import { getSampleMonthRange, isMonthInRange } from '../utils/monthRange';
import { formatMoney } from '../utils/settlement';

type QueryDimension = 'game' | 'channel' | 'vendor';

interface SummaryRow {
  id: string;
  time: string;
  gameId?: string;
  gameName?: string;
  vendorId?: string;
  vendorName?: string;
  channel?: string;
  totalRevenue: number;
  settlementIncome: number;
  settlementRefund: number;
}

function buildSummaryRows(
  settlements: SettlementRecord[],
  dimension: QueryDimension,
  monthRange: { start: string; end: string },
  search: ListSearchQuery,
  getVendorName: (id: string) => string,
  getGameName: (id: string) => string,
): SummaryRow[] {
  const map = new Map<string, Omit<SummaryRow, 'totalRevenue'>>();

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
        ...(dimension === 'game' ? { gameId: s.gameId, gameName } : {}),
        ...(dimension === 'channel' ? { channel: s.channel } : {}),
        ...(dimension === 'vendor' ? { vendorId: s.vendorId, vendorName } : {}),
      };
      map.set(key, row);
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

export function RevenueSummaryPage() {
  const { settlements, getVendorName, getGameName } = useAppStore();
  const [dimension, setDimension] = useState<QueryDimension>('game');
  const [monthRange, setMonthRange] = useState(getSampleMonthRange);
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);

  const rows = useMemo(
    () => buildSummaryRows(
      settlements,
      dimension,
      monthRange,
      search,
      getVendorName,
      getGameName,
    ),
    [settlements, dimension, monthRange, search, getVendorName, getGameName],
  );

  const columns = dimension === 'game'
    ? [
        { key: 'time', title: '时间', render: (r: SummaryRow) => r.time },
        { key: 'game', title: '游戏ID / 游戏名称', render: (r: SummaryRow) => <DualCell main={r.gameName!} sub={r.gameId!} /> },
        { key: 'totalRevenue', title: '总收入', render: (r: SummaryRow) => formatMoney(r.totalRevenue) },
        { key: 'settlementIncome', title: '结算收入', render: (r: SummaryRow) => formatMoney(r.settlementIncome) },
        { key: 'settlementRefund', title: '结算退款', render: (r: SummaryRow) => formatMoney(r.settlementRefund) },
      ]
    : dimension === 'channel'
      ? [
          { key: 'time', title: '时间', render: (r: SummaryRow) => r.time },
          { key: 'channel', title: '渠道', render: (r: SummaryRow) => r.channel },
          { key: 'totalRevenue', title: '总收入', render: (r: SummaryRow) => formatMoney(r.totalRevenue) },
          { key: 'settlementIncome', title: '结算收入', render: (r: SummaryRow) => formatMoney(r.settlementIncome) },
          { key: 'settlementRefund', title: '结算退款', render: (r: SummaryRow) => formatMoney(r.settlementRefund) },
        ]
      : [
          { key: 'time', title: '时间', render: (r: SummaryRow) => r.time },
          { key: 'vendorId', title: '厂商ID', render: (r: SummaryRow) => r.vendorId },
          { key: 'vendorName', title: '厂商名称', render: (r: SummaryRow) => r.vendorName },
          { key: 'totalRevenue', title: '总收入', render: (r: SummaryRow) => formatMoney(r.totalRevenue) },
          { key: 'settlementIncome', title: '结算收入', render: (r: SummaryRow) => formatMoney(r.settlementIncome) },
          { key: 'settlementRefund', title: '结算退款', render: (r: SummaryRow) => formatMoney(r.settlementRefund) },
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
      <DataTable key={dimension} rowKey={(r) => r.id} data={rows} columns={columns} />
    </div>
  );
}
