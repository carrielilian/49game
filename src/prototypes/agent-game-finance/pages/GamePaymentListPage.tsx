import React, { useState } from 'react';
import { COL_ALIGN_RIGHT, DataTable, DualCell, TimeStackCell, TimeStackHeader } from '../components/DataTable';
import { ColumnFilter } from '../components/ColumnFilter';
import { CurrencyInput, ReadonlyField, FieldError } from '../components/FormFields';
import { FilterBar } from '../components/FilterBar';
import { Drawer, Toast, type ToastType } from '../components/Modal';
import { MockFileUpload, mockFileFromName, type MockFileItem } from '../components/MockFileUpload';
import { SettlementLetterDrawer } from '../components/SettlementLetterDrawer';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../data/store';
import type { Game, GamePaymentRequest, Vendor } from '../data/types';
import { PAYMENT_STATUS_FILTER_OPTIONS } from '../utils/columnFilters';
import { ListSearchFields } from '../components/ListSearchFields';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';
import { formatCurrencyMoney, SETTLEMENT_CURRENCY } from '../utils/settlement';
import { calcGamePrepaymentSummary } from '../utils/prepayment';
import { resolveGameMarkPaymentDefaults } from '../utils/gamePaymentMarkDefaults';
import { getExchangeRateByApplyTime } from '../utils/exchangeRate';
import { buildSettlementLetterSnapshot } from '../utils/settlementLetterSnapshot';
import {
  formatOptionalAmountInput,
  formatCnyPaymentDisplay,
  formatUsdAmountDisplay,
  isPaidPayment,
  isUnpaidPayment,
  parseOptionalAmount,
  validateOptionalUsdAmount,
} from '../utils/payment';

type MarkFormErrors = Partial<Record<'payAmount' | 'payAmountUsd' | 'receiptInfo', string>>;

function resolveGameSharePaymentCompany(game?: Game): string {
  return game?.sharePaymentCompany ?? '';
}
function formatVendorReceiptInfo(vendor?: Vendor): string {
  if (!vendor) return '';
  return [
    `开户名称：${vendor.accountName}`,
    `开户银行：${vendor.bank}`,
    `开户银行所在地：${vendor.bankLocation}`,
    `支行名称：${vendor.branch}`,
    `银行卡号：${vendor.cardNumber.replace(/\s+/g, '')}`,
  ].join('\n');
}

function formatPayAmountInput(value: number): string {
  return value.toFixed(2);
}

function parsePayAmount(value: string): number {
  return Math.round(parseFloat(value.trim()) * 100) / 100;
}

function validatePayAmount(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return '实际付款金额不能为空';
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return '实际付款金额精确至小数点后两位';
  const n = parseFloat(trimmed);
  if (Number.isNaN(n) || n < 0) return '实际付款金额不能小于0';
  return undefined;
}

