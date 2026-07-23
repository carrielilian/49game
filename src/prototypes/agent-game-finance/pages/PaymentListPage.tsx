import React, { useState } from 'react';
import { COL_ALIGN_RIGHT, DataTable } from '../components/DataTable';
import { CurrencyInput, ReadonlyField, FieldError } from '../components/FormFields';
import { FilterBar } from '../components/FilterBar';
import { Drawer, Toast, type ToastType } from '../components/Modal';
import { MockFileUpload, mockFileFromName, type MockFileItem } from '../components/MockFileUpload';
import { SettlementLetterDrawer } from '../components/SettlementLetterDrawer';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../data/store';
import type { PaymentRequest, Vendor } from '../data/types';
import { GAME_PAYER_OPTIONS, PAYMENT_STATUS_FILTER_OPTIONS } from '../utils/columnFilters';
import { ListSearchFields } from '../components/ListSearchFields';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';
import { formatCurrencyMoney, SETTLEMENT_CURRENCY } from '../utils/settlement';
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

type MarkFormErrors = Partial<Record<'payAmount' | 'payAmountUsd' | 'payBank' | 'receiptInfo', string>>;

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
  if (Number.isNaN(n) || n <= 0) return '实际付款金额必须大于0';
  return undefined;
}

function resolveMarkPayer(saved?: string): string {
  if (saved && (GAME_PAYER_OPTIONS as readonly string[]).includes(saved)) return saved;
  return '';
}

