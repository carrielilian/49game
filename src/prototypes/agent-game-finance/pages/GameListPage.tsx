import React, { useMemo, useState } from 'react';
import { DataTable, DualCell } from '../components/DataTable';
import { ReadonlyField } from '../components/FormFields';
import { Drawer } from '../components/Modal';
import { FilterBar } from '../components/FilterBar';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../data/store';
import type { Contract, Game, GameOperationLog } from '../data/types';
import {
  COOPERATION_STATUS_FILTER_OPTIONS,
  LICENSE_FILTER_OPTIONS,
  OPERATION_STATUS_FILTER_OPTIONS,
} from '../utils/columnFilters';
import { ListSearchFields } from '../components/ListSearchFields';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';

const EMPTY_GAME: Omit<Game, 'id'> = {
  name: '', onlineName: '', vendorId: '', manager: '', license: '有', remark: '',
  launchDate: '', operationStatus: '未上线', cooperationStatus: '合作中',
};

function renderGameLogAction(log: GameOperationLog) {
  if (log.action === '添加游戏') return '添加游戏';
  if (log.status) return <StatusBadge text={log.status} />;
  return log.action;
}

function AddGameForm({ form, setForm, vendors }: {
  form: Omit<Game, 'id'>;
  setForm: React.Dispatch<React.SetStateAction<Omit<Game, 'id'>>>;
  vendors: { id: string; name: string }[];
}) {
  return (
    <>
      <div className="agf-form-item"><label className="agf-form-label agf-form-label--required">游戏名称（合同名称）</label><input className="agf-form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div className="agf-form-item"><label className="agf-form-label agf-form-label--required">上线游戏名称</label><input className="agf-form-input" value={form.onlineName} onChange={(e) => setForm({ ...form, onlineName: e.target.value })} /></div>
      <div className="agf-form-item"><label className="agf-form-label agf-form-label--required">游戏负责人</label><input className="agf-form-input" value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} /></div>
      <div className="agf-form-item"><label className="agf-form-label agf-form-label--required">归属厂商</label>
        <select className="agf-form-input" value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
          <option value="">请选择</option>
          {vendors.map((v) => <option key={v.id} value={v.id}>{v.id} - {v.name}</option>)}
        </select>
      </div>
      <div className="agf-form-item"><label className="agf-form-label">版号</label>
        <div className="agf-radio-group">
          <label className="agf-radio-item"><input type="radio" name="license" checked={form.license === '有'} onChange={() => setForm({ ...form, license: '有' })} />有</label>
          <label className="agf-radio-item"><input type="radio" name="license" checked={form.license === '无'} onChange={() => setForm({ ...form, license: '无' })} />无</label>
        </div>
      </div>
      <div className="agf-form-item"><label className="agf-form-label">运营状态</label>
        <div className="agf-radio-group">
          <label className="agf-radio-item"><input type="radio" name="add-operationStatus" checked={form.operationStatus === '未上线'} onChange={() => setForm({ ...form, operationStatus: '未上线' })} />未上线</label>
          <label className="agf-radio-item"><input type="radio" name="add-operationStatus" checked={form.operationStatus === '已上线'} onChange={() => setForm({ ...form, operationStatus: '已上线' })} />已上线</label>
        </div>
      </div>
      <div className="agf-form-item"><label className="agf-form-label">备注</label><textarea className="agf-form-textarea" value={form.remark ?? ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></div>
    </>
  );
}

