import React, { useState } from 'react';
import { DataTable } from '../components/DataTable';
import { ReadonlyField, FieldError } from '../components/FormFields';
import { FilterBar } from '../components/FilterBar';
import { Drawer, Toast, type ToastType } from '../components/Modal';
import { MockFileUpload, mockFileFromName, type MockFileItem } from '../components/MockFileUpload';
import { SettlementLetterDrawer } from '../components/SettlementLetterDrawer';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../data/store';
import type { PaymentRequest, Vendor } from '../data/types';
import { PAYMENT_STATUS_FILTER_OPTIONS } from '../utils/columnFilters';
import { ListSearchFields } from '../components/ListSearchFields';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';
import { formatMoney } from '../utils/settlement';
import { isPaidPayment, isUnpaidPayment } from '../utils/payment';

type MarkFormErrors = Partial<Record<'payAmount' | 'payBank' | 'receiptInfo', string>>;

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

function validatePayAmount(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return '待付款金额不能为空';
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return '待付款金额最多保留两位小数';
  const n = parseFloat(trimmed);
  if (Number.isNaN(n) || n <= 0) return '待付款金额必须大于0';
  return undefined;
}

export function PaymentListPage() {
  const { scopedPayments, getVendorName, getVendor, markPaid, updatePayment } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [statusFilter, setStatusFilter] = useState('');
  const [markOpen, setMarkOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [current, setCurrent] = useState<PaymentRequest | null>(null);
  const [form, setForm] = useState({ payBank: '', remark: '', receiptInfo: '' });
  const [payAmount, setPayAmount] = useState('');
  const [markErrors, setMarkErrors] = useState<MarkFormErrors>({});
  const [detailRemark, setDetailRemark] = useState('');
  const [voucherFiles, setVoucherFiles] = useState<{ settlement: MockFileItem[]; invoice: MockFileItem[] }>({
    settlement: [],
    invoice: [],
  });
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const parseSavedFiles = (raw?: string) =>
    raw ? raw.split(',').map((name) => name.trim()).filter(Boolean).map((name) => mockFileFromName(name)) : [];

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
      payBank: p.payBank ?? '公司招商银行',
      remark: p.remark ?? '',
      receiptInfo: p.receiptInfo ?? formatVendorReceiptInfo(vendor),
    });
    setPayAmount(String(p.actualAmount ?? p.pendingAmount));
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
    actualAmount: parseFloat(payAmount.trim()),
  });

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
    if (!form.payBank.trim()) errors.payBank = '付款银行不能为空';
    if (!form.receiptInfo.trim()) errors.receiptInfo = '收款信息不能为空';
    setMarkErrors(errors);
    if (Object.keys(errors).length > 0) {
      setToast({ message: '请完善所有信息', type: 'error' });
      return false;
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
    markPaid(current.id, buildMarkPayload());
    setMarkOpen(false);
    setToast({ message: '已标记付款', type: 'success' });
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
          { key: 'pending', title: '待付款金额', render: (r) => formatMoney(r.pendingAmount) },
          { key: 'actual', title: '实际付款金额', render: (r) => r.actualAmount ? formatMoney(r.actualAmount) : '-' },
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
          { key: 'applyTime', title: '申请付款时间', render: (r) => r.applyTime },
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
        <div className="agf-form-item">
          <label className="agf-form-label agf-form-label--required">待付款金额</label>
          <div className="agf-form-field">
            <input
              className="agf-form-input"
              value={payAmount}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) {
                  setPayAmount(v);
                  clearMarkError('payAmount');
                }
              }}
            />
            <FieldError message={markErrors.payAmount} />
          </div>
        </div>
        <div className="agf-form-item">
          <label className="agf-form-label agf-form-label--required">付款银行</label>
          <div className="agf-form-field">
            <input
              className="agf-form-input"
              value={form.payBank}
              onChange={(e) => {
                setForm({ ...form, payBank: e.target.value });
                clearMarkError('payBank');
              }}
            />
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
        <ReadonlyField label="待付款金额" value={formatMoney(current?.pendingAmount ?? 0)} />
        <ReadonlyField label="实际付款金额" value={current?.actualAmount ? formatMoney(current.actualAmount) : '-'} />
        <ReadonlyField label="付款银行" value={current?.payBank ?? '-'} />
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
            files={voucherFiles.settlement}
            onChange={(settlement) => setVoucherFiles((prev) => ({ ...prev, settlement }))}
          />
        </div>
        <div className="agf-form-item">
          <label className="agf-form-label">电子发票</label>
          <MockFileUpload
            accept=".pdf,.jpg,.jpeg,.png"
            files={voucherFiles.invoice}
            onChange={(invoice) => setVoucherFiles((prev) => ({ ...prev, invoice }))}
          />
        </div>
      </Drawer>
      {current && <SettlementLetterDrawer open={letterOpen} onClose={() => setLetterOpen(false)} vendorId={current.vendorId} amount={current.pendingAmount} settlementIds={current.settlementIds} />}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
