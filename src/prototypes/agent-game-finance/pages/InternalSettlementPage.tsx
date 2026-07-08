import React, { useState } from 'react';
import { DataTable, DualCell } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { StatusBadge } from '../components/StatusBadge';
import { Toast } from '../components/Modal';
import { useAppStore } from '../data/store';
import { formatMoney } from '../utils/settlement';

interface Props {
  type: 'internal' | 'refund';
}

export function InternalSettlementPage({ type }: Props) {
  const { settlements, getGame, pullInternal, settleRecords } = useAppStore();
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);

  const incomeLabel = type === 'internal' ? '结算收入' : '结算退款';

  const data = settlements.filter((s) => s.type === type && (!keyword || s.gameId.includes(keyword) || getGame(s.gameId)?.name.includes(keyword)));

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
        <input className="agf-input" placeholder="游戏ID / 游戏名称" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      </FilterBar>
      <DataTable
        rowKey={(r) => r.id}
        data={data}
        columns={[
          { key: 'sel', title: '', render: (r) => !r.settled ? <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} /> : null, width: '40px' },
          { key: 'time', title: type === 'internal' ? '收入时间' : '退款时间', render: (r) => r.incomeTime },
          { key: 'game', title: '游戏ID/游戏名称', render: (r) => <DualCell main={getGame(r.gameId)?.name ?? r.gameId} sub={r.gameId} /> },
          { key: 'channel', title: '渠道', render: (r) => r.channel },
          { key: 'gross', title: '总收入', render: (r) => formatMoney(r.grossRevenue) },
          { key: 'settleAmt', title: '结算金额', render: (r) => formatMoney(r.settlementAmount) },
          { key: 'settleInc', title: incomeLabel, render: (r) => formatMoney(r.settlementIncome) },
          { key: 'formula', title: '结算公式', render: (r) => r.formulaText },
          { key: 'settleTime', title: '结算时间', render: (r) => r.settlementTime ?? (r.settled ? '-' : '待结算') },
          { key: 'status', title: '申请付款状态', render: (r) => <StatusBadge text={r.paymentApplyStatus} /> },
        ]}
      />
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
