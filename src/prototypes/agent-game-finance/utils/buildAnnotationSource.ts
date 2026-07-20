import type { AnnotationSourceDocument } from '@axhub/annotation';
import annotationSourceDocument from '../annotation-source.json';
import gameListAdd from '../docs/annotations/game-list/add-button.md?raw';
import gameListAddForm from '../docs/annotations/game-list/add-form.md?raw';
import gameListChannelsAction from '../docs/annotations/game-list/channels-action.md?raw';
import gameListChannelsForm from '../docs/annotations/game-list/channels-form.md?raw';
import gameListContractAction from '../docs/annotations/game-list/contract-action.md?raw';
import gameListContractForm from '../docs/annotations/game-list/contract-form.md?raw';
import gameListTable from '../docs/annotations/game-list/data-table.md?raw';
import gameListEdit from '../docs/annotations/game-list/edit-action.md?raw';
import gameListEditForm from '../docs/annotations/game-list/edit-form.md?raw';
import gameListExport from '../docs/annotations/game-list/export-button.md?raw';
import gameListLogsAction from '../docs/annotations/game-list/logs-action.md?raw';
import gameListLogsDrawer from '../docs/annotations/game-list/logs-drawer.md?raw';
import gameListOpStatus from '../docs/annotations/game-list/op-status-column.md?raw';
import gameListPaidCols from '../docs/annotations/game-list/paid-columns.md?raw';
import gameListPayerCol from '../docs/annotations/game-list/payer-column.md?raw';
import gameListQuery from '../docs/annotations/game-list/query-bar.md?raw';
import gameListSummary from '../docs/annotations/game-list/summary-row.md?raw';
import formulaListFormulaAction from '../docs/annotations/formula-list/formula-action.md?raw';
import formulaListFormulaCol from '../docs/annotations/formula-list/formula-column.md?raw';
import formulaListFormulaForm from '../docs/annotations/formula-list/formula-form.md?raw';
import formulaListTable from '../docs/annotations/formula-list/data-table.md?raw';
import formulaListLogsAction from '../docs/annotations/formula-list/logs-action.md?raw';
import formulaListLogsDrawer from '../docs/annotations/formula-list/logs-drawer.md?raw';
import formulaListQuery from '../docs/annotations/formula-list/query-bar.md?raw';
import externalSettlementChannelCol from '../docs/annotations/external-settlement/channel-column.md?raw';
import externalSettlementTable from '../docs/annotations/external-settlement/data-table.md?raw';
import externalSettlementImportBtn from '../docs/annotations/external-settlement/import-button.md?raw';
import externalSettlementImportModal from '../docs/annotations/external-settlement/import-modal.md?raw';
import externalSettlementPaymentCol from '../docs/annotations/external-settlement/payment-status-column.md?raw';
import externalSettlementQuery from '../docs/annotations/external-settlement/query-bar.md?raw';
import gameIncomeApplyModal from '../docs/annotations/game-income/apply-payment-modal.md?raw';
import gameIncomeApplyAction from '../docs/annotations/game-income/apply-payment-action.md?raw';
import gameIncomeTable from '../docs/annotations/game-income/data-table.md?raw';
import gameIncomeFieldHelp from '../docs/annotations/game-income/field-help.md?raw';
import gameIncomePaymentForm from '../docs/annotations/game-income/payment-settings-form.md?raw';
import gameIncomePaymentSettings from '../docs/annotations/game-income/payment-settings-action.md?raw';
import gameIncomeQuery from '../docs/annotations/game-income/query-bar.md?raw';
import gamePaymentListDetailDrawer from '../docs/annotations/game-payment-list/detail-drawer.md?raw';
import gamePaymentListDetailAction from '../docs/annotations/game-payment-list/detail-action.md?raw';
import gamePaymentListTable from '../docs/annotations/game-payment-list/data-table.md?raw';
import gamePaymentListLetterAction from '../docs/annotations/game-payment-list/letter-action.md?raw';
import gamePaymentListLetterDrawer from '../docs/annotations/game-payment-list/letter-drawer.md?raw';
import gamePaymentListMarkDrawer from '../docs/annotations/game-payment-list/mark-drawer.md?raw';
import gamePaymentListMarkAction from '../docs/annotations/game-payment-list/mark-action.md?raw';
import gamePaymentListPaymentCol from '../docs/annotations/game-payment-list/payment-status-column.md?raw';
import gamePaymentListQuery from '../docs/annotations/game-payment-list/query-bar.md?raw';
import gamePaymentListVoucherDrawer from '../docs/annotations/game-payment-list/voucher-drawer.md?raw';
import gamePaymentListVoucherAction from '../docs/annotations/game-payment-list/voucher-action.md?raw';
import statsSummaryChannelCol from '../docs/annotations/stats-summary/channel-column.md?raw';
import statsSummaryExport from '../docs/annotations/stats-summary/export-button.md?raw';
import statsSummaryTable from '../docs/annotations/stats-summary/data-table.md?raw';
import statsSummaryQuery from '../docs/annotations/stats-summary/query-bar.md?raw';
import statsSummarySummaryRow from '../docs/annotations/stats-summary/summary-row.md?raw';
import internalRefundChannelCol from '../docs/annotations/internal-refund/channel-column.md?raw';
import internalRefundTable from '../docs/annotations/internal-refund/data-table.md?raw';
import internalRefundPaymentCol from '../docs/annotations/internal-refund/payment-status-column.md?raw';
import internalRefundPull from '../docs/annotations/internal-refund/pull-button.md?raw';
import internalRefundQuery from '../docs/annotations/internal-refund/query-bar.md?raw';
import internalRefundSettle from '../docs/annotations/internal-refund/settle-button.md?raw';
import internalSettlementChannelCol from '../docs/annotations/internal-settlement/channel-column.md?raw';
import internalSettlementTable from '../docs/annotations/internal-settlement/data-table.md?raw';
import internalSettlementPaymentCol from '../docs/annotations/internal-settlement/payment-status-column.md?raw';
import internalSettlementPull from '../docs/annotations/internal-settlement/pull-button.md?raw';
import internalSettlementQuery from '../docs/annotations/internal-settlement/query-bar.md?raw';
import internalSettlementSettle from '../docs/annotations/internal-settlement/settle-button.md?raw';
import vendorListAdd from '../docs/annotations/vendor-list/add-button.md?raw';
import vendorListAddForm from '../docs/annotations/vendor-list/add-form.md?raw';
import vendorListEdit from '../docs/annotations/vendor-list/edit-action.md?raw';
import vendorListEditForm from '../docs/annotations/vendor-list/edit-form.md?raw';
import vendorListQuery from '../docs/annotations/vendor-list/query-bar.md?raw';
import vendorListTable from '../docs/annotations/vendor-list/data-table.md?raw';
import vendorListInvoice from '../docs/annotations/vendor-list/invoice-column.md?raw';

