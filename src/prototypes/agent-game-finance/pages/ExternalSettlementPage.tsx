import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { DataTable, DualCell, type Column } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { MonthRangePicker } from '../components/MonthRangePicker';
import { Modal, Toast, type ToastType } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../data/store';
import { EXTERNAL_CHANNELS } from '../data/mock-data';
import type { ImportPreviewRow } from '../data/types';
import {
  PAYMENT_APPLY_STATUS_FILTER_OPTIONS,
  selectOptions,
} from '../utils/columnFilters';
import { ListSearchFields } from '../components/ListSearchFields';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';
import { getSampleMonthRange, isMonthInRange } from '../utils/monthRange';
import {
  buildMockImportRows,
  calculateImportRow,
  enrichImportRowsOnParse,
  hasChannelEnabledGames,
} from '../utils/externalImport';
import { displaySettlementFormula, formatMoney, formatSettlementIncome, formatSettlementTime } from '../utils/settlement';

const EMPTY_IMPORT: ImportPreviewRow[] = [];

const IMPORT_PREVIEW_COLUMNS: Column<ImportPreviewRow>[] = [
  { key: 'channelGameId', title: '渠道游戏ID', render: (r) => r.channelGameId },
  { key: 'incomeTime', title: '收入时间', render: (r) => r.incomeTime },
  {
    key: 'game',
    title: '游戏ID / 游戏名称',
    render: (r) => (r.gameId ? <DualCell main={r.gameName ?? ''} sub={r.gameId} /> : '-'),
  },
  { key: 'pendingAmount', title: '待结算收入', render: (r) => formatMoney(r.pendingAmount) },
  { key: 'formulaText', title: '结算公式', render: (r) => displaySettlementFormula(r.formulaText) },
  {
    key: 'settlementIncome',
    title: '结算收入',
    render: (r) => (
      <>
        {r.settlementIncome != null ? formatMoney(r.settlementIncome) : '-'}
        {r.error && <div className="agf-form-error">{r.error}</div>}
      </>
    ),
  },
];

