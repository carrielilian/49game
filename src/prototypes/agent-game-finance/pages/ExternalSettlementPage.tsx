import React, { useMemo, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { COL_ALIGN_RIGHT, DataTable, DualCell, type Column } from '../components/DataTable';
import { ColumnFilter } from '../components/ColumnFilter';
import { FilterBar } from '../components/FilterBar';
import { MonthRangePicker } from '../components/MonthRangePicker';
import { Modal, Toast, type ToastType } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../data/store';
import { EXTERNAL_CHANNELS } from '../data/mock-data';
import type { ImportPreviewRow, SettlementRecord } from '../data/types';
import {
  PAYMENT_APPLY_STATUS_FILTER_OPTIONS,
  selectOptions,
} from '../utils/columnFilters';
import { ListSearchFields } from '../components/ListSearchFields';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';
import { getPreviousMonthKey, getRecentTwoMonthsRange, isMonthInRange } from '../utils/monthRange';
import {
  checkFinanceCenterReady,
  fetchFinanceCenterRows,
  getInternalChannelCategory,
  INTERNAL_CHANNEL_CATEGORIES,
} from '../utils/financeCenter';
import {
  buildMockImportRows,
  collectImportValidationErrors,
  enrichImportRowsOnParse,
  findDuplicateImportRowNumbers,
} from '../utils/externalImport';
import {
  displaySettlementFormula,
  formatCurrencyMoney,
  formatSettlementIncome,
  formatSettlementTime,
  isUnsettledSettlement,
  SETTLEMENT_CURRENCY,
} from '../utils/settlement';
import { compareSettlementAddedDesc } from '../utils/listSort';

const EMPTY_IMPORT: ImportPreviewRow[] = [];

const IMPORT_PREVIEW_COLUMNS: Column<ImportPreviewRow>[] = [
  { key: 'incomeTime', title: '收入时间', render: (row) => row.incomeTime },
  { key: 'channel', title: '渠道', render: (row) => row.channel },
  { key: 'gameId', title: '游戏ID', render: (row) => row.gameId },
  { key: 'gameName', title: '游戏名称', render: (row) => row.gameName },
  { key: 'vendorName', title: '厂商名称', render: (row) => row.vendorName },
  {
    ...COL_ALIGN_RIGHT,
    key: 'pendingAmount',
    title: '待结算金额',
    render: (row) => (
      <>
        {formatCurrencyMoney(row.pendingAmount, SETTLEMENT_CURRENCY)}
        {row.error && <div className="agf-form-error">{row.error}</div>}
      </>
    ),
  },
];

function buildImportTotalRow(rows: ImportPreviewRow[]): React.ReactNode {
  const total = rows.reduce((sum, row) => sum + row.pendingAmount, 0);
  return (
    <tr className="agf-table__summary-row">
      <td>总计</td>
      <td />
      <td />
      <td />
      <td />
      <td className="agf-table__cell--right">
        {formatCurrencyMoney(total, SETTLEMENT_CURRENCY)}
      </td>
    </tr>
  );
}

function buildSettlementSummaryRow(rows: SettlementRecord[]): React.ReactNode {
  const settlementAmountTotal = rows.reduce((sum, row) => sum + row.settlementAmount, 0);
  const settlementIncomeTotal = rows.reduce(
    (sum, row) => sum + (isUnsettledSettlement(row) ? 0 : row.settlementIncome),
    0,
  );
  return (
    <tr className="agf-table__summary-row">
      <td>查询总计</td>
      <td />
      <td />
      <td />
      <td className="agf-table__cell--right">{formatCurrencyMoney(settlementAmountTotal, SETTLEMENT_CURRENCY)}</td>
      <td className="agf-table__cell--right">{formatCurrencyMoney(settlementIncomeTotal, SETTLEMENT_CURRENCY)}</td>
      <td />
      <td />
      <td />
    </tr>
  );
}

export function IncomeSettlementPage() {
  const {
    businessType,
    scopedSettlements,
    formulas,
    scopedGames,
    scopedVendors,
    getGameName,
    getVendorName,
    importExternal,
    pullInternal,
    settleRecords,
    internalSettlementButtons,
    setInternalSettlementButtons,
  } = useAppStore();
  const scopedGameIds = useMemo(() => new Set(scopedGames.map((game) => game.id)), [scopedGames]);
  const scopedFormulas = useMemo(
    () => formulas.filter((formula) => scopedGameIds.has(formula.gameId)),
    [formulas, scopedGameIds],
  );
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [monthRange, setMonthRange] = useState(getRecentTwoMonthsRange);
  const [channelFilter, setChannelFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewRow[]>(EMPTY_IMPORT);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [pulling, setPulling] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const demoImportAttemptRef = useRef(0);
  const importUploaded = preview.length > 0;
  const canConfirmImport = importUploaded && preview.every((row) => !row.error);

  const { pullCompleted } = internalSettlementButtons[businessType].internal;
  const data = scopedSettlements.filter((record) => {
    if (record.type !== 'external' && record.type !== 'internal') return false;
    if (!isMonthInRange(record.incomeTime, monthRange)) return false;
    if (!matchesListSearch(search, {
      gameId: record.gameId,
      gameName: getGameName(record.gameId),
      vendorId: record.vendorId,
      vendorName: getVendorName(record.vendorId),
    })) return false;
    const displayChannel = record.type === 'internal'
      ? getInternalChannelCategory(record.channel)
      : record.channel;
    if (channelFilter && displayChannel !== channelFilter) return false;
    if (paymentStatusFilter && record.paymentApplyStatus !== paymentStatusFilter) return false;
    return true;
  }).sort(compareSettlementAddedDesc);

  // 查询条件只控制列表展示；结算始终处理当前业务类型下的全部未结算收入。
  const unsettled = scopedSettlements.filter((record) =>
    (record.type === 'external' || record.type === 'internal')
    && isUnsettledSettlement(record));

  const closeImport = () => {
    setImportOpen(false);
    setPreview(EMPTY_IMPORT);
    setImportErrors([]);
    demoImportAttemptRef.current = 0;
  };

  const showToast = (message: string, type: ToastType) => setToast({ message, type });

  const handlePull = async () => {
    if (pulling || pullCompleted) return;
    setPulling(true);
    try {
      const ready = await checkFinanceCenterReady();
      if (!ready) {
        showToast('财务中心还未结算完成', 'error');
        return;
      }
      const incomeMonthKey = getPreviousMonthKey();
      const rows = fetchFinanceCenterRows(
        'internal',
        scopedFormulas,
        scopedGames,
        incomeMonthKey,
        businessType,
      );
      if (rows.length === 0) {
        showToast('暂无可拉取数据', 'error');
        return;
      }
      pullInternal('internal', rows, incomeMonthKey);
      setMonthRange(getRecentTwoMonthsRange());
      setInternalSettlementButtons('internal', {
        pullCompleted: true,
        settleCompleted: false,
        monthRange: getRecentTwoMonthsRange(),
      });
      showToast('已从财务中心拉取待结算数据', 'success');
    } finally {
      setPulling(false);
    }
  };

  const handleFileChange = () => {
    const file = fileRef.current?.files?.[0];
    setPreview(EMPTY_IMPORT);
    setImportErrors([]);
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['xlsx', 'xls', 'csv'].includes(extension)) {
      setImportErrors(['格式错误，仅支持 xlsx、xls、csv']);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImportErrors(['文件大小不得超过5MB']);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (demoImportAttemptRef.current === 0) {
      demoImportAttemptRef.current = 1;
      setImportErrors([
        '第2、5行收入时间错误',
        '第2、4行游戏ID不存在',
        '第3行渠道不存在',
        '第4行待结算金额格式错误',
      ]);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    const raw = buildMockImportRows(scopedGames, scopedVendors);
    const rows = enrichImportRowsOnParse(raw, scopedGames);
    const rowErrors = collectImportValidationErrors(rows);
    if (rowErrors.length > 0) {
      setImportErrors(rowErrors);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    const duplicateRows = findDuplicateImportRowNumbers(rows, scopedSettlements);
    if (fileRef.current) fileRef.current.value = '';
    if (duplicateRows.length > 0) {
      setPreview(EMPTY_IMPORT);
      setImportErrors([`第${duplicateRows.join('、')}行数据存在重复内容`]);
      return;
    }
    setPreview(rows);
    showToast('上传成功', 'success');
  };

  const confirmImport = () => {
    if (!canConfirmImport) return;
    importExternal(preview);
    closeImport();
    showToast('导入成功，已加入收入结算列表', 'success');
  };

  const handleSettlement = () => {
    if (unsettled.length === 0) {
      showToast('没有待结算数据', 'error');
      return;
    }
    const ids = unsettled.map((record) => record.id);
    const result = settleRecords(ids);
    if (!result.ok) {
      showToast(result.message ?? '结算失败，本次数据均未结算', 'error');
      return;
    }
    const settledIdSet = new Set(ids);
    const hasRemainingPulledIncome = scopedSettlements.some((record) =>
      record.type === 'internal'
      && isUnsettledSettlement(record)
      && !settledIdSet.has(record.id));
    if (pullCompleted && !hasRemainingPulledIncome) {
      setInternalSettlementButtons('internal', { settleCompleted: true });
    }
    showToast('结算成功', 'success');
  };

  return (
    <div className="agf-card">
      <div data-annotation-id="external-settlement-query">
        <FilterBar
          actions={(
            <>
              <button
                type="button"
                className="agf-btn agf-btn--primary"
                data-annotation-id="internal-settlement-pull"
                onClick={handlePull}
                disabled={pulling || pullCompleted}
              >
                {pulling ? '拉取中...' : '数据拉取'}
              </button>
              <button
                type="button"
                className="agf-btn agf-btn--primary"
                data-annotation-id="external-settlement-import"
                onClick={() => {
                  setPreview(EMPTY_IMPORT);
                  setImportErrors([]);
                  demoImportAttemptRef.current = 0;
                  setImportOpen(true);
                }}
              >
                <Upload size={16} />
                数据导入
              </button>
              <button
                type="button"
                className="agf-btn agf-btn--primary"
                data-annotation-id="external-settlement-settle"
                onClick={handleSettlement}
                disabled={pulling || unsettled.length === 0}
              >
                结算
              </button>
            </>
          )}
        >
          <MonthRangePicker value={monthRange} onChange={setMonthRange} />
          <ListSearchFields mode="gameAndVendor" value={search} onChange={setSearch} />
        </FilterBar>
      </div>
      <div data-annotation-id="external-settlement-table">
        <DataTable
          rowKey={(record) => record.id}
          data={data}
          leadingRow={buildSettlementSummaryRow(data)}
          columns={[
            { key: 'time', title: '收入时间', render: (record) => record.incomeTime },
            { key: 'game', title: '游戏ID / 游戏名称', render: (record) => <DualCell main={getGameName(record.gameId)} sub={record.gameId} /> },
            { key: 'vendor', title: '厂商ID / 厂商名称', render: (record) => <DualCell main={getVendorName(record.vendorId)} sub={record.vendorId} /> },
            {
              key: 'channel',
              title: '渠道',
              header: (
                <span data-annotation-id="external-settlement-channel-col">
                  <ColumnFilter
                    title="渠道"
                    filter={{
                      type: 'select',
                      value: channelFilter,
                      onChange: setChannelFilter,
                      options: selectOptions([...INTERNAL_CHANNEL_CATEGORIES, ...EXTERNAL_CHANNELS]),
                    }}
                  />
                </span>
              ),
              render: (record) => record.type === 'internal'
                ? getInternalChannelCategory(record.channel)
                : record.channel,
            },
            { ...COL_ALIGN_RIGHT, key: 'settleAmt', title: '待结算金额', render: (record) => formatCurrencyMoney(record.settlementAmount, SETTLEMENT_CURRENCY) },
            { ...COL_ALIGN_RIGHT, key: 'settleInc', title: '结算收入', render: (record) => formatSettlementIncome(record) },
            { key: 'formula', title: '结算公式', render: (record) => isUnsettledSettlement(record) ? '-' : displaySettlementFormula(record.formulaText) },
            { key: 'settleTime', title: '结算时间', render: (record) => formatSettlementTime(record) },
            {
              key: 'status',
              title: '申请付款状态',
              header: (
                <span data-annotation-id="external-settlement-payment-col">
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
              render: (record) => <StatusBadge text={record.paymentApplyStatus} />,
            },
          ]}
        />
      </div>
      <Modal
        title="数据导入"
        open={importOpen}
        onClose={closeImport}
        xl
        plain
        footer={(
          <>
            <button type="button" className="agf-btn agf-btn--default" onClick={closeImport}>
              取消
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
        )}
      >
        <div data-annotation-id="external-settlement-import-modal">
          {!importUploaded ? (
            <div className="agf-import-section">
              <div className="agf-import-section__title">上传报表</div>
              <FieldHint>表格字段：收入时间、渠道、游戏ID、游戏名称、厂商名称、待结算金额</FieldHint>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="agf-import-file"
                onChange={handleFileChange}
              />
              <div
                className="agf-upload"
                onClick={() => fileRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') fileRef.current?.click();
                }}
              >
                点击上传渠道报表（模拟解析）
              </div>
              {importErrors.length > 0 && (
                <div className="agf-import-errors" role="alert">
                  {importErrors.map((message) => (
                    <div key={message} className="agf-form-error">{message}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <DataTable
              rowKey={(row) => row.id}
              data={preview}
              columns={IMPORT_PREVIEW_COLUMNS}
              leadingRow={buildImportTotalRow(preview)}
            />
          )}
        </div>
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
