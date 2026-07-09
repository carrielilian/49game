import React, { useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import { DataTable, DualCell } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { Modal, Toast } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { buildImportPreview, useAppStore } from '../data/store';
import { EXTERNAL_CHANNELS } from '../data/mock-data';
import {
  PAYMENT_APPLY_STATUS_FILTER_OPTIONS,
  selectOptions,
  uniqueOptions,
} from '../utils/columnFilters';
import { ListSearchFields } from '../components/ListSearchFields';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';
import { formatMoney } from '../utils/settlement';

export function ExternalSettlementPage() {
  const { settlements, games, formulas, getGame, importExternal } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [incomeTimeFilter, setIncomeTimeFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState<ReturnType<typeof buildImportPreview>>([]);
  const [toast, setToast] = useState('');

  const incomeTimeOptions = useMemo(
    () => uniqueOptions(settlements.filter((s) => s.type === 'external').map((s) => s.incomeTime)),
    [settlements],
  );

  const data = settlements.filter((s) => {
    if (s.type !== 'external') return false;
    if (!matchesListSearch(search, { gameId: s.gameId, gameName: getGame(s.gameId)?.name })) return false;
    if (incomeTimeFilter && s.incomeTime !== incomeTimeFilter) return false;
    if (channelFilter && s.channel !== channelFilter) return false;
    if (paymentStatusFilter && s.paymentApplyStatus !== paymentStatusFilter) return false;
    return true;
  });

  const handleUpload = () => {
    setPreview(buildImportPreview(games, formulas));
    setImportOpen(true);
  };

  const confirmImport = () => {
    importExternal(preview);
    setImportOpen(false);
    setToast('导入成功，已生成结算收入');
  };

  return (
    <div className="agf-card">
      <FilterBar
        actions={<button type="button" className="agf-btn agf-btn--primary" onClick={handleUpload}><Upload size={16} />导入并结算</button>}
      >
        <ListSearchFields mode="game" value={search} onChange={setSearch} />
      </FilterBar>
      <DataTable
        rowKey={(r) => r.id}
        data={data}
        columns={[
          {
            key: 'time',
            title: '收入时间',
            filter: {
              type: 'select',
              value: incomeTimeFilter,
              onChange: setIncomeTimeFilter,
              options: incomeTimeOptions,
            },
            render: (r) => r.incomeTime,
          },
          { key: 'game', title: '游戏ID / 游戏名称', render: (r) => <DualCell main={getGame(r.gameId)?.name ?? r.gameId} sub={r.gameId} /> },
          {
            key: 'channel',
            title: '渠道',
            filter: {
              type: 'select',
              value: channelFilter,
              onChange: setChannelFilter,
              options: selectOptions(EXTERNAL_CHANNELS),
            },
            render: (r) => r.channel,
          },
          { key: 'gross', title: '总收入', render: (r) => formatMoney(r.grossRevenue) },
          { key: 'settleAmt', title: '结算金额', render: (r) => formatMoney(r.settlementAmount) },
          { key: 'settleInc', title: '结算收入', render: (r) => formatMoney(r.settlementIncome) },
          { key: 'formula', title: '结算公式', render: (r) => r.formulaText },
          { key: 'settleTime', title: '结算时间', render: (r) => r.settlementTime ?? '-' },
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
      <Modal title="导入并结算" open={importOpen} onClose={() => setImportOpen(false)} large
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setImportOpen(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={confirmImport}>确认导入</button></>}>
        <div className="agf-upload" onClick={handleUpload}>点击上传外部渠道报表（模拟已解析 {preview.length || 3} 条）</div>
        {preview.length > 0 && (
          <table className="agf-table" style={{ marginTop: 16 }}>
            <thead><tr><th>收入时间</th><th>游戏ID / 游戏名称</th><th>渠道</th><th>总收入</th></tr></thead>
            <tbody>{preview.map((r, i) => (
              <tr key={i}>
                <td>{r.incomeTime}</td>
                <td><DualCell main={r.gameName} sub={r.gameId} /></td>
                <td>{r.channel}</td>
                <td>{formatMoney(r.grossRevenue)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Modal>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