const MARKDOWN_BY_NODE_ID: Record<string, string> = {
  'vendor-list-query': vendorListQuery,
  'vendor-list-add': vendorListAdd,
  'vendor-list-table': vendorListTable,
  'vendor-list-invoice-col': vendorListInvoice,
  'vendor-list-edit': vendorListEdit,
  'vendor-list-add-form': vendorListAddForm,
  'vendor-list-edit-form': vendorListEditForm,
  'game-list-query': gameListQuery,
  'game-list-export': gameListExport,
  'game-list-add': gameListAdd,
  'game-list-table': gameListTable,
  'game-list-payer-col': gameListPayerCol,
  'game-list-paid-cols': gameListPaidCols,
  'game-list-op-status': gameListOpStatus,
  'game-list-summary': gameListSummary,
  'game-list-edit': gameListEdit,
  'game-list-contract': gameListContractAction,
  'game-list-channels': gameListChannelsAction,
  'game-list-logs': gameListLogsAction,
  'game-list-add-form': gameListAddForm,
  'game-list-edit-form': gameListEditForm,
  'game-list-contract-form': gameListContractForm,
  'game-list-channels-form': gameListChannelsForm,
  'game-list-logs-drawer': gameListLogsDrawer,
  'formula-list-query': formulaListQuery,
  'formula-list-table': formulaListTable,
  'formula-list-formula-col': formulaListFormulaCol,
  'formula-list-formula': formulaListFormulaAction,
  'formula-list-logs': formulaListLogsAction,
  'formula-list-formula-form': formulaListFormulaForm,
  'formula-list-logs-drawer': formulaListLogsDrawer,
  'external-settlement-query': externalSettlementQuery,
  'external-settlement-import': externalSettlementImportBtn,
  'external-settlement-table': externalSettlementTable,
  'external-settlement-channel-col': externalSettlementChannelCol,
  'external-settlement-payment-col': externalSettlementPaymentCol,
  'external-settlement-import-modal': externalSettlementImportModal,
  'internal-settlement-query': internalSettlementQuery,
  'internal-settlement-pull': internalSettlementPull,
  'internal-settlement-settle': internalSettlementSettle,
  'internal-settlement-table': internalSettlementTable,
  'internal-settlement-channel-col': internalSettlementChannelCol,
  'internal-settlement-payment-col': internalSettlementPaymentCol,
  'internal-refund-query': internalRefundQuery,
  'internal-refund-pull': internalRefundPull,
  'internal-refund-settle': internalRefundSettle,
  'internal-refund-table': internalRefundTable,
  'internal-refund-channel-col': internalRefundChannelCol,
  'internal-refund-payment-col': internalRefundPaymentCol,
  'game-income-query': gameIncomeQuery,
  'game-income-table': gameIncomeTable,
  'game-income-field-help': gameIncomeFieldHelp,
  'game-income-payment-settings': gameIncomePaymentSettings,
  'game-income-apply-payment': gameIncomeApplyAction,
  'game-income-payment-form': gameIncomePaymentForm,
  'game-income-apply-modal': gameIncomeApplyModal,
  'game-payment-list-query': gamePaymentListQuery,
  'game-payment-list-table': gamePaymentListTable,
  'game-payment-list-payment-col': gamePaymentListPaymentCol,
  'game-payment-list-mark': gamePaymentListMarkAction,
  'game-payment-list-detail': gamePaymentListDetailAction,
  'game-payment-list-letter': gamePaymentListLetterAction,
  'game-payment-list-letter-drawer': gamePaymentListLetterDrawer,
  'game-payment-list-voucher': gamePaymentListVoucherAction,
  'game-payment-list-mark-drawer': gamePaymentListMarkDrawer,
  'game-payment-list-detail-drawer': gamePaymentListDetailDrawer,
  'game-payment-list-voucher-drawer': gamePaymentListVoucherDrawer,
  'stats-summary-query': statsSummaryQuery,
  'stats-summary-export': statsSummaryExport,
  'stats-summary-table': statsSummaryTable,
  'stats-summary-summary-row': statsSummarySummaryRow,
  'stats-summary-channel-col': statsSummaryChannelCol,
};

export function buildAnnotationSource(): AnnotationSourceDocument {
  const base = JSON.parse(JSON.stringify(annotationSourceDocument)) as AnnotationSourceDocument;
  base.markdownMap = {
    ...(base.markdownMap ?? {}),
    ...MARKDOWN_BY_NODE_ID,
  };
  return base;
}
