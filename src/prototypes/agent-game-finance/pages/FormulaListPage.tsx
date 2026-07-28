import React, { useState } from 'react';
import { DataTable, DualCell } from '../components/DataTable';
import { DecimalPercentInput, FormSectionTitle, PercentInput, ReadonlyField } from '../components/FormFields';
import { Drawer, Toast, type ToastType } from '../components/Modal';
import { FilterBar } from '../components/FilterBar';
import { useAppStore } from '../data/store';
import { isFormulaConfigured } from '../data/mock-data';
import type { FormulaConfig } from '../data/types';
import { formatFormulaText } from '../utils/settlement';
import { ListSearchFields } from '../components/ListSearchFields';
import { SupportChannelsDrawer } from '../components/SupportChannelsDrawer';
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
    formatFormulaText(f!.internalTax, f!.internalChannelFee, f!.internalShare, '自有渠道'),
    formatFormulaText(f!.externalTax, f!.externalChannelFee, f!.externalShare, '外部渠道'),
  ].join('\n');
}

function needsTaxInput(invoiceInfo: string): boolean {
  return isOtherInvoice(invoiceInfo) || taxRateFromInvoice(invoiceInfo) === null;
}

function validateFormulaForm(f: FormulaConfig, invoiceInfo: string): FieldErrors {
  const errors: FieldErrors = {};
  if (needsTaxInput(invoiceInfo) && !Number.isFinite(f.internalTax)) {
    errors.internalTax = '扣税点不能为空';
  }
  if (!Number.isFinite(f.internalChannelFee)) errors.internalChannelFee = '渠道费不能为空';
  if (!Number.isFinite(f.internalShare)) errors.internalShare = '分成不能为空';
  if (needsTaxInput(invoiceInfo) && !Number.isFinite(f.externalTax)) {
    errors.externalTax = '扣税点不能为空';
  }
  if (!Number.isFinite(f.externalChannelFee)) errors.externalChannelFee = '渠道费不能为空';
  if (!Number.isFinite(f.externalShare)) errors.externalShare = '分成不能为空';
  return errors;
}

function TaxRateField({
  tax,
  invoiceInfo,
  error,
  onTaxChange,
}: {
  tax: number;
  invoiceInfo: string;
  error?: string;
  onTaxChange: (tax: number) => void;
}) {
  const mapped = taxRateFromInvoice(invoiceInfo);
  const needInput = needsTaxInput(invoiceInfo);

  return (
    <>
      {mapped !== null && (
        <div className="agf-form-item">
          <label className="agf-form-label">扣税点</label>
          <div className="agf-form-readonly-value">{formatTaxPercent(mapped)}</div>
        </div>
      )}
      {needInput && (
        <div className="agf-form-item">
          <label className="agf-form-label agf-form-label--required">扣税点</label>
          <div className="agf-form-field">
            <DecimalPercentInput
              value={tax}
              onChange={onTaxChange}
              error={error}
            />
          </div>
        </div>
      )}
    </>
  );
}

