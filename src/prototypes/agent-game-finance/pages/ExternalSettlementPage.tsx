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
import type { ImportPreviewRow } from '../data/types';
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
  enrichImportRowsOnParse,
  findDuplicateImportGameIds,
} from '../utils/externalImport';
import {
  displaySettlementFormula,
  formatCurrencyMoney,
  formatSettlementIncome,
  formatSettlementTime,
  getSettlementDataSource,
  isUnsettledSettlement,
  SETTLEMENT_CURRENCY,
} from '../utils/settlement';

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

const DATA_SOURCE_OPTIONS = ['系统拉取', '文件导入'];

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
  const [dataSourceFilter, setDataSourceFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewRow[]>(EMPTY_IMPORT);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [pulling, setPulling] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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
    if (dataSourceFilter && getSettlementDataSource(record) !== dataSourceFilter) return false;
    if (paymentStatusFilter && record.paymentApplyStatus !== paymentStatusFilter) return false;
    return true;
  });

  const unsettled = data.filter((record) => isUnsettledSettlement(record));

  const closeImport = () => {
    setImportOpen(false);
    setPreview(EMPTY_IMPORT);
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
    const raw = buildMockImportRows(scopedFormulas, scopedGames, scopedVendors);
    const rows = enrichImportRowsOnParse(raw, scopedGames, scopedVendors);
    const duplicateIds = findDuplicateImportGameIds(rows, scopedSettlements);
    if (fileRef.current) fileRef.current.value = '';
    if (duplicateIds.length > 0) {
      setPreview(EMPTY_IMPORT);
      showToast(`${duplicateIds.join('、')}数据重复上传`, 'error');
      return;
    }
    setPreview(rows);
    if (rows.some((row) => row.error)) {
      showToast('部分数据无法导入，请检查列表提示', 'error');
      return;
    }
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
          columns={[
            { key: 'time', title: '收入时间', render: (record) => record.incomeTime },
            { key: 'game', title: '游戏ID / 游戏名称', render: (record) => <DualCell main={getGameName(record.gameId)} sub={record.gameId} /> },
            { key: 'vendorId', title: '厂商ID', render: (record) => record.vendorId },
            { key: 'vendorName', title: '厂商名称', render: (record) => getVendorName(record.vendorId) },
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
            {
              key: 'dataSource',
              title: '数据来源',
              header: (
                <span data-annotation-id="internal-settlement-query">
                  <ColumnFilter
                    title="数据来源"
                    filter={{
                      type: 'select',
                      value: dataSourceFilter,
                      onChange: setDataSourceFilter,
                      options: selectOptions(DATA_SOURCE_OPTIONS),
                    }}
                  />
                </span>
              ),
              render: (record) => <StatusBadge text={getSettlementDataSource(record)} />,
            },
            { ...COL_ALIGN_RIGHT, key: 'settleAmt', title: '待结算金额', render: (record) => formatCurrencyMoney(record.settlementAmount, SETTLEMENT_CURRENCY) },
            { ...COL_ALIGN_RIGHT, key: 'settleInc', title: '结算收入', render: (record) => formatSettlementIncome(record) },
            { key: 'formula', title: '结算公式', render: (record) => displaySettlementFormula(record.formulaText) },
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
