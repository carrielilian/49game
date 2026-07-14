import React, { useState } from 'react';
import { DataTable, DualCell } from '../components/DataTable';
import { FieldError, FieldHint, FormSectionTitle, PercentInput, ReadonlyField } from '../components/FormFields';
import { Drawer, Toast, type ToastType } from '../components/Modal';
import { FilterBar } from '../components/FilterBar';
import { useAppStore } from '../data/store';
import { isFormulaConfigured } from '../data/mock-data';
import type { FormulaChannel, FormulaConfig, TaxMode } from '../data/types';
import { formatFormulaText } from '../utils/settlement';
import { ListSearchFields } from '../components/ListSearchFields';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';
import {
  formatTaxPercent,
  isOtherInvoice,
  resolveFollowInvoiceTax,
  taxRateFromInvoice,
} from '../utils/invoiceTax';

type FieldErrors = Record<string, string>;

function effectiveFormulaDisplay(f: FormulaConfig | undefined): string {
  if (!isFormulaConfigured(f)) return '-';
  return [
    formatFormulaText(f!.internalTax, f!.internalChannelFee, f!.internalShare, '内部渠道'),
    formatFormulaText(f!.externalTax, f!.externalChannelFee, f!.externalShare, '外部渠道'),
  ].join('\n');
}

function needsTaxInput(mode: TaxMode, invoiceInfo: string): boolean {
  if (mode === '自定义') return true;
  return isOtherInvoice(invoiceInfo) || taxRateFromInvoice(invoiceInfo) === null;
}

function validateChannelsForm(channels: FormulaChannel[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const ch of channels) {
    if (ch.enabled && !ch.channelGameId?.trim()) {
      errors[`channel-${ch.id}`] = '渠道游戏ID不能为空';
    }
  }
  return errors;
}

function validateFormulaForm(f: FormulaConfig, invoiceInfo: string): FieldErrors {
  const errors: FieldErrors = {};
  if (needsTaxInput(f.internalTaxMode, invoiceInfo) && !Number.isFinite(f.internalTax)) {
    errors.internalTax = '税率不能为空';
  }
  if (!Number.isFinite(f.internalChannelFee)) errors.internalChannelFee = '渠道费不能为空';
  if (!Number.isFinite(f.internalShare)) errors.internalShare = '分成不能为空';
  if (needsTaxInput(f.externalTaxMode, invoiceInfo) && !Number.isFinite(f.externalTax)) {
    errors.externalTax = '税率不能为空';
  }
  if (!Number.isFinite(f.externalChannelFee)) errors.externalChannelFee = '渠道费不能为空';
  if (!Number.isFinite(f.externalShare)) errors.externalShare = '分成不能为空';
  return errors;
}