export function FormulaListPage() {
  const {
    businessType,
    scopedGames,
    formulas,
    formulaLogs,
    getVendorName,
    getVendor,
    getGame,
    updateFormula,
  } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [formulaDrawer, setFormulaDrawer] = useState(false);
  const [channelDrawer, setChannelDrawer] = useState(false);
  const [logDrawer, setLogDrawer] = useState(false);
  const [editing, setEditing] = useState<FormulaConfig | null>(null);
  const [effectiveFormula, setEffectiveFormula] = useState('-');
  const [selectedGameId, setSelectedGameId] = useState('');
  const [channelGameId, setChannelGameId] = useState('');
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
    const next = {
      ...f,
      internalTaxMode: '跟随发票' as const,
      internalTax: resolveFollowInvoiceTax(invoice, Number.isFinite(f.internalTax) ? f.internalTax : 0),
      externalTaxMode: '跟随发票' as const,
      externalTax: resolveFollowInvoiceTax(invoice, Number.isFinite(f.externalTax) ? f.externalTax : 0),
    };
    setErrors({});
    setEditing(next);
    setFormulaDrawer(true);
  };
  const openLogs = (gameId: string) => { setSelectedGameId(gameId); setLogDrawer(true); };
  const openChannels = (gameId: string) => {
    setChannelGameId(gameId);
    setChannelDrawer(true);
  };

  const saveFormula = () => {
    if (!editing) return;
    const game = getGame(editing.gameId);
    const invoice = game ? (getVendor(game.vendorId)?.invoiceInfo ?? '') : '';
    const normalizedEditing = {
      ...editing,
      internalTaxMode: '跟随发票' as const,
      internalTax: resolveFollowInvoiceTax(
        invoice,
        Number.isFinite(editing.internalTax) ? editing.internalTax : 0,
      ),
      externalTaxMode: '跟随发票' as const,
      externalTax: resolveFollowInvoiceTax(
        invoice,
        Number.isFinite(editing.externalTax) ? editing.externalTax : 0,
      ),
    };
    const nextErrors = validateFormulaForm(normalizedEditing, invoice);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setToast({ message: '请完善所有信息', type: 'error' });
      return;
    }
    updateFormula(normalizedEditing);
    setFormulaDrawer(false);
    setToast({ message: '提交成功', type: 'success' });
  };

  const logs = formulaLogs.filter((l) => l.gameId === selectedGameId);
  const editingGame = editing ? getGame(editing.gameId) : null;
  const channelGame = channelGameId ? getGame(channelGameId) : null;
  const channelFormula = channelGameId
    ? formulas.find((formula) => formula.gameId === channelGameId)
    : undefined;
  const invoiceInfo = editingGame ? (getVendor(editingGame.vendorId)?.invoiceInfo ?? '') : '';

  return (
    <div className="agf-card">
      <div data-annotation-id="formula-list-query">
        <FilterBar>
          <ListSearchFields mode="gameAndVendor" value={search} onChange={setSearch} />
        </FilterBar>
      </div>
      <div data-annotation-id="formula-list-table">
      <DataTable
        rowKey={(r) => r.id}
        data={rows}
        columns={[
          { key: 'game', title: '游戏ID / 游戏名称', render: (r) => <DualCell main={r.onlineName} sub={r.id} /> },
          { key: 'vendorId', title: '厂商ID', render: (r) => r.vendorId },
          { key: 'vendorName', title: '厂商名称', render: (r) => getVendorName(r.vendorId) },
          { key: 'formula', title: '结算公式', header: <span data-annotation-id="formula-list-formula-col">结算公式</span>, render: (r) => {
            const f = formulas.find((x) => x.gameId === r.id);
            if (!isFormulaConfigured(f)) return '-';
            return (
              <span>
                <span className="agf-cell-main">{formatFormulaText(f!.internalTax, f!.internalChannelFee, f!.internalShare, '自有渠道')}</span>
                <span className="agf-cell-main">{formatFormulaText(f!.externalTax, f!.externalChannelFee, f!.externalShare, '外部渠道')}</span>
              </span>
            );
          } },
          { key: 'ops', title: '操作', render: (r) => (
            <div className="agf-actions">
              <button type="button" className="agf-btn agf-btn--link" data-annotation-id="formula-list-formula" onClick={() => openFormula(r.id)}>结算公式</button>
              <button type="button" className="agf-btn agf-btn--link" data-annotation-id="formula-list-internal-channels" onClick={() => openChannels(r.id)}>渠道映射</button>
              <button type="button" className="agf-btn agf-btn--link" data-annotation-id="formula-list-logs" onClick={() => openLogs(r.id)}>操作记录</button>
            </div>
          ) },
        ]}
      />
      </div>
      <Drawer title="结算公式设置" open={formulaDrawer} onClose={() => setFormulaDrawer(false)} large
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setFormulaDrawer(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={saveFormula}>保存</button></>}>
        {editing && editingGame && (
          <div data-annotation-id="formula-list-formula-form">
            <div className="agf-form-readonly-grid">
              <ReadonlyField label="游戏ID / 游戏名称" value={`${editing.gameId} / ${editingGame.onlineName}`} />
              <ReadonlyField label="厂商ID" value={editingGame.vendorId} />
              <ReadonlyField label="厂商名称" value={getVendorName(editingGame.vendorId)} />
              <ReadonlyField label="结算公式" value={effectiveFormula} multiline />
            </div>
            <FormSectionTitle>自有渠道结算公式</FormSectionTitle>
            <TaxRateField
              tax={editing.internalTax}
              invoiceInfo={invoiceInfo}
              error={errors.internalTax}
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
            <FormSectionTitle>外部渠道结算公式</FormSectionTitle>
            <TaxRateField
              tax={editing.externalTax}
              invoiceInfo={invoiceInfo}
              error={errors.externalTax}
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
          </div>
        )}
      </Drawer>
      {channelGame && channelFormula && (
        <SupportChannelsDrawer
          open={channelDrawer}
          onClose={() => setChannelDrawer(false)}
          gameId={channelGame.id}
          gameName={channelGame.onlineName}
          vendorName={getVendorName(channelGame.vendorId)}
          businessType={businessType}
          formula={channelFormula}
          onSave={updateFormula}
          formAnnotationId="formula-list-internal-channels-form"
        />
      )}
      <Drawer title="操作记录" open={logDrawer} onClose={() => setLogDrawer(false)}>
        <div data-annotation-id="formula-list-logs-drawer">
        {(() => {
          const logGame = getGame(selectedGameId);
          return (
            <>
              {logGame && (
                <div className="agf-drawer-meta">游戏ID / 游戏名称：{logGame.id} / {logGame.onlineName}</div>
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
        </div>
      </Drawer>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
