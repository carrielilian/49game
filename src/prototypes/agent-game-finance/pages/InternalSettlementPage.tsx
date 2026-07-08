import React, { useMemo, useState } from 'react';
import { DataTable, DualCell } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { StatusBadge } from '../components/StatusBadge';
import { Toast } from '../components/Modal';
import { INTERNAL_CHANNELS } from '../data/mock-data';
import { useAppStore } from '../data/store';
import {
  PAYMENT_APPLY_STATUS_FILTER_OPTIONS,
  selectOptions,
  SETTLED_STATUS_FILTER_OPTIONS,
  uniqueOptions,
} from '../utils/columnFilters';
import { ListSearchFields } from '../components/ListSearchFields';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';
import { formatMoney } from '../utils/settlement';

interface Props {
  type: 'internal' | 'refund';
}

export function InternalSettlementPage({ type }: Props) {
  const { settlements, getGame, pullInternal, settleRecords } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [incomeTimeFilter, setIncomeTimeFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [settledFilter, setSettledFilter] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);

  const incomeLabel = type === 'internal' ? '结算收入' : '结算退款';

  const incomeTimeOptions = useMemo(
    () => uniqueOptions(settlements.filter((s) => s.type === type).map((s) => s.incomeTime)),
    [settlements, type],
  );

  const data = settlements.filter((s) => {
    if (s.type !== type) return false;
    if (!matchesListSearch(search, { gameId: s.gameId, gameName: getGame(s.gameId)?.name })) return false;
    if (incomeTimeFilter && s.incomeTime !== incomeTimeFilter) return false;
    if (channelFilter && s.channel !== channelFilter) return false;
    if (paymentStatusFilter && s.paymentApplyStatus !== paymentStatusFilter) return false;
    if (settledFilter === '已结算' && !s.settled) return false;
    if (settledFilter === '待结算' && s.settled) return false;
    return true;
  });

  const handlePull = () => {
    setLoading(true);
    setTimeout(() => {
      pullInternal(type);
      setLoading(false);
      setToast(type === 'internal' ? '已从财务中心拉取待结算数据' : '已从财务中心拉取待退款数据');
    }, 800);
  };

  const handleSettle = () => {
    const ids = selected.length > 0 ? selected : data.filter((s) => !s.settled).map((s) => s.id);
    if (ids.length === 0) { setToast('没有待结算数据'); return; }
    settleRecords(ids);
    setSelected([]);
    setToast(`已完成 ${ids.length} 条${type === 'internal' ? '结算' : '退款结算'}`);
  };

  const toggle = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div className="agf-card">
      <FilterBar
        actions={
          <>
            <button type="button" className="agf-btn agf-btn--default" onClick={handlePull} disabled={loading}>{loading ? '拉取中...' : '数据拉取'}</button>
            <button type="button" className="agf-btn agf-btn--primary" onClick={handleSettle}>结算</button>
          </>
        }
      >
        <ListSearchFields mode="game" value={search} onChange={setSearch} />
      </FilterBar>
      <DataTable
        rowKey={(r) => r.id}
        data={data}
        columns={[
          { key: 'sel', title: '', render: (r) => !r.settled ? <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} /> : null, width: '40px' },
          {
            key: 'time',
            title: type === 'internal' ? '收入时间' : '退款时间',
            filter: {
              type: 'select',
              value: incomeTimeFilter,
              onChange: setIncomeTimeFilter,
              options: incomeTimeOptions,
            },
            render: (r) => r.incomeTime,
          },
          { key: 'game', title: '游戏ID/游戏名称', render: (r) => <DualCell main={getGame(r.gameId)?.name ?? r.gameId} sub={r.gameId} /> },
          {
            key: 'channel',
            title: '渠道',
            filter: {
              type: 'select',
              value: channelFilter,
              onChange: setChannelFilter,
              options: selectOptions(INTERNAL_CHANNELS),
            },
            render: (r) => r.channel,
          },
          { key: 'gross', title: '总收入', render: (r) => formatMoney(r.grossRevenue) },
          { key: 'settleAmt', title: '结算金额', render: (r) => formatMoney(r.settlementAmount) },
          { key: 'settleInc', title: incomeLabel, render: (r) => formatMoney(r.settlementIncome) },
          { key: 'formula', title: '结算公式', render: (r) => r.formulaText },
          {
            key: 'settleTime',
            title: '结算时间',
            filter: {
              type: 'select',
              value: settledFilter,
              onChange: setSettledFilter,
              options: SETTLED_STATUS_FILTER_OPTIONS,
            },
            render: (r) => r.settlementTime ?? (r.settled ? '-' : '待结算'),
          },
          {
            key: 'status',
            title: '申请付款状态',
            filter: {
              type: 'select',
              value: paymentStatusFilter,
              onChange: setPaymentStatusFilter,
              options: PAYMENT_APPLY_STATUS_FILTER_OPTIONS,
            },
            render: (r) => <StatusBadge text={r.paymentApplyStatus} />,
          },
        ]}
      />
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
