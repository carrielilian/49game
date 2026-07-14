import React, { useMemo, useState } from 'react';
import { DataTable, DualCell } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { MonthRangePicker } from '../components/MonthRangePicker';
import { ListSearchFields } from '../components/ListSearchFields';
import { useAppStore } from '../data/store';
import type { SettlementRecord } from '../data/types';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';
import { getSampleMonthRange, isMonthInRange, type MonthRange } from '../utils/monthRange';
import { formatMoney } from '../utils/settlement';

export type StatMode = 'vendor' | 'channel' | 'game';

interface Props {
  mode: StatMode;
}

interface VendorStatRow {
  id: string;
  time: string;
  vendorId: string;
  vendorName: string;
  totalRevenue: number;
  settlementIncome: number;
  settlementRefund: number;
}

interface ChannelStatRow {
  id: string;
  time: string;
  channel: string;
  totalRevenue: number;
  settlementIncome: number;
  settlementRefund: number;
}

interface GameStatRow {
  id: string;
  time: string;
  gameId: string;
  gameName: string;
  totalRevenue: number;
  settlementIncome: number;
  settlementRefund: number;
}

function aggregateSettled(settlements: SettlementRecord[]) {
  return settlements.filter((s) => s.settled);
}

function buildVendorStats(settlements: SettlementRecord[], getVendorName: (id: string) => string): VendorStatRow[] {
  const map = new Map<string, VendorStatRow>();
  for (const s of aggregateSettled(settlements)) {
    const key = `${s.incomeTime}|${s.vendorId}`;
    let row = map.get(key);
    if (!row) {
      row = {
        id: key,
        time: s.incomeTime,
        vendorId: s.vendorId,
        vendorName: getVendorName(s.vendorId),
        totalRevenue: 0,
        settlementIncome: 0,
        settlementRefund: 0,
      };
      map.set(key, row);
    }
    if (s.type === 'refund') {
      row.settlementRefund += s.settlementIncome;
    } else {
      row.totalRevenue += s.grossRevenue;
      row.settlementIncome += s.settlementIncome;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.time.localeCompare(a.time) || a.vendorId.localeCompare(b.vendorId));
}

function buildChannelStats(settlements: SettlementRecord[]): ChannelStatRow[] {
  const map = new Map<string, ChannelStatRow>();
  for (const s of aggregateSettled(settlements)) {
    const key = `${s.incomeTime}|${s.channel}`;
    let row = map.get(key);
    if (!row) {
      row = {
        id: key,
        time: s.incomeTime,
        channel: s.channel,
        totalRevenue: 0,
        settlementIncome: 0,
        settlementRefund: 0,
      };
      map.set(key, row);
    }
    if (s.type === 'refund') {
      row.settlementRefund += s.settlementIncome;
    } else {
      row.totalRevenue += s.grossRevenue;
      row.settlementIncome += s.settlementIncome;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.time.localeCompare(a.time) || a.channel.localeCompare(b.channel));
}

function buildGameStats(settlements: SettlementRecord[], getGameName: (id: string) => string): GameStatRow[] {
  const map = new Map<string, GameStatRow>();
  for (const s of aggregateSettled(settlements)) {
    const key = `${s.incomeTime}|${s.gameId}`;
    let row = map.get(key);
    if (!row) {
      row = {
        id: key,
        time: s.incomeTime,
        gameId: s.gameId,
        gameName: getGameName(s.gameId),
        totalRevenue: 0,
        settlementIncome: 0,
        settlementRefund: 0,
      };
      map.set(key, row);
    }
    if (s.type === 'refund') {
      row.settlementRefund += s.settlementIncome;
    } else {
      row.totalRevenue += s.grossRevenue;
      row.settlementIncome += s.settlementIncome;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.time.localeCompare(a.time) || a.gameId.localeCompare(b.gameId));
}

function StatFilterBar({
  mode,
  search,
  onSearchChange,
  monthRange,
  onMonthRangeChange,
}: {
  mode: StatMode;
  search: ListSearchQuery;
  onSearchChange: (v: ListSearchQuery) => void;
  monthRange: MonthRange;
  onMonthRangeChange: (v: MonthRange) => void;
}) {
  return (
    <FilterBar>
      <MonthRangePicker value={monthRange} onChange={onMonthRangeChange} />
      {mode === 'vendor' && <ListSearchFields mode="vendor" value={search} onChange={onSearchChange} />}
      {mode === 'game' && <ListSearchFields mode="game" value={search} onChange={onSearchChange} />}
    </FilterBar>
  );
}

export function StatisticsPage({ mode }: Props) {
  const { scopedSettlements, getVendorName, getGameName } = useAppStore();
  const [monthRange, setMonthRange] = useState(getSampleMonthRange);
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);

  const filterByTime = <T extends { time: string }>(rows: T[]) =>
    rows.filter((r) => isMonthInRange(r.time, monthRange));

  const vendorRows = useMemo(() => {
    const rows = buildVendorStats(scopedSettlements, getVendorName);
    return filterByTime(rows).filter((r) =>
      matchesListSearch(search, { vendorId: r.vendorId, vendorName: r.vendorName }),
    );
  }, [scopedSettlements, getVendorName, monthRange, search]);

  const channelRows = useMemo(() => filterByTime(buildChannelStats(scopedSettlements)), [scopedSettlements, monthRange]);

  const gameRows = useMemo(() => {
    const rows = buildGameStats(scopedSettlements, getGameName);
    return filterByTime(rows).filter((r) =>
      matchesListSearch(search, { gameId: r.gameId, gameName: r.gameName }),
    );
  }, [scopedSettlements, getGameName, monthRange, search]);

  const filterBar = (
    <StatFilterBar
      mode={mode}
      search={search}
      onSearchChange={setSearch}
      monthRange={monthRange}
      onMonthRangeChange={setMonthRange}
    />
  );

  if (mode === 'vendor') {
    return (
      <div className="agf-card">
        {filterBar}
        <DataTable
          rowKey={(r) => r.id}
          data={vendorRows}
          columns={[
            { key: 'time', title: '时间', render: (r) => r.time },
            { key: 'vendorId', title: '厂商ID', render: (r) => r.vendorId },
            { key: 'vendorName', title: '厂商名称', render: (r) => r.vendorName },
            { key: 'totalRevenue', title: '总收入', render: (r) => formatMoney(r.totalRevenue) },
            { key: 'settlementIncome', title: '结算收入', render: (r) => formatMoney(r.settlementIncome) },
            { key: 'settlementRefund', title: '结算退款', render: (r) => formatMoney(r.settlementRefund) },
          ]}
        />
      </div>
    );
  }

  if (mode === 'channel') {
    return (
      <div className="agf-card">
        {filterBar}
        <DataTable
          rowKey={(r) => r.id}
          data={channelRows}
          columns={[
            { key: 'time', title: '时间', render: (r) => r.time },
            { key: 'channel', title: '渠道', render: (r) => r.channel },
            { key: 'totalRevenue', title: '总收入', render: (r) => formatMoney(r.totalRevenue) },
            { key: 'settlementIncome', title: '结算收入', render: (r) => formatMoney(r.settlementIncome) },
            { key: 'settlementRefund', title: '结算退款', render: (r) => formatMoney(r.settlementRefund) },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="agf-card">
      {filterBar}
      <DataTable
        rowKey={(r) => r.id}
        data={gameRows}
        columns={[
          { key: 'time', title: '时间', render: (r) => r.time },
          { key: 'game', title: '游戏ID / 游戏名称', render: (r) => <DualCell main={r.gameName} sub={r.gameId} /> },
          { key: 'totalRevenue', title: '总收入', render: (r) => formatMoney(r.totalRevenue) },
          { key: 'settlementIncome', title: '结算收入', render: (r) => formatMoney(r.settlementIncome) },
          { key: 'settlementRefund', title: '结算退款', render: (r) => formatMoney(r.settlementRefund) },
        ]}
      />
    </div>
  );
}