export function PaymentListPage() {
  const { scopedPayments, getVendorName, getVendor, markPaid, updatePayment, settlements, payments, gamePayments, exchangeRates, games, getGameName } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [statusFilter, setStatusFilter] = useState('');
  const [markOpen, setMarkOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [current, setCurrent] = useState<PaymentRequest | null>(null);
  const [form, setForm] = useState({ payBank: '', remark: '', receiptInfo: '' });
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

  const data = scopedPayments.filter((p) => {
    if (!matchesListSearch(search, { vendorId: p.vendorId, vendorName: getVendorName(p.vendorId) })) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    return true;
  });

  const loadPaymentFiles = (p: PaymentRequest) => ({
    settlement: parseSavedFiles(p.settlementLetter),
    invoice: parseSavedFiles(p.invoice),
  });

  const openMark = (p: PaymentRequest) => {
    const vendor = getVendor(p.vendorId);
    setCurrent(p);
    setForm({
      payBank: resolveMarkPayer(p.payBank),
      remark: p.remark ?? '',
      receiptInfo: p.receiptInfo ?? formatVendorReceiptInfo(vendor),
    });
    setPayAmount(formatPayAmountInput(p.actualAmount ?? p.pendingAmount));
    setPayAmountUsd(formatOptionalAmountInput(p.actualAmountUsd));
    setMarkErrors({});
    setMarkOpen(true);
  };

  const openDetail = (p: PaymentRequest) => {
    setCurrent(p);
    setDetailRemark(p.remark ?? '');
    setDetailOpen(true);
  };

  const openLetter = (p: PaymentRequest) => { setCurrent(p); setLetterOpen(true); };

  const openVoucher = (p: PaymentRequest) => {
    setCurrent(p);
    setVoucherFiles(loadPaymentFiles(p));
    setVoucherOpen(true);
  };

  const buildMarkPayload = () => ({
    payBank: form.payBank,
    receiptInfo: form.receiptInfo.trim(),
    remark: form.remark,
    actualAmount: parsePayAmount(payAmount),
    actualAmountUsd: parseOptionalAmount(payAmountUsd),
  });

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
    if (!form.payBank.trim()) errors.payBank = '付款方不能为空';
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

  const submitMark = () => {
    if (!current || !validateMarkForm()) return;
    updatePayment(current.id, buildMarkPayload());
    setToast({ message: '提交成功', type: 'success' });
  };

  const submitMarkPaid = () => {
    if (!current || !validateMarkForm()) return;
    const vendor = getVendor(current.vendorId);
    const paymentCurrency = vendor?.sharePaymentCurrency ?? '人民币';
    const letterPayAmountOverride = paymentCurrency === '美金'
      ? (parseOptionalAmount(payAmountUsd) ?? 0)
      : parsePayAmount(payAmount);
    const letterSnapshot = buildSettlementLetterSnapshot({
      vendorId: current.vendorId,
      amount: current.pendingAmount,
      settlementIds: current.settlementIds,
      applyTime: current.applyTime,
      vendor,
      settlements,
      payments,
      gamePayments,
      exchangeRates,
      games,
      getGameName,
      letterPayAmountOverride,
    });
    markPaid(current.id, { ...buildMarkPayload(), letterSnapshot });
    setMarkOpen(false);
    setToast({ message: '提交成功', type: 'success' });
  };

  const submitDetail = () => {
    if (!current) return;
    updatePayment(current.id, { remark: detailRemark });
    setToast({ message: '提交成功', type: 'success' });
  };

  const submitVoucher = () => {
    if (!current) return;
    updatePayment(current.id, {
      settlementLetter: voucherFiles.settlement.map((f) => f.name).join(', ') || undefined,
      invoice: voucherFiles.invoice.map((f) => f.name).join(', ') || undefined,
    });
    setToast({ message: '提交成功', type: 'success' });
  };

  const receiptInfoDisplay = (p: PaymentRequest | null) => {
    if (!p) return '';
    if (p.receiptInfo) return p.receiptInfo;
    return formatVendorReceiptInfo(getVendor(p.vendorId));
  };

  return (
    <div className="agf-card">
      <FilterBar>
        <ListSearchFields mode="vendor" value={search} onChange={setSearch} />
      </FilterBar>
      <DataTable
        rowKey={(r) => r.id}
        data={data}
        columns={[
          { key: 'vendorId', title: '厂商ID', render: (r) => r.vendorId },
          { key: 'vendorName', title: '厂商名称', render: (r) => getVendorName(r.vendorId) },
          { ...COL_ALIGN_RIGHT, key: 'pending', title: '待付款金额', render: (r) => fmtPaymentAmount(r.pendingAmount) },
          { ...COL_ALIGN_RIGHT, key: 'actual', title: '实际付款金额', render: (r) => r.actualAmount ? fmtPaymentAmount(r.actualAmount) : '-' },
          {
            key: 'status',
            title: '付款状态',
            filter: {
              type: 'select',
              value: statusFilter,
              onChange: setStatusFilter,
              options: PAYMENT_STATUS_FILTER_OPTIONS,
            },
            render: (r) => <StatusBadge text={r.status} />,
          },
          { key: 'applyTime', title: '申请时间', render: (r) => r.applyTime },
          { key: 'payTime', title: '付款时间', render: (r) => r.payTime ?? '-' },
          { key: 'ops', title: '操作', render: (r) => (
            <div className="agf-actions">
              {isPaidPayment(r.status) && <button type="button" className="agf-btn agf-btn--link" onClick={() => openDetail(r)}>详细信息</button>}
              {isUnpaidPayment(r.status) && <button type="button" className="agf-btn agf-btn--link" onClick={() => openMark(r)}>标记付款</button>}
              <button type="button" className="agf-btn agf-btn--link" onClick={() => openLetter(r)}>结算函</button>
              <button type="button" className="agf-btn agf-btn--link" onClick={() => openVoucher(r)}>请款凭证</button>
            </div>
          ) },
        ]}
      />
      <Drawer title="标记付款" open={markOpen} onClose={() => setMarkOpen(false)} large
        footer={
          <>
            <button type="button" className="agf-btn agf-btn--default" onClick={() => setMarkOpen(false)}>取消</button>
            <button type="button" className="agf-btn agf-btn--primary" onClick={submitMark}>提交</button>
            <button type="button" className="agf-btn agf-btn--primary" onClick={submitMarkPaid}>标记已付款</button>
          </>
        }>
        <ReadonlyField label="厂商ID" value={current?.vendorId ?? ''} />
        <ReadonlyField label="厂商名称" value={current ? getVendorName(current.vendorId) : ''} />
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
        <div className="agf-form-item">
          <label className="agf-form-label agf-form-label--required">付款方</label>
          <div className="agf-form-field">
            <select
              className="agf-form-input"
              value={form.payBank}
              onChange={(e) => {
                setForm({ ...form, payBank: e.target.value });
                clearMarkError('payBank');
              }}
            >
              <option value="">请选择</option>
              {GAME_PAYER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <FieldError message={markErrors.payBank} />
          </div>
        </div>
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
      </Drawer>
      <Drawer title="详细信息" open={detailOpen} onClose={() => setDetailOpen(false)} large
        footer={
          <>
            <button type="button" className="agf-btn agf-btn--default" onClick={() => setDetailOpen(false)}>取消</button>
            <button type="button" className="agf-btn agf-btn--primary" onClick={submitDetail}>提交</button>
          </>
        }>
        <ReadonlyField label="厂商ID" value={current?.vendorId ?? ''} />
        <ReadonlyField label="厂商名称" value={current ? getVendorName(current.vendorId) : ''} />
        <ReadonlyField label="付款状态" value={current?.status ?? ''} />
        <ReadonlyField label="待付款金额" value={fmtPaymentAmount(current?.pendingAmount ?? 0)} />
        <ReadonlyField label="实际付款金额" value={formatCnyPaymentDisplay(current?.actualAmount)} />
        <ReadonlyField label="实际付款美金" value={formatUsdAmountDisplay(current?.actualAmountUsd)} />
        <ReadonlyField label="付款方" value={current?.payBank ?? '-'} />
        <ReadonlyField label="收款信息" value={receiptInfoDisplay(current)} multiline />
        <div className="agf-form-item"><label className="agf-form-label">备注</label><textarea className="agf-form-textarea" value={detailRemark} onChange={(e) => setDetailRemark(e.target.value)} /></div>
      </Drawer>
      <Drawer title="请款凭证" open={voucherOpen} onClose={() => setVoucherOpen(false)} large
        footer={
          <>
            <button type="button" className="agf-btn agf-btn--default" onClick={() => setVoucherOpen(false)}>取消</button>
            <button type="button" className="agf-btn agf-btn--primary" onClick={submitVoucher}>提交</button>
          </>
        }>
        <ReadonlyField label="厂商ID" value={current?.vendorId ?? ''} />
        <ReadonlyField label="厂商名称" value={current ? getVendorName(current.vendorId) : ''} />
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
      </Drawer>
      {current && <SettlementLetterDrawer open={letterOpen} onClose={() => setLetterOpen(false)} vendorId={current.vendorId} amount={current.pendingAmount} settlementIds={current.settlementIds} applyTime={current.applyTime} paymentId={current.id} letterSnapshot={current.letterSnapshot} />}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
