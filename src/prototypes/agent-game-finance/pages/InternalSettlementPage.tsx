import React, { useEffect, useMemo, useState } from 'react';
import { DataTable, DualCell } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { MonthRangePicker } from '../components/MonthRangePicker';
import { StatusBadge } from '../components/StatusBadge';
import { Toast, type ToastType } from '../components/Modal';
import { isFormulaConfigured, INTERNAL_CHANNELS } from '../data/mock-data';
import { useAppStore } from '../data/store';
import { PAYMENT_APPLY_STATUS_FILTER_OPTIONS, selectOptions } from '../utils/columnFilters';
import { checkFinanceCenterReady, fetchFinanceCenterRows } from '../utils/financeCenter';
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
  const { pullCompleted, settleCompleted } = internalSettlementButtons[businessType][type];

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

  const data = scopedSettlements.filter((s) => {
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

  const pullDisabled = loading || pullCompleted;
  const settleDisabled = loading || !pullCompleted || settleCompleted;

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
      const rows = fetchFinanceCenterRows(type, scopedFormulas, scopedGames, incomeMonthKey);
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
    const unsettled = data.filter((s) => isUnsettledSettlement(s));
    if (unsettled.length === 0) {
      setToast({ message: '没有待结算数据', type: 'error' });
      return;
    }
    const missingGameIds = [...new Set(unsettled.map((s) => s.gameId))].filter((gameId) => {
      const formula = scopedFormulas.find((f) => f.gameId === gameId);
      return !isFormulaConfigured(formula);
    });
    if (missingGameIds.length > 0) {
      const names = missingGameIds.map((id) => getGameName(id)).join('、');
      setToast({ message: `${names}未设置结算公式`, type: 'error' });
      return;
    }
    settleRecords(unsettled.map((s) => s.id));
    setInternalSettlementButtons(type, { pullCompleted, settleCompleted: true });
    setToast({ message: '结算成功', type: 'success' });
  };

  return (
    <div className="agf-card">
      <FilterBar
        actions={
          <>
            <button
              type="button"
              className="agf-btn agf-btn--primary"
              onClick={handlePull}
              disabled={pullDisabled}
            >
              {loading ? '拉取中...' : '数据拉取'}
            </button>
            <button
              type="button"
              className="agf-btn agf-btn--primary"
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
          { key: 'settleAmt', title: '待结算金额', render: (r) => formatCurrencyMoney(r.settlementAmount, SETTLEMENT_CURRENCY) },
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