function TaxRateField({
  name,
  mode,
  tax,
  invoiceInfo,
  error,
  onModeChange,
  onTaxChange,
}: {
  name: string;
  mode: TaxMode;
  tax: number;
  invoiceInfo: string;
  error?: string;
  onModeChange: (mode: TaxMode) => void;
  onTaxChange: (tax: number) => void;
}) {
  const mapped = taxRateFromInvoice(invoiceInfo);
  const needInput = needsTaxInput(mode, invoiceInfo);

  return (
    <>
      <div className="agf-form-item">
        <label className="agf-form-label agf-form-label--required">税率</label>
        <div className="agf-radio-group">
          {(['跟随发票', '自定义'] as TaxMode[]).map((opt) => (
            <label key={opt} className="agf-radio-item">
              <input
                type="radio"
                name={name}
                checked={mode === opt}
                onChange={() => onModeChange(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
      {mode === '跟随发票' && mapped !== null && (
        <div className="agf-form-item">
          <label className="agf-form-label">税率</label>
          <div className="agf-form-readonly-value">{formatTaxPercent(mapped)}</div>
        </div>
      )}
      {needInput && (
        <div className="agf-form-item">
          <label className="agf-form-label agf-form-label--required">税率</label>
          <div className="agf-form-field">
            <input
              type="number"
              step="0.0001"
              min={0}
              className="agf-form-input"
              placeholder="请输入税率，如 0.06"
              value={Number.isFinite(tax) ? tax : ''}
              onChange={(e) => onTaxChange(e.target.value === '' ? NaN : Number(e.target.value))}
            />
            <FieldError message={error} />
          </div>
        </div>
      )}
    </>
  );
}

export function FormulaListPage() {
  const { scopedGames, formulas, formulaLogs, getVendorName, getVendor, getGame, updateFormula } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [formulaDrawer, setFormulaDrawer] = useState(false);
  const [channelDrawer, setChannelDrawer] = useState(false);
  const [logDrawer, setLogDrawer] = useState(false);
  const [editing, setEditing] = useState<FormulaConfig | null>(null);
  const [effectiveFormula, setEffectiveFormula] = useState('-');
  const [selectedGameId, setSelectedGameId] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const rows = scopedGames.filter((g) => matchesListSearch(search, {
    gameId: g.id,
    gameName: g.onlineName,
    vendorId: g.vendorId,
    vendorName: getVendorName(g.vendorId),
  }));

  const clearError = (key: string) => setErrors((prev) => {
    if (!prev[key]) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });

  const openFormula = (gameId: string) => {
    const f = formulas.find((x) => x.gameId === gameId);
    const game = getGame(gameId);
    if (!f || !game) return;
    const invoice = getVendor(game.vendorId)?.invoiceInfo ?? '';
    setEffectiveFormula(effectiveFormulaDisplay(f));
    const next = { ...f };
    if (next.internalTaxMode === '跟随发票') {
      next.internalTax = resolveFollowInvoiceTax(invoice, next.internalTax);
    }
    if (next.externalTaxMode === '跟随发票') {
      next.externalTax = resolveFollowInvoiceTax(invoice, next.externalTax);
    }
    setErrors({});
    setEditing(next);
    setFormulaDrawer(true);
  };
  const openChannels = (gameId: string) => {
    const f = formulas.find((x) => x.gameId === gameId);
    if (f) {
      setErrors({});
      setEditing({ ...f, channels: f.channels.map((c) => ({ ...c })) });
      setChannelDrawer(true);
    }
  };
  const openLogs = (gameId: string) => { setSelectedGameId(gameId); setLogDrawer(true); };

  const saveFormula = () => {
    if (!editing) return;
    const game = getGame(editing.gameId);
    const invoice = game ? (getVendor(game.vendorId)?.invoiceInfo ?? '') : '';
    const next = validateFormulaForm(editing, invoice);
    if (Object.keys(next).length) {
      setErrors(next);
      setToast({ message: '请完善所有信息', type: 'error' });
      return;
    }
    updateFormula(editing);
    setFormulaDrawer(false);
  };
  const saveChannels = () => {
    if (!editing) return;
    const next = validateChannelsForm(editing.channels);
    if (Object.keys(next).length) {
      setErrors(next);
      setToast({ message: '请完善所有信息', type: 'error' });
      return;
    }
    updateFormula(editing);
    setChannelDrawer(false);
  };

  const updateChannel = (index: number, patch: Partial<FormulaChannel>) => {
    if (!editing) return;
    const ch = editing.channels[index];
    if (patch.enabled === false) clearError(`channel-${ch.id}`);
    const channels = [...editing.channels];
    channels[index] = { ...ch, ...patch };
    setEditing({ ...editing, channels });
  };

  const logs = formulaLogs.filter((l) => l.gameId === selectedGameId);
  const editingGame = editing ? getGame(editing.gameId) : null;
  const invoiceInfo = editingGame ? (getVendor(editingGame.vendorId)?.invoiceInfo ?? '') : '';

  const setInternalMode = (mode: TaxMode) => {
    if (!editing) return;
    clearError('internalTax');
    const tax = mode === '跟随发票' ? resolveFollowInvoiceTax(invoiceInfo, editing.internalTax) : editing.internalTax;
    setEditing({ ...editing, internalTaxMode: mode, internalTax: tax });
  };
  const setExternalMode = (mode: TaxMode) => {
    if (!editing) return;
    clearError('externalTax');
    const tax = mode === '跟随发票' ? resolveFollowInvoiceTax(invoiceInfo, editing.externalTax) : editing.externalTax;
    setEditing({ ...editing, externalTaxMode: mode, externalTax: tax });
  };

  return (
    <div className="agf-card">
      <FilterBar>
        <ListSearchFields mode="gameAndVendor" value={search} onChange={setSearch} />
      </FilterBar>
      <DataTable
        rowKey={(r) => r.id}
        data={rows}
        columns={[
          { key: 'game', title: '游戏ID / 游戏名称', render: (r) => <DualCell main={r.onlineName} sub={r.id} /> },
          { key: 'vendorId', title: '厂商ID', render: (r) => r.vendorId },
          { key: 'vendorName', title: '厂商名称', render: (r) => getVendorName(r.vendorId) },
          { key: 'formula', title: '结算公式', render: (r) => {
            const f = formulas.find((x) => x.gameId === r.id);
            if (!isFormulaConfigured(f)) return '-';
            return (
              <span>
                <span className="agf-cell-main">{formatFormulaText(f!.internalTax, f!.internalChannelFee, f!.internalShare, '内部渠道')}</span>
                <span className="agf-cell-main">{formatFormulaText(f!.externalTax, f!.externalChannelFee, f!.externalShare, '外部渠道')}</span>
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
              <ReadonlyField label="游戏ID / 游戏名称" value={`${editing.gameId}/${editingGame.onlineName}`} />
              <ReadonlyField label="厂商ID" value={editingGame.vendorId} />
              <ReadonlyField label="厂商名称" value={getVendorName(editingGame.vendorId)} />
              <ReadonlyField label="结算公式" value={effectiveFormula} multiline />
            </div>
            <FormSectionTitle>内部渠道结算公式设置</FormSectionTitle>
            <TaxRateField
              name="internal-tax-mode"
              mode={editing.internalTaxMode}
              tax={editing.internalTax}
              invoiceInfo={invoiceInfo}
              error={errors.internalTax}
              onModeChange={setInternalMode}
              onTaxChange={(tax) => { clearError('internalTax'); setEditing({ ...editing, internalTax: tax }); }}
            />
            <PercentInput
              label="渠道费"
              required
              value={editing.internalChannelFee}
              error={errors.internalChannelFee}
              onChange={(v) => { clearError('internalChannelFee'); setEditing({ ...editing, internalChannelFee: v }); }}
            />
            <PercentInput
              label="分成"
              required
              value={editing.internalShare}
              error={errors.internalShare}
              onChange={(v) => { clearError('internalShare'); setEditing({ ...editing, internalShare: v }); }}
            />
            <FormSectionTitle>外部渠道结算公式设置</FormSectionTitle>
            <TaxRateField
              name="external-tax-mode"
              mode={editing.externalTaxMode}
              tax={editing.externalTax}
              invoiceInfo={invoiceInfo}
              error={errors.externalTax}
              onModeChange={setExternalMode}
              onTaxChange={(tax) => { clearError('externalTax'); setEditing({ ...editing, externalTax: tax }); }}
            />
            <PercentInput
              label="渠道费"
              required
              value={editing.externalChannelFee}
              error={errors.externalChannelFee}
              onChange={(v) => { clearError('externalChannelFee'); setEditing({ ...editing, externalChannelFee: v }); }}
            />
            <PercentInput
              label="分成"
              required
              value={editing.externalShare}
              error={errors.externalShare}
              onChange={(v) => { clearError('externalShare'); setEditing({ ...editing, externalShare: v }); }}
            />
          </>
        )}
      </Drawer>
      <Drawer title="支持渠道" open={channelDrawer} onClose={() => setChannelDrawer(false)} large
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setChannelDrawer(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={saveChannels}>保存</button></>}>
        {editing && editingGame && (
          <>
            <div className="agf-form-readonly-grid agf-channel-drawer-meta">
              <ReadonlyField label="游戏ID / 游戏名称" value={`${editing.gameId}/${editingGame.onlineName}`} />
              <ReadonlyField label="厂商名称" value={getVendorName(editingGame.vendorId)} />
            </div>
            <FormSectionTitle>内部渠道</FormSectionTitle>
            <FieldHint>请勾选支持的内部渠道，并填写该渠道下对应的游戏ID</FieldHint>
            {editing.channels.map((ch, i) => ch.type !== 'internal' ? null : (
              <div key={ch.id} className="agf-channel-row">
                <label className="agf-channel-row__check">
                  <input
                    type="checkbox"
                    checked={ch.enabled}
                    onChange={(e) => updateChannel(i, { enabled: e.target.checked })}
                  />
                </label>
                <span className="agf-channel-row__name">{ch.name}</span>
                <div className="agf-channel-row__field">
                  <input
                    className="agf-form-input"
                    placeholder="渠道游戏ID"
                    value={ch.channelGameId ?? ''}
                    onChange={(e) => {
                      clearError(`channel-${ch.id}`);
                      updateChannel(i, { channelGameId: e.target.value });
                    }}
                  />
                  <FieldError message={errors[`channel-${ch.id}`]} />
                </div>
              </div>
            ))}
            <FormSectionTitle>外部渠道</FormSectionTitle>
            <FieldHint>请勾选支持的外部渠道，并填写该渠道下对应的游戏ID</FieldHint>
            {editing.channels.map((ch, i) => ch.type !== 'external' ? null : (
              <div key={ch.id} className="agf-channel-row">
                <label className="agf-channel-row__check">
                  <input
                    type="checkbox"
                    checked={ch.enabled}
                    onChange={(e) => updateChannel(i, { enabled: e.target.checked })}
                  />
                </label>
                <span className="agf-channel-row__name">{ch.name}</span>
                <div className="agf-channel-row__field">
                  <input
                    className="agf-form-input"
                    placeholder="渠道游戏ID"
                    value={ch.channelGameId ?? ''}
                    onChange={(e) => {
                      clearError(`channel-${ch.id}`);
                      updateChannel(i, { channelGameId: e.target.value });
                    }}
                  />
                  <FieldError message={errors[`channel-${ch.id}`]} />
                </div>
              </div>
            ))}
          </>
        )}
      </Drawer>
      <Drawer title="操作记录" open={logDrawer} onClose={() => setLogDrawer(false)}>
        {(() => {
          const logGame = getGame(selectedGameId);
          return (
            <>
              {logGame && (
                <div className="agf-drawer-meta">游戏ID / 游戏名称：{logGame.id}/{logGame.onlineName}</div>
              )}
              {logs.length === 0 ? <div className="agf-empty">暂无记录</div> : (
                <div className="agf-table-wrap">
                  <table className="agf-table">
                    <thead><tr><th>操作人</th><th>操作时间</th><th>结算公式</th></tr></thead>
                    <tbody>{logs.map((l) => (
                      <tr key={l.id}>
                        <td>{l.operator}</td>
                        <td>{l.time}</td>
                        <td style={{ whiteSpace: 'pre-line' }}>{l.formulaText}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </>
          );
        })()}
      </Drawer>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
