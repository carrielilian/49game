import React, { useEffect, useMemo, useState } from 'react';
import { COL_ALIGN_RIGHT, DataTable, DualCell } from '../components/DataTable';
import { ColumnFilter } from '../components/ColumnFilter';
import { FilterBar } from '../components/FilterBar';
import { MonthRangePicker } from '../components/MonthRangePicker';
import { StatusBadge } from '../components/StatusBadge';
import { Toast, type ToastType } from '../components/Modal';
import { useAppStore } from '../data/store';
import { PAYMENT_APPLY_STATUS_FILTER_OPTIONS, selectOptions } from '../utils/columnFilters';
import {
  checkFinanceCenterReady,
  fetchFinanceCenterRows,
  getInternalChannelCategory,
  INTERNAL_CHANNEL_CATEGORIES,
} from '../utils/financeCenter';
import { ListSearchFields } from '../components/ListSearchFields';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';
import { getPreviousMonthKey, getRecentTwoMonthsRange, isMonthInRange, type MonthRange } from '../utils/monthRange';
import {
  displaySettlementFormula,
  formatCurrencyMoney,
  formatSettlementIncome,
  formatSettlementTime,
  isUnsettledSettlement,
  SETTLEMENT_CURRENCY,
} from '../utils/settlement';
import { compareSettlementAddedDesc } from '../utils/listSort';

interface Props {
  type: 'internal' | 'refund';
}

