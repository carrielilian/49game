import React, { useState } from 'react';
import { DataTable, DualCell } from '../components/DataTable';
import { FormSectionTitle, ReadonlyField } from '../components/FormFields';
import { Drawer } from '../components/Modal';
import { FilterBar } from '../components/FilterBar';
import { useAppStore } from '../data/store';
import type { FormulaConfig } from '../data/types';
import { formatFormulaText } from '../utils/settlement';
import { ListSearchFields } from '../components/ListSearchFields';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';

export function FormulaListPage() {
  const { games, formulas, formulaLogs, getVendorName, getGame, updateFormula } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [formulaDrawer, setFormulaDrawer] = useState(false);
  const [channelDrawer, setChannelDrawer] = useState(false);
  const [logDrawer, setLogDrawer] = useState(false);
  const [editing, setEditing] = useState<FormulaConfig | null>(null);
  const [selectedGameId, setSelectedGameId] = useState('');

  const rows = games.filter((g) => matchesListSearch(search, {
    gameId: g.id,
    gameName: g.name,
    vendorId: g.vendorId,
    vendorName: getVendorName(g.vendorId),
  }));

  const openFormula = (gameId: string) => {
    const f = formulas.find((x) => x.gameId === gameId);
    if (f) { setEditing({ ...f }); setFormulaDrawer(true); }
  };
  const openChannels = (gameId: string) => {
    const f = formulas.find((x) => x.gameId === gameId);
    if (f) { setEditing({ ...f, channels: f.channels.map((c) => ({ ...c })) }); setChannelDrawer(true); }
  };
  const openLogs = (gameId: string) => { setSelectedGameId(gameId); setLogDrawer(true); };

  const saveFormula = () => {
    if (editing) { updateFormula(editing); setFormulaDrawer(false); }
  };
  const saveChannels = () => {
    if (editing) { updateFormula(editing); setChannelDrawer(false); }
  };

  const logs = formulaLogs.filter((l) => l.gameId === selectedGameId);
  const editingGame = editing ? getGame(editing.gameId) : null;

  return (
    <div className="agf-card">
      <FilterBar>
        <ListSearchFields mode="gameAndVendor" value={search} onChange={setSearch} />
      </FilterBar>
      <DataTable
        rowKey={(r) => r.id}
        data={rows}
        columns={[
          { key: 'game', title: '游戏ID/游戏名称', render: (r) => <DualCell main={r.name} sub={r.id} /> },
          { key: 'vendorId', title: '厂商ID', render: (r) => r.vendorId },
          { key: 'vendorName', title: '厂商名称', render: (r) => getVendorName(r.vendorId) },
          { key: 'formula', title: '结算公式（内部渠道/外部渠道）', render: (r) => {
            const f = formulas.find((x) => x.gameId === r.id);
            if (!f) return '-';
            return (
              <span>
                <span className="agf-cell-main">{formatFormulaText(f.internalTax, f.internalChannelFee, f.internalShare, '内部')}</span>
                <span className="agf-cell-sub">{formatFormulaText(f.externalTax, f.externalChannelFee, f.externalShare, '外部')}</span>
              </span>
            );
          } },
          { key: 'ops', title: '操作', render: (r) => (
            <div className="agf-actions">
              <button type="button" className="agf-btn agf-btn--link" onClick={() => openFormula(r.id)}>结算公式</button>
              <button type="button" className="agf-btn agf-btn--link" onClick={() => openChannels(r.id)}>支持渠道</button>
              <button type="button" className="agf-btn agf-btn--link" onClick={() => openLogs(r.id)}>操作记录</button>
            </div>
          ) },
        ]}
      />
      <Drawer title="结算公式设置" open={formulaDrawer} onClose={() => setFormulaDrawer(false)} large
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setFormulaDrawer(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={saveFormula}>保存</button></>}>
        {editing && editingGame && (
          <>
            <div className="agf-form-readonly-grid">
              <ReadonlyField label="游戏ID" value={editing.gameId} />
              <ReadonlyField label="游戏名称" value={editingGame.name} />
              <ReadonlyField label="厂商ID" value={editingGame.vendorId} />
              <ReadonlyField label="厂商名称" value={getVendorName(editingGame.vendorId)} />
            </div>
            <FormSectionTitle>内部渠道结算公式设置</FormSectionTitle>
            <div className="agf-form-item"><label className="agf-form-label">税点</label><input type="number" step="0.01" className="agf-form-input" value={editing.internalTax} onChange={(e) => setEditing({ ...editing, internalTax: Number(e.target.value) })} /></div>
            <div className="agf-form-item"><label className="agf-form-label">渠道费</label><input type="number" step="0.01" className="agf-form-input" value={editing.internalChannelFee} onChange={(e) => setEditing({ ...editing, internalChannelFee: Number(e.target.value) })} /></div>
            <div className="agf-form-item"><label className="agf-form-label">分成</label><input type="number" step="0.01" className="agf-form-input" value={editing.internalShare} onChange={(e) => setEditing({ ...editing, internalShare: Number(e.target.value) })} /></div>
            <div className="agf-form-item"><label className="agf-form-label">其他自定义</label><input className="agf-form-input" placeholder="自定义内部渠道公式说明" value={editing.internalCustomFormula ?? ''} onChange={(e) => setEditing({ ...editing, internalCustomFormula: e.target.value })} /></div>
            <FormSectionTitle>外部渠道结算公式设置</FormSectionTitle>
            <div className="agf-form-item"><label className="agf-form-label">税点</label><input type="number" step="0.01" className="agf-form-input" value={editing.externalTax} onChange={(e) => setEditing({ ...editing, externalTax: Number(e.target.value) })} /></div>
            <div className="agf-form-item"><label className="agf-form-label">渠道费</label><input type="number" step="0.01" className="agf-form-input" value={editing.externalChannelFee} onChange={(e) => setEditing({ ...editing, externalChannelFee: Number(e.target.value) })} /></div>
            <div className="agf-form-item"><label className="agf-form-label">分成</label><input type="number" step="0.01" className="agf-form-input" value={editing.externalShare} onChange={(e) => setEditing({ ...editing, externalShare: Number(e.target.value) })} /></div>
            <div className="agf-form-item"><label className="agf-form-label">其他自定义</label><input className="agf-form-input" placeholder="自定义外部渠道公式说明" value={editing.externalCustomFormula ?? ''} onChange={(e) => setEditing({ ...editing, externalCustomFormula: e.target.value })} /></div>
            <FormSectionTitle>发票设置</FormSectionTitle>
            <div className="agf-form-item"><label className="agf-form-label">发票设置</label>
              <select className="agf-form-input" value={editing.invoiceMode} onChange={(e) => setEditing({ ...editing, invoiceMode: e.target.value as FormulaConfig['invoiceMode'] })}>
                <option value="跟随发票">跟随发票</option><option value="其他自定义">其他自定义</option>
              </select>
            </div>
            {editing.invoiceMode === '其他自定义' && (
              <div className="agf-form-item"><label className="agf-form-label">自定义发票说明</label><input className="agf-form-input" value={editing.customInvoice ?? ''} onChange={(e) => setEditing({ ...editing, customInvoice: e.target.value })} /></div>
            )}
          </>
        )}
      </Drawer>
      <Drawer title="支持渠道" open={channelDrawer} onClose={() => setChannelDrawer(false)} large
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setChannelDrawer(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={saveChannels}>保存</button></>}>
        {editing && editingGame && (
          <>
            <div className="agf-form-readonly-grid">
              <ReadonlyField label="游戏ID" value={editing.gameId} />
              <ReadonlyField label="游戏名称" value={editingGame.name} />
              <ReadonlyField label="厂商名称" value={getVendorName(editingGame.vendorId)} />
            </div>
            <FormSectionTitle>内部渠道勾选</FormSectionTitle>
            {editing.channels.filter((c) => c.type === 'internal').map((ch) => {
              const i = editing.channels.findIndex((x) => x.id === ch.id);
              return (
                <div key={ch.id} className="agf-form-item">
                  <label className="agf-form-label">{ch.name}</label>
                  <div className="agf-form-field" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label className="agf-check-item"><input type="checkbox" checked={ch.enabled} onChange={(e) => {
                      const channels = [...editing.channels];
                      channels[i] = { ...ch, enabled: e.target.checked };
                      setEditing({ ...editing, channels });
                    }} />启用</label>
                    <input className="agf-form-input" placeholder="渠道游戏ID" value={ch.channelGameId ?? ''} onChange={(e) => {
                      const channels = [...editing.channels];
                      channels[i] = { ...ch, channelGameId: e.target.value };
                      setEditing({ ...editing, channels });
                    }} />
                  </div>
                </div>
              );
            })}
            <FormSectionTitle>外部渠道勾选</FormSectionTitle>
            {editing.channels.filter((c) => c.type === 'external').map((ch) => {
              const i = editing.channels.findIndex((x) => x.id === ch.id);
              return (
                <div key={ch.id} className="agf-form-item">
                  <label className="agf-form-label">{ch.name}</label>
                  <div className="agf-form-field" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label className="agf-check-item"><input type="checkbox" checked={ch.enabled} onChange={(e) => {
                      const channels = [...editing.channels];
                      channels[i] = { ...ch, enabled: e.target.checked };
                      setEditing({ ...editing, channels });
                    }} />启用</label>
                    <input className="agf-form-input" placeholder="渠道游戏ID" value={ch.channelGameId ?? ''} onChange={(e) => {
                      const channels = [...editing.channels];
                      channels[i] = { ...ch, channelGameId: e.target.value };
                      setEditing({ ...editing, channels });
                    }} />
                  </div>
                </div>
              );
            })}
          </>
        )}
      </Drawer>
      <Drawer title="操作记录" open={logDrawer} onClose={() => setLogDrawer(false)}>
        {logs.length === 0 ? <div className="agf-empty">暂无记录</div> : (
          <table className="agf-table">
            <thead><tr><th>操作人</th><th>操作时间</th><th>结算公式</th></tr></thead>
            <tbody>{logs.map((l) => (
              <tr key={l.id}><td>{l.operator}</td><td>{l.time}</td><td>{l.formulaText}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Drawer>
    </div>
  );
}