export function GamePaymentListPage() {
  const {
    scopedGamePayments,
    getGameName,
    getGame,
    getVendor,
    getVendorName,
    markGamePaid,
    updateGamePayment,
    gamePayments,
    exchangeRates,
    settlements,
    games,
    payments,
    contracts,
  } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [statusFilter, setStatusFilter] = useState('');
  const [markOpen, setMarkOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [current, setCurrent] = useState<GamePaymentRequest | null>(null);
  const [form, setForm] = useState({ remark: '', receiptInfo: '' });
  const [payAmount, setPayAmount] = useState('');
  const [payAmountUsd, setPayAmountUsd] = useState('');
  const [markErrors, setMarkErrors] = useState<MarkFormErrors>({});
  const [detailRemark, setDetailRemark] = useState('');
  const [voucherFiles, setVoucherFiles] = useState<{ settlement: MockFileItem[]; invoice: MockFileItem[] }>({
    settlement: [],
    invoice: [],
  });
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const parseSavedFiles = (raw?: string) =>
    raw ? raw.split(',').map((name) => name.trim()).filter(Boolean).map((name) => mockFileFromName(name)) : [];

  const fmtPaymentAmount = (value: number) => formatCurrencyMoney(value, SETTLEMENT_CURRENCY);

  const data = scopedGamePayments.filter((p) => {
    const game = getGame(p.gameId);
    if (!matchesListSearch(search, {
      gameId: p.gameId,
      gameName: game ? getGameName(p.gameId) : p.gameId,
      vendorId: game?.vendorId,
      vendorName: game ? getVendor(game.vendorId)?.name : undefined,
    })) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    return true;
  });

  const loadPaymentFiles = (p: GamePaymentRequest) => ({
    settlement: parseSavedFiles(p.settlementLetter),
    invoice: parseSavedFiles(p.invoice),
  });

  const openMark = (p: GamePaymentRequest) => {
    const game = getGame(p.gameId);
    const vendor = game ? getVendor(game.vendorId) : undefined;
    const contract = contracts.find((c) => c.gameId === p.gameId);
    const { remainingPrepayment } = calcGamePrepaymentSummary(game, p.gameId, gamePayments);
    const exchangeRate = getExchangeRateByApplyTime(p.applyTime, exchangeRates) ?? 7.21;
    const defaults = resolveGameMarkPaymentDefaults(
      p.pendingAmount,
      game,
      vendor,
      contract,
      remainingPrepayment,
      exchangeRate,
    );
    setCurrent(p);
    setForm({
      remark: p.remark ?? '',
      receiptInfo: p.receiptInfo ?? formatVendorReceiptInfo(vendor),
    });
    setPayAmount(formatPayAmountInput(defaults.actualAmount));
    setPayAmountUsd(formatOptionalAmountInput(defaults.actualAmountUsd));
    setMarkErrors({});
    setMarkOpen(true);
  };

  const openDetail = (p: GamePaymentRequest) => {
    setCurrent(p);
    setDetailRemark(p.remark ?? '');
    setDetailOpen(true);
  };

  const openLetter = (p: GamePaymentRequest) => { setCurrent(p); setLetterOpen(true); };

  const openVoucher = (p: GamePaymentRequest) => {
    setCurrent(p);
    setVoucherFiles(loadPaymentFiles(p));
    setVoucherOpen(true);
  };

  const buildMarkPayload = () => {
    const game = current ? getGame(current.gameId) : undefined;
    return {
      payBank: resolveGameSharePaymentCompany(game),
      receiptInfo: form.receiptInfo.trim(),
      remark: form.remark,
      actualAmount: parsePayAmount(payAmount),
      actualAmountUsd: parseOptionalAmount(payAmountUsd),
    };
  };

  const normalizePayAmount = () => {
    const trimmed = payAmount.trim();
    if (!trimmed || validatePayAmount(trimmed)) return;
    setPayAmount(formatPayAmountInput(parseFloat(trimmed)));
  };

  const normalizePayAmountUsd = () => {
    const trimmed = payAmountUsd.trim();
    if (!trimmed || validateOptionalUsdAmount(trimmed)) return;
    setPayAmountUsd(formatOptionalAmountInput(parseFloat(trimmed)));
  };

  const clearMarkError = (key: keyof MarkFormErrors) => {
    setMarkErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateMarkForm = () => {
    const errors: MarkFormErrors = {};
    const payErr = validatePayAmount(payAmount);
    if (payErr) errors.payAmount = payErr;
    const usdErr = validateOptionalUsdAmount(payAmountUsd);
    if (usdErr) errors.payAmountUsd = usdErr;
    if (!form.receiptInfo.trim()) errors.receiptInfo = '收款信息不能为空';
    setMarkErrors(errors);
    if (Object.keys(errors).length > 0) {
      setToast({ message: '请完善所有信息', type: 'error' });
      return false;
    }
    setPayAmount(formatPayAmountInput(parsePayAmount(payAmount)));
    if (payAmountUsd.trim()) {
      setPayAmountUsd(formatOptionalAmountInput(parseOptionalAmount(payAmountUsd) ?? 0));
    }
    return true;
  };

  const submitMarkPaid = () => {
    if (!current || !validateMarkForm()) return;
    const game = getGame(current.gameId);
    const vendor = game ? getVendor(game.vendorId) : undefined;
    const paymentCurrency = game?.sharePaymentCurrency ?? '人民币';
    const letterPayAmountOverride = paymentCurrency === '美金'
      ? (parseOptionalAmount(payAmountUsd) ?? 0)
      : parsePayAmount(payAmount);
    const contract = contracts.find((c) => c.gameId === current.gameId);
    const letterSnapshot = buildSettlementLetterSnapshot({
      vendorId: game?.vendorId ?? '',
      gameId: current.gameId,
      amount: current.pendingAmount,
      settlementIds: current.settlementIds,
      applyTime: current.applyTime,
      vendor,
      game,
      contract,
      settlements,
      payments,
      gamePayments,
      exchangeRates,
      games,
      getGameName,
      letterPayAmountOverride,
    });
    markGamePaid(current.id, { ...buildMarkPayload(), letterSnapshot });
    setMarkOpen(false);
    setToast({ message: '提交成功', type: 'success' });
  };

  const submitDetail = () => {
    if (!current) return;
    updateGamePayment(current.id, { remark: detailRemark });
    setToast({ message: '提交成功', type: 'success' });
  };

  const submitVoucher = () => {
    if (!current) return;
    updateGamePayment(current.id, {
      settlementLetter: voucherFiles.settlement.map((f) => f.name).join(', ') || undefined,
      invoice: voucherFiles.invoice.map((f) => f.name).join(', ') || undefined,
    });
    setToast({ message: '提交成功', type: 'success' });
  };

  const receiptInfoDisplay = (p: GamePaymentRequest | null) => {
    if (!p) return '';
    if (p.receiptInfo) return p.receiptInfo;
    const game = getGame(p.gameId);
    return formatVendorReceiptInfo(game ? getVendor(game.vendorId) : undefined);
  };

  const currentVendorId = current ? getGame(current.gameId)?.vendorId ?? '' : '';
  const currentGame = current ? getGame(current.gameId) : undefined;
  const sharePaymentCompany = current?.payBank || resolveGameSharePaymentCompany(currentGame);

  return (
    <div className="agf-card">
      <div data-annotation-id="game-payment-list-query">
        <FilterBar>
          <ListSearchFields mode="gameAndVendor" value={search} onChange={setSearch} />
        </FilterBar>
      </div>
      <div data-annotation-id="game-payment-list-table">
      <DataTable
        rowKey={(r) => r.id}
        data={data}
        columns={[
          { key: 'game', title: '游戏ID / 游戏名称', render: (r) => <DualCell main={getGameName(r.gameId)} sub={r.gameId} /> },
          { key: 'vendorId', title: '厂商ID', render: (r) => getGame(r.gameId)?.vendorId ?? '' },
          { key: 'vendorName', title: '厂商名称', render: (r) => {
            const vendorId = getGame(r.gameId)?.vendorId;
            return vendorId ? getVendorName(vendorId) : '';
          } },
          { ...COL_ALIGN_RIGHT, key: 'pending', title: '待付款金额', render: (r) => fmtPaymentAmount(r.pendingAmount) },
          { ...COL_ALIGN_RIGHT, key: 'actual', title: '实际付款金额', render: (r) => r.actualAmount ? fmtPaymentAmount(r.actualAmount) : '-' },
          {
            key: 'status',
            title: '付款状态',
            header: (
              <span data-annotation-id="game-payment-list-payment-col">
                <ColumnFilter
                  title="付款状态"
                  filter={{
                    type: 'select',
                    value: statusFilter,
                    onChange: setStatusFilter,
                    options: PAYMENT_STATUS_FILTER_OPTIONS,
                  }}
                />
              </span>
            ),
            render: (r) => <StatusBadge text={r.status} />,
          },
          {
            key: 'times',
            title: '申请时间',
            header: <TimeStackHeader labels={['申请时间', '付款时间']} />,
            render: (r) => <TimeStackCell lines={[r.applyTime, r.payTime ?? '-']} />,
          },
          { key: 'ops', title: '操作', render: (r) => (
            <div className="agf-actions">
              {isPaidPayment(r.status) && <button type="button" className="agf-btn agf-btn--link" data-annotation-id="game-payment-list-detail" onClick={() => openDetail(r)}>详细信息</button>}
              {isUnpaidPayment(r.status) && <button type="button" className="agf-btn agf-btn--link" data-annotation-id="game-payment-list-mark" onClick={() => openMark(r)}>标记付款</button>}
              <button type="button" className="agf-btn agf-btn--link" data-annotation-id="game-payment-list-letter" onClick={() => openLetter(r)}>结算函</button>
              <button type="button" className="agf-btn agf-btn--link" data-annotation-id="game-payment-list-voucher" onClick={() => openVoucher(r)}>请款凭证</button>
            </div>
          ) },
        ]}
      />
      </div>
      <Drawer title="标记付款" open={markOpen} onClose={() => setMarkOpen(false)} large
        footer={
          <>
            <button type="button" className="agf-btn agf-btn--default" onClick={() => setMarkOpen(false)}>取消</button>
            <button type="button" className="agf-btn agf-btn--primary" onClick={submitMarkPaid}>标记已付款</button>
          </>
        }>
        <div data-annotation-id="game-payment-list-mark-drawer">
        <ReadonlyField label="游戏ID" value={current?.gameId ?? ''} />
        <ReadonlyField label="游戏名称" value={current ? getGameName(current.gameId) : ''} />
        <ReadonlyField label="待付款金额" value={fmtPaymentAmount(current?.pendingAmount ?? 0)} />
        <div className="agf-form-item">
          <label className="agf-form-label agf-form-label--required">实际付款金额</label>
          <div className="agf-form-field">
            <CurrencyInput
              currency="人民币"
              value={payAmount}
              onChange={(v) => {
                setPayAmount(v);
                clearMarkError('payAmount');
              }}
              onBlur={normalizePayAmount}
            />
            <FieldError message={markErrors.payAmount} />
          </div>
        </div>
        <div className="agf-form-item">
          <label className="agf-form-label">实际付款美金</label>
          <div className="agf-form-field">
            <CurrencyInput
              currency="美金"
              value={payAmountUsd}
              onChange={(v) => {
                setPayAmountUsd(v);
                clearMarkError('payAmountUsd');
              }}
              onBlur={normalizePayAmountUsd}
            />
            <FieldError message={markErrors.payAmountUsd} />
          </div>
        </div>
        <ReadonlyField label="分成付款公司" value={sharePaymentCompany || '-'} />
        <div className="agf-form-item">
          <label className="agf-form-label agf-form-label--required">收款信息</label>
          <div className="agf-form-field">
            <textarea
              className="agf-form-textarea"
              value={form.receiptInfo}
              onChange={(e) => {
                setForm({ ...form, receiptInfo: e.target.value });
                clearMarkError('receiptInfo');
              }}
            />
            <FieldError message={markErrors.receiptInfo} />
          </div>
        </div>
        <div className="agf-form-item"><label className="agf-form-label">备注</label><textarea className="agf-form-textarea" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></div>
        </div>
      </Drawer>
      <Drawer title="详细信息" open={detailOpen} onClose={() => setDetailOpen(false)} large
        footer={
          <>
            <button type="button" className="agf-btn agf-btn--default" onClick={() => setDetailOpen(false)}>取消</button>
            <button type="button" className="agf-btn agf-btn--primary" onClick={submitDetail}>提交</button>
          </>
        }>
        <div data-annotation-id="game-payment-list-detail-drawer">
        <ReadonlyField label="游戏ID" value={current?.gameId ?? ''} />
        <ReadonlyField label="游戏名称" value={current ? getGameName(current.gameId) : ''} />
        <ReadonlyField label="付款状态" value={current?.status ?? ''} />
        <ReadonlyField label="待付款金额" value={fmtPaymentAmount(current?.pendingAmount ?? 0)} />
        <ReadonlyField label="实际付款金额" value={formatCnyPaymentDisplay(current?.actualAmount)} />
        <ReadonlyField label="实际付款美金" value={formatUsdAmountDisplay(current?.actualAmountUsd)} />
        <ReadonlyField label="分成付款公司" value={sharePaymentCompany || '-'} />
        <ReadonlyField label="收款信息" value={receiptInfoDisplay(current)} multiline />
        <div className="agf-form-item"><label className="agf-form-label">备注</label><textarea className="agf-form-textarea" value={detailRemark} onChange={(e) => setDetailRemark(e.target.value)} /></div>
        </div>
      </Drawer>
      <Drawer title="请款凭证" open={voucherOpen} onClose={() => setVoucherOpen(false)} large
        footer={
          <>
            <button type="button" className="agf-btn agf-btn--default" onClick={() => setVoucherOpen(false)}>取消</button>
            <button type="button" className="agf-btn agf-btn--primary" onClick={submitVoucher}>提交</button>
          </>
        }>
        <div data-annotation-id="game-payment-list-voucher-drawer">
        <ReadonlyField label="游戏ID" value={current?.gameId ?? ''} />
        <ReadonlyField label="游戏名称" value={current ? getGameName(current.gameId) : ''} />
        <div className="agf-form-item">
          <label className="agf-form-label">结算函</label>
          <MockFileUpload
            accept=".pdf,.jpg,.jpeg,.png"
            hint="支持的上传格式为：png、jpg、pdf"
            files={voucherFiles.settlement}
            onChange={(settlement) => setVoucherFiles((prev) => ({ ...prev, settlement }))}
          />
        </div>
        <div className="agf-form-item">
          <label className="agf-form-label">电子发票</label>
          <MockFileUpload
            accept=".pdf,.jpg,.jpeg,.png"
            hint="支持的上传格式为：png、jpg、pdf"
            files={voucherFiles.invoice}
            onChange={(invoice) => setVoucherFiles((prev) => ({ ...prev, invoice }))}
          />
        </div>
        </div>
      </Drawer>
      {current && (
        <SettlementLetterDrawer
          open={letterOpen}
          onClose={() => setLetterOpen(false)}
          vendorId={currentVendorId}
          gameId={current.gameId}
          amount={current.pendingAmount}
          settlementIds={current.settlementIds}
          applyTime={current.applyTime}
          letterSnapshot={current.letterSnapshot}
          contentAnnotationId="game-payment-list-letter-drawer"
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