export function InternalSettlementPage({ type }: Props) {
  const {
    businessType,
    scopedSettlements,
    scopedGames,
    formulas,
    getGameName,
    getVendorName,
    pullInternal,
    settleRecords,
    internalSettlementButtons,
    setInternalSettlementButtons,
  } = useAppStore();
  const scopedGameIds = useMemo(() => new Set(scopedGames.map((g) => g.id)), [scopedGames]);
  const scopedFormulas = useMemo(
    () => formulas.filter((f) => scopedGameIds.has(f.gameId)),
    [formulas, scopedGameIds],
  );
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [monthRange, setMonthRange] = useState<MonthRange>(
    () => internalSettlementButtons[businessType][type].monthRange ?? getRecentTwoMonthsRange(),
  );
  const [channelFilter, setChannelFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(false);
  const { pullCompleted } = internalSettlementButtons[businessType][type];

  useEffect(() => {
    const prevMonth = getPreviousMonthKey();
    const saved = internalSettlementButtons[businessType][type].monthRange;
    const isLegacyPullSingleMonth = saved
      && pullCompleted
      && saved.start === saved.end
      && saved.start === prevMonth;

    if (isLegacyPullSingleMonth || !saved) {
      const range = getRecentTwoMonthsRange();
      setMonthRange(range);
      setInternalSettlementButtons(type, { monthRange: range });
      return;
    }

    setMonthRange(saved);
  }, [type, businessType, pullCompleted, internalSettlementButtons, setInternalSettlementButtons]);

  const handleMonthRangeChange = (range: MonthRange) => {
    setMonthRange(range);
    setInternalSettlementButtons(type, { monthRange: range });
  };

  const incomeLabel = type === 'internal' ? '结算收入' : '结算退款';
  const ann = type === 'internal' ? 'income-settlement' : 'internal-refund';
  const amountLabel = type === 'internal' ? '待结算金额' : '退款金额';
  const displayFormula = (formulaText?: string) => {
    const formula = displaySettlementFormula(formulaText);
    return type === 'refund' ? formula.replace('待结算金额', '退款金额') : formula;
  };

  const data = scopedSettlements.filter((s) => {
    if (s.type !== type) return false;
    if (!isMonthInRange(s.incomeTime, monthRange)) return false;
    if (!matchesListSearch(search, {
      gameId: s.gameId,
      gameName: getGameName(s.gameId),
      vendorId: s.vendorId,
      vendorName: getVendorName(s.vendorId),
    })) return false;
    if (channelFilter && getInternalChannelCategory(s.channel) !== channelFilter) return false;
    if (paymentStatusFilter && s.paymentApplyStatus !== paymentStatusFilter) return false;
    return true;
  }).sort(compareSettlementAddedDesc);

  const pullDisabled = loading || pullCompleted;
  const unsettled = data.filter((record) => isUnsettledSettlement(record));
  const settleDisabled = loading || unsettled.length === 0;

  const handlePull = async () => {
    if (pullDisabled) return;
    setLoading(true);
    try {
      const ready = await checkFinanceCenterReady();
      if (!ready) {
        setToast({ message: '财务中心还未结算完成', type: 'error' });
        return;
      }
      const incomeMonthKey = getPreviousMonthKey();
      const rows = fetchFinanceCenterRows(type, scopedFormulas, scopedGames, incomeMonthKey, businessType);
      pullInternal(type, rows, incomeMonthKey);
      const range = getRecentTwoMonthsRange();
      setMonthRange(range);
      setInternalSettlementButtons(type, { pullCompleted: true, settleCompleted: false, monthRange: range });
      setToast({ message: '已从财务中心拉取待结算数据', type: 'success' });
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = () => {
    if (settleDisabled) return;
    if (unsettled.length === 0) {
      setToast({ message: '没有待结算数据', type: 'error' });
      return;
    }
    const ids = unsettled.map((record) => record.id);
    const result = settleRecords(ids);
    if (!result.ok) {
      setToast({ message: result.message ?? '结算失败，本次数据均未结算', type: 'error' });
      return;
    }
    const settledIdSet = new Set(ids);
    const hasRemaining = scopedSettlements.some((record) =>
      record.type === type
      && isUnsettledSettlement(record)
      && !settledIdSet.has(record.id));
    setInternalSettlementButtons(type, {
      pullCompleted,
      settleCompleted: pullCompleted && !hasRemaining,
    });
    setToast({ message: '结算成功', type: 'success' });
  };

  return (
    <div className="agf-card">
      <div data-annotation-id={`${ann}-query`}>
        <FilterBar
          actions={
            <>
              <button
                type="button"
                className="agf-btn agf-btn--primary"
                data-annotation-id={`${ann}-pull`}
                onClick={handlePull}
                disabled={pullDisabled}
              >
                {loading ? '拉取中...' : '数据拉取'}
              </button>
              <button
                type="button"
                className="agf-btn agf-btn--primary"
                data-annotation-id={`${ann}-settle`}
                onClick={handleSettle}
                disabled={settleDisabled}
              >
                结算
              </button>
            </>
          }
        >
          <MonthRangePicker value={monthRange} onChange={handleMonthRangeChange} />
          <ListSearchFields mode="gameAndVendor" value={search} onChange={setSearch} />
        </FilterBar>
      </div>
      <div data-annotation-id={`${ann}-table`}>
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
          { key: 'vendor', title: '厂商ID / 厂商名称', render: (r) => <DualCell main={getVendorName(r.vendorId)} sub={r.vendorId} /> },
          {
            key: 'channel',
            title: '渠道',
            header: (
              <span data-annotation-id={`${ann}-channel-col`}>
                <ColumnFilter
                  title="渠道"
                  filter={{
                    type: 'select',
                    value: channelFilter,
                    onChange: setChannelFilter,
                    options: selectOptions(INTERNAL_CHANNEL_CATEGORIES),
                  }}
                />
              </span>
            ),
            render: (r) => getInternalChannelCategory(r.channel),
          },
          { ...COL_ALIGN_RIGHT, key: 'settleAmt', title: amountLabel, render: (r) => formatCurrencyMoney(r.settlementAmount, SETTLEMENT_CURRENCY) },
          { ...COL_ALIGN_RIGHT, key: 'settleInc', title: incomeLabel, render: (r) => formatSettlementIncome(r) },
          { key: 'formula', title: '结算公式', render: (r) => displayFormula(r.formulaText) },
          { key: 'settleTime', title: '结算时间', render: (r) => formatSettlementTime(r) },
          {
            key: 'status',
            title: '申请付款状态',
            header: (
              <span data-annotation-id={`${ann}-payment-col`}>
                <ColumnFilter
                  title="申请付款状态"
                  filter={{
                    type: 'select',
                    value: paymentStatusFilter,
                    onChange: setPaymentStatusFilter,
                    options: PAYMENT_APPLY_STATUS_FILTER_OPTIONS,
                  }}
                />
              </span>
            ),
            render: (r) => <StatusBadge text={r.paymentApplyStatus} />,
          },
        ]}
      />
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