export function ExternalSettlementPage() {
  const { settlements, formulas, games, vendors, getGameName, getVendorName, importExternal } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [monthRange, setMonthRange] = useState(getSampleMonthRange);
  const [channelFilter, setChannelFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [preview, setPreview] = useState<ImportPreviewRow[]>(EMPTY_IMPORT);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importUploaded = preview.length > 0;
  const importSettlementReady =
    importUploaded && preview.every((r) => r.settlementIncome != null && !r.error);
  const canConfirmImport =
    importUploaded && preview.every((r) => r.gameId && r.formulaText && r.formulaText !== '-' && r.settlementIncome != null && !r.error);

  const data = settlements.filter((s) => {
    if (s.type !== 'external') return false;
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

  const resetImportState = () => {
    setSelectedChannel('');
    setPreview(EMPTY_IMPORT);
  };

  const openImport = () => {
    resetImportState();
    setImportOpen(true);
  };

  const closeImport = () => {
    setImportOpen(false);
    resetImportState();
  };

  const selectChannel = (name: string) => {
    setSelectedChannel(name);
    setPreview(EMPTY_IMPORT);
  };

  const showToast = (message: string, type: ToastType) => setToast({ message, type });
  const showErrorToast = (message: string) => showToast(message, 'error');

  const handleUploadClick = () => {
    if (!selectedChannel) {
      showErrorToast('请先选择外部渠道类型');
      return;
    }
    if (!hasChannelEnabledGames(selectedChannel, formulas)) {
      showErrorToast('当前渠道不存在运营游戏');
      return;
    }
    fileRef.current?.click();
  };

  const handleFileChange = () => {
    if (!selectedChannel || !hasChannelEnabledGames(selectedChannel, formulas)) return;
    const raw = buildMockImportRows(selectedChannel, formulas);
    const rows = enrichImportRowsOnParse(raw, formulas, games, vendors);
    setPreview(rows);
    if (fileRef.current) fileRef.current.value = '';
  };

  const runSettlement = () => {
    if (preview.length === 0) {
      showErrorToast('请先上传渠道报表');
      return;
    }
    const next = preview.map((row) => calculateImportRow(row, formulas, games, vendors));
    setPreview(next);
    const hasError = next.some((r) => r.error || !r.calculated);
    if (hasError) {
      showErrorToast('部分数据无法结算，请检查标红提示');
      return;
    }
    showToast('结算成功', 'success');
  };

  const confirmImport = () => {
    if (preview.length === 0) {
      showErrorToast('请先上传渠道报表');
      return;
    }
    if (!canConfirmImport) {
      const hasUnsettled = preview.some((r) => r.settlementIncome == null && !r.error);
      showErrorToast(hasUnsettled ? '请先完成弹窗内结算，再确认导入' : '存在无法导入的数据，请修正后重试');
      return;
    }
    importExternal(preview);
    closeImport();
    showToast('导入成功，已加入外部收入结算列表', 'success');
  };

  return (
    <div className="agf-card">
      <FilterBar
        actions={
          <button type="button" className="agf-btn agf-btn--primary" onClick={openImport}>
            <Upload size={16} />
            导入并结算
          </button>
        }
      >
        <MonthRangePicker value={monthRange} onChange={setMonthRange} />
        <ListSearchFields mode="gameAndVendor" value={search} onChange={setSearch} />
      </FilterBar>
      <DataTable
        rowKey={(r) => r.id}
        data={data}
        columns={[
          { key: 'time', title: '收入时间', render: (r) => r.incomeTime },
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
              options: selectOptions(EXTERNAL_CHANNELS),
            },
            render: (r) => r.channel,
          },
          { key: 'settleAmt', title: '待结算金额', render: (r) => formatMoney(r.settlementAmount) },
          { key: 'settleInc', title: '结算收入', render: (r) => formatSettlementIncome(r) },
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
      <Modal
        title="导入并结算"
        open={importOpen}
        onClose={closeImport}
        xl
        plain
        footer={
          <>
            <button type="button" className="agf-btn agf-btn--default" onClick={closeImport}>
              取消
            </button>
            <button
              type="button"
              className="agf-btn agf-btn--primary"
              onClick={runSettlement}
              disabled={!importUploaded || importSettlementReady}
            >
              结算
            </button>
            <button
              type="button"
              className="agf-btn agf-btn--primary"
              onClick={confirmImport}
              disabled={!canConfirmImport}
            >
              确认导入
            </button>
          </>
        }
      >
        {!importUploaded ? (
          <>
            <div className="agf-import-section">
              <div className="agf-import-section__title">外部渠道类型</div>
              <FieldHint>请选择要导入的外部渠道，选择后上传对应渠道报表</FieldHint>
              <div className="agf-radio-group agf-import-channels">
                {EXTERNAL_CHANNELS.map((name) => (
                  <label key={name} className="agf-radio-item">
                    <input
                      type="radio"
                      name="external-channel"
                      checked={selectedChannel === name}
                      onChange={() => selectChannel(name)}
                    />
                    <span>{name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="agf-import-section">
              <div className="agf-import-section__title">上传报表</div>
              <FieldHint>表格字段：渠道游戏ID、收入时间、待结算收入</FieldHint>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="agf-import-file"
                onChange={handleFileChange}
              />
              <div
                className={`agf-upload${!selectedChannel ? ' agf-upload--disabled' : ''}`}
                onClick={handleUploadClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') handleUploadClick(); }}
              >
                {!selectedChannel
                  ? '请先选择上方外部渠道类型'
                  : `点击上传 ${selectedChannel} 渠道报表（模拟解析）`}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="agf-import-meta">外部渠道：{selectedChannel}</div>
            <DataTable
              rowKey={(r) => r.id}
              data={preview}
              columns={IMPORT_PREVIEW_COLUMNS}
            />
          </>
        )}
      </Modal>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <div className="agf-form-hint agf-import-hint">{children}</div>;
}
