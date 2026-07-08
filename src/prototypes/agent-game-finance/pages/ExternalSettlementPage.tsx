import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { DataTable, DualCell } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { Modal, Toast } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { buildImportPreview, useAppStore } from '../data/store';
import { formatMoney } from '../utils/settlement';

export function ExternalSettlementPage() {
  const { settlements, games, formulas, getGame, importExternal } = useAppStore();
  const [keyword, setKeyword] = useState('');
  const [incomeTime, setIncomeTime] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState<ReturnType<typeof buildImportPreview>>([]);
  const [toast, setToast] = useState('');

  const data = settlements.filter((s) => {
    if (s.type !== 'external') return false;
    if (keyword && !s.gameId.includes(keyword) && !getGame(s.gameId)?.name.includes(keyword)) return false;
    if (incomeTime && !s.incomeTime.includes(incomeTime)) return false;
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
        <input className="agf-input" placeholder="游戏ID / 游戏名称" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <input className="agf-input" placeholder="收入时间" value={incomeTime} onChange={(e) => setIncomeTime(e.target.value)} />
      </FilterBar>
      <DataTable
        rowKey={(r) => r.id}
        data={data}
        columns={[
          { key: 'time', title: '收入时间', render: (r) => r.incomeTime },
          { key: 'game', title: '游戏ID/游戏名称', render: (r) => <DualCell main={getGame(r.gameId)?.name ?? r.gameId} sub={r.gameId} /> },
          { key: 'channel', title: '渠道', render: (r) => r.channel },
          { key: 'gross', title: '总收入', render: (r) => formatMoney(r.grossRevenue) },
          { key: 'settleAmt', title: '结算金额', render: (r) => formatMoney(r.settlementAmount) },
          { key: 'settleInc', title: '结算收入', render: (r) => formatMoney(r.settlementIncome) },
          { key: 'formula', title: '结算公式', render: (r) => r.formulaText },
          { key: 'settleTime', title: '结算时间', render: (r) => r.settlementTime ?? '-' },
          { key: 'status', title: '申请付款状态', render: (r) => <StatusBadge text={r.paymentApplyStatus} /> },
        ]}
      />
      <Modal title="导入并结算" open={importOpen} onClose={() => setImportOpen(false)} large
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setImportOpen(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={confirmImport}>确认导入</button></>}>
        <div className="agf-upload" onClick={handleUpload}>点击上传外部渠道报表（模拟已解析 {preview.length || 3} 条）</div>
        {preview.length > 0 && (
          <table className="agf-table" style={{ marginTop: 16 }}>
            <thead><tr><th>收入时间</th><th>游戏ID/游戏名称</th><th>渠道</th><th>总收入</th></tr></thead>
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