function EditGameForm({ form, setForm, editing, vendors }: {
  form: Omit<Game, 'id'>;
  setForm: React.Dispatch<React.SetStateAction<Omit<Game, 'id'>>>;
  editing: Game;
  vendors: { id: string; name: string }[];
}) {
  return (
    <>
      <ReadonlyField label="游戏ID" value={editing.id} />
      <div className="agf-form-item"><label className="agf-form-label agf-form-label--required">游戏名称（合同名称）</label><input className="agf-form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div className="agf-form-item"><label className="agf-form-label agf-form-label--required">上线游戏名称</label><input className="agf-form-input" value={form.onlineName} onChange={(e) => setForm({ ...form, onlineName: e.target.value })} /></div>
      <div className="agf-form-item"><label className="agf-form-label agf-form-label--required">游戏负责人</label><input className="agf-form-input" value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} /></div>
      <div className="agf-form-item"><label className="agf-form-label agf-form-label--required">归属厂商</label>
        <select className="agf-form-input" value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
          <option value="">请选择</option>
          {vendors.map((v) => <option key={v.id} value={v.id}>{v.id} - {v.name}</option>)}
        </select>
      </div>
      <div className="agf-form-item"><label className="agf-form-label">版号</label>
        <div className="agf-radio-group">
          <label className="agf-radio-item"><input type="radio" name="edit-license" checked={form.license === '有'} onChange={() => setForm({ ...form, license: '有' })} />有</label>
          <label className="agf-radio-item"><input type="radio" name="edit-license" checked={form.license === '无'} onChange={() => setForm({ ...form, license: '无' })} />无</label>
        </div>
      </div>
      <div className="agf-form-item"><label className="agf-form-label">运营状态</label>
        <div className="agf-radio-group">
          <label className="agf-radio-item"><input type="radio" name="edit-operationStatus" checked={form.operationStatus === '未上线'} onChange={() => setForm({ ...form, operationStatus: '未上线' })} />未上线</label>
          <label className="agf-radio-item"><input type="radio" name="edit-operationStatus" checked={form.operationStatus === '已上线'} onChange={() => setForm({ ...form, operationStatus: '已上线' })} />已上线</label>
        </div>
      </div>
      <div className="agf-form-item"><label className="agf-form-label">备注</label><textarea className="agf-form-textarea" value={form.remark ?? ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></div>
    </>
  );
}

