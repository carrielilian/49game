import React, { useEffect, useMemo, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { useAppStore } from '../data/store';
import { formatMoney } from '../utils/settlement';

type StatTab = 'vendor' | 'channel' | 'game';

interface Props {
  defaultTab?: StatTab;
}

export function StatisticsPage({ defaultTab = 'vendor' }: Props) {
  const { settlements, getVendorName, getGame } = useAppStore();
  const [tab, setTab] = useState<StatTab>(defaultTab);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);
  const [yearMonth, setYearMonth] = useState('');

  const internalSettled = useMemo(() =>
    settlements.filter((s) => {
      if (s.type !== 'internal' || !s.settled) return false;
      if (yearMonth && s.incomeTime !== yearMonth) return false;
      return true;
    }),
  [settlements, yearMonth]);

  const vendorStats = useMemo(() => {
    const map = new Map<string, number>();
    internalSettled.forEach((s) => map.set(s.vendorId, (map.get(s.vendorId) ?? 0) + s.grossRevenue));
    return Array.from(map.entries()).map(([vendorId, total]) => ({
      id: vendorId, name: getVendorName(vendorId), total,
    }));
  }, [internalSettled, getVendorName]);

  const channelStats = useMemo(() => {
    const map = new Map<string, number>();
    internalSettled.forEach((s) => map.set(s.channel, (map.get(s.channel) ?? 0) + s.grossRevenue));
    return Array.from(map.entries()).map(([channel, total]) => ({ id: channel, name: channel, total }));
  }, [internalSettled]);

  const gameStats = useMemo(() => {
    const map = new Map<string, number>();
    internalSettled.forEach((s) => map.set(s.gameId, (map.get(s.gameId) ?? 0) + s.grossRevenue));
    return Array.from(map.entries()).map(([gameId, total]) => ({
      id: gameId, name: getGame(gameId)?.name ?? gameId, total,
    }));
  }, [internalSettled, getGame]);

  const dataMap = { vendor: vendorStats, channel: channelStats, game: gameStats };

  const timeFilter = {
    type: 'select' as const,
    value: yearMonth,
    onChange: setYearMonth,
    options: Array.from(new Set(settlements.filter((s) => s.type === 'internal' && s.settled).map((s) => s.incomeTime)))
      .sort()
      .reverse()
      .map((t) => ({ label: t, value: t })),
  };

  const timeLabel = yearMonth || '全部';

  const vendorColumns = [
    { key: 'time', title: '时间（年/月）', filter: timeFilter, render: () => timeLabel },
    { key: 'vendorId', title: '厂商ID', render: (r: { id: string }) => r.id },
    { key: 'vendorName', title: '厂商名称', render: (r: { name: string }) => r.name },
    { key: 'total', title: '总收入', render: (r: { total: number }) => formatMoney(r.total) },
  ];

  const channelColumns = [
    { key: 'time', title: '时间（年/月）', filter: timeFilter, render: () => timeLabel },
    { key: 'channel', title: '渠道', render: (r: { name: string }) => r.name },
    { key: 'total', title: '总收入', render: (r: { total: number }) => formatMoney(r.total) },
  ];

  const gameColumns = [
    { key: 'time', title: '时间（年/月）', filter: timeFilter, render: () => timeLabel },
    { key: 'gameId', title: '游戏ID', render: (r: { id: string }) => r.id },
    { key: 'gameName', title: '游戏名称', render: (r: { name: string }) => r.name },
    { key: 'total', title: '总收入', render: (r: { total: number }) => formatMoney(r.total) },
  ];

  const columns = tab === 'vendor' ? vendorColumns : tab === 'channel' ? channelColumns : gameColumns;

  return (
    <div className="agf-card">
      <div className="agf-tabs">
        <button type="button" className={`agf-tab${tab === 'vendor' ? ' agf-tab--active' : ''}`} onClick={() => setTab('vendor')}>厂商收入统计</button>
        <button type="button" className={`agf-tab${tab === 'channel' ? ' agf-tab--active' : ''}`} onClick={() => setTab('channel')}>渠道收入统计</button>
        <button type="button" className={`agf-tab${tab === 'game' ? ' agf-tab--active' : ''}`} onClick={() => setTab('game')}>游戏收入统计</button>
      </div>
      <DataTable rowKey={(r) => r.id} data={dataMap[tab]} columns={columns} />
    </div>
  );
}
