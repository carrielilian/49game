import React, { useState } from 'react';
import { DataTable, DualCell } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { MonthRangePicker } from '../components/MonthRangePicker';
import { StatusBadge } from '../components/StatusBadge';
import { Toast, type ToastType } from '../components/Modal';
import { INTERNAL_CHANNELS } from '../data/mock-data';
import { useAppStore } from '../data/store';
import { PAYMENT_APPLY_STATUS_FILTER_OPTIONS, selectOptions } from '../utils/columnFilters';
import { ListSearchFields } from '../components/ListSearchFields';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';
import { getSampleMonthRange, isMonthInRange } from '../utils/monthRange';
import {
  displaySettlementFormula,
  formatMoney,
  formatSettlementIncome,
  formatSettlementTime,
  isUnsettledSettlement,
} from '../utils/settlement';

interface Props {
  type: 'internal' | 'refund';
}

export function InternalSettlementPage({ type }: Props) {
  const { settlements, getGameName, getVendorName, pullInternal, settleRecords } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [monthRange, setMonthRange] = useState(getSampleMonthRange);
  const [channelFilter, setChannelFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);

  const incomeLabel = type === 'internal' ? '结算收入' : '结算退款';

  const data = settlements.filter((s) => {
    if (s.type !== type) return false;
    if (!isMonthInRange(s.incomeTime, monthRange)) return false;
    if (!matchesListSearch(search, {
      gameId: s.gameId,
      gameName: getGameName(s.gameId),
      vendorId: s.vendorId,
      vendorName: getVendorName(s.vendorId),
    })) return false;
    if (channelFilter && s.channel !== channelFilter) return false;
    if (paymentStatusFilter && s.paymentApplyStatus !== paymentStatusFilter) return false;
    return true;
  });

  const handlePull = () => {
    setLoading(true);
    setTimeout(() => {
      pullInternal(type);
      setLoading(false);
      setToast({
        message: type === 'internal' ? '已从财务中心拉取待结算数据' : '已从财务中心拉取待退款数据',
        type: 'success',
      });
    }, 800);
  };

  const handleSettle = () => {
    const ids = data.filter((s) => isUnsettledSettlement(s)).map((s) => s.id);
    if (ids.length === 0) {
      setToast({ message: '没有待结算数据', type: 'error' });
      return;
    }
    settleRecords(ids);
    setToast({
      message: `已完成 ${ids.length} 条${type === 'internal' ? '结算' : '退款结算'}`,
      type: 'success',
    });
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
        <MonthRangePicker value={monthRange} onChange={setMonthRange} />
        <ListSearchFields mode="gameAndVendor" value={search} onChange={setSearch} />
      </FilterBar>
      <DataTable
        rowKey={(r) => r.id}
        data={data}
        columns={[
          {
            key: 'time',
            title: type === 'internal' ? '收入时间' : '退款时间',
            render: (r) => r.incomeTime,
          },
          { key: 'game', title: '游戏ID / 游戏名称', render: (r) => <DualCell main={getGameName(r.gameId)} sub={r.gameId} /> },
          { key: 'vendorId', title: '厂商ID', render: (r) => r.vendorId },
          { key: 'vendorName', title: '厂商名称', render: (r) => getVendorName(r.vendorId) },
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
          { key: 'settleAmt', title: '待结算金额', render: (r) => formatMoney(r.settlementAmount) },
          { key: 'settleInc', title: incomeLabel, render: (r) => formatSettlementIncome(r) },
          { key: 'formula', title: '结算公式', render: (r) => displaySettlementFormula(r.formulaText) },
          { key: 'settleTime', title: '结算时间', render: (r) => formatSettlementTime(r) },
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
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