export function GameListPage() {
  const { games, vendors, contracts, gameLogs, addGame, updateGame, updateContract, getVendorName, getGame } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [opStatus, setOpStatus] = useState('');
  const [licenseFilter, setLicenseFilter] = useState('');
  const [coopFilter, setCoopFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [contractDrawer, setContractDrawer] = useState(false);
  const [logDrawer, setLogDrawer] = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);
  const [form, setForm] = useState(EMPTY_GAME);
  const [contractForm, setContractForm] = useState<Contract | null>(null);
  const [selectedGameId, setSelectedGameId] = useState('');

  const filtered = games.filter((g) => {
    if (!matchesListSearch(search, {
      gameId: g.id,
      gameName: g.name,
      vendorId: g.vendorId,
      vendorName: getVendorName(g.vendorId),
    })) return false;
    if (licenseFilter && g.license !== licenseFilter) return false;
    if (opStatus && g.operationStatus !== opStatus) return false;
    if (coopFilter && g.cooperationStatus !== coopFilter) return false;
    return true;
  });

  const openAdd = () => { setForm(EMPTY_GAME); setAddOpen(true); };
  const openEdit = (g: Game) => { setEditing(g); setForm({ ...g }); setEditOpen(true); };
  const openContract = (gameId: string) => {
    const game = getGame(gameId);
    const c = contracts.find((x) => x.gameId === gameId) ?? {
      gameId, prepayment: 0, agencyPayment: 0, developmentFee: 0, contractDescription: '', cooperationStatus: '合作中' as const,
    };
    setContractForm({ ...c, cooperationStatus: c.cooperationStatus ?? game?.cooperationStatus ?? '合作中' });
    setContractDrawer(true);
  };
  const openLogs = (gameId: string) => { setSelectedGameId(gameId); setLogDrawer(true); };

  const handleAdd = () => { addGame(form); setAddOpen(false); };
  const handleEdit = () => { if (editing) updateGame({ ...editing, ...form }); setEditOpen(false); };
  const saveContract = () => { if (contractForm) updateContract(contractForm); setContractDrawer(false); };

  const logs = useMemo(() => gameLogs
    .filter((l) => l.gameId === selectedGameId)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
  [gameLogs, selectedGameId]);
  const contractGame = contractForm ? getGame(contractForm.gameId) : null;

  return (
    <div className="agf-card">
      <FilterBar
        actions={<button type="button" className="agf-btn agf-btn--primary" onClick={openAdd}>添加游戏</button>}
      >
        <ListSearchFields mode="gameAndVendor" value={search} onChange={setSearch} />
      </FilterBar>
      <DataTable
        rowKey={(r) => r.id}
        data={filtered}
        columns={[
          { key: 'game', title: '游戏ID/游戏名称', render: (r) => <DualCell main={r.name} sub={r.id} /> },
          { key: 'vendorId', title: '厂商ID', render: (r) => r.vendorId },
          { key: 'vendorName', title: '厂商名称', render: (r) => getVendorName(r.vendorId) },
          { key: 'manager', title: '游戏负责人', render: (r) => r.manager },
          {
            key: 'license',
            title: '版号',
            filter: {
              type: 'select',
              value: licenseFilter,
              onChange: setLicenseFilter,
              options: LICENSE_FILTER_OPTIONS,
            },
            render: (r) => r.license,
          },
          {
            key: 'op',
            title: '运营状态',
            filter: {
              type: 'select',
              value: opStatus,
              onChange: setOpStatus,
              options: OPERATION_STATUS_FILTER_OPTIONS,
            },
            render: (r) => <StatusBadge text={r.operationStatus} />,
          },
          {
            key: 'coop',
            title: '合作状态',
            filter: {
              type: 'select',
              value: coopFilter,
              onChange: setCoopFilter,
              options: COOPERATION_STATUS_FILTER_OPTIONS,
            },
            render: (r) => <StatusBadge text={r.cooperationStatus} />,
          },
          { key: 'ops', title: '操作', render: (r) => (
            <div className="agf-actions">
              <button type="button" className="agf-btn agf-btn--link" onClick={() => openEdit(r)}>编辑</button>
              <button type="button" className="agf-btn agf-btn--link" onClick={() => openContract(r.id)}>合同管理</button>
              <button type="button" className="agf-btn agf-btn--link" onClick={() => openLogs(r.id)}>操作记录</button>
            </div>
          ) },
        ]}
      />
      <Drawer title="添加游戏" open={addOpen} onClose={() => setAddOpen(false)} large
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setAddOpen(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={handleAdd}>确定</button></>}>
        <AddGameForm form={form} setForm={setForm} vendors={vendors} />
      </Drawer>
      <Drawer title="编辑游戏" open={editOpen} onClose={() => setEditOpen(false)} large
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setEditOpen(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={handleEdit}>保存</button></>}>
        {editing && <EditGameForm form={form} setForm={setForm} editing={editing} vendors={vendors} />}
      </Drawer>
      <Drawer title="合同管理" open={contractDrawer} onClose={() => setContractDrawer(false)}
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setContractDrawer(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={saveContract}>保存</button></>}>
        {contractForm && contractGame && (
          <>
            <ReadonlyField label="游戏ID/游戏名称" value={`${contractGame.id} / ${contractGame.name}`} />
            <div className="agf-form-item"><label className="agf-form-label">预付分成款</label><input type="number" className="agf-form-input" value={contractForm.prepayment} onChange={(e) => setContractForm({ ...contractForm, prepayment: Number(e.target.value) })} /></div>
            <div className="agf-form-item"><label className="agf-form-label">付款代理金</label><input type="number" className="agf-form-input" value={contractForm.agencyPayment} onChange={(e) => setContractForm({ ...contractForm, agencyPayment: Number(e.target.value) })} /></div>
            <div className="agf-form-item"><label className="agf-form-label">委托开发费用</label><input type="number" className="agf-form-input" value={contractForm.developmentFee} onChange={(e) => setContractForm({ ...contractForm, developmentFee: Number(e.target.value) })} /></div>
            <div className="agf-form-item"><label className="agf-form-label">合同信息说明</label><textarea className="agf-form-textarea" value={contractForm.contractDescription} onChange={(e) => setContractForm({ ...contractForm, contractDescription: e.target.value })} /></div>
            <div className="agf-form-item"><label className="agf-form-label">合作状态</label>
              <div className="agf-radio-group">
                <label className="agf-radio-item"><input type="radio" name="contract-cooperationStatus" checked={contractForm.cooperationStatus === '合作中'} onChange={() => setContractForm({ ...contractForm, cooperationStatus: '合作中' })} />合作中</label>
                <label className="agf-radio-item"><input type="radio" name="contract-cooperationStatus" checked={contractForm.cooperationStatus === '合作终止'} onChange={() => setContractForm({ ...contractForm, cooperationStatus: '合作终止' })} />合作终止</label>
              </div>
            </div>
          </>
        )}
      </Drawer>
      <Drawer title="操作记录" open={logDrawer} onClose={() => setLogDrawer(false)}>
        {logs.length === 0 ? <div className="agf-empty">暂无操作记录</div> : (
          <table className="agf-table">
            <thead><tr><th>操作人</th><th>操作时间</th><th>操作</th></tr></thead>
            <tbody>{logs.map((l) => (
              <tr key={l.id}><td>{l.operator}</td><td>{l.time}</td><td>{renderGameLogAction(l)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Drawer>
    </div>
  );
}
