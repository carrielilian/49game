import React, { useState } from 'react';
import { DataTable } from '../components/DataTable';
import { ReadonlyField } from '../components/FormFields';
import { FilterBar } from '../components/FilterBar';
import { Drawer, Toast } from '../components/Modal';
import { SettlementLetterDrawer } from '../components/SettlementLetterDrawer';
import { StatusBadge } from '../components/StatusBadge';
import { useAppStore } from '../data/store';
import type { PaymentRequest } from '../data/types';
import { PAYMENT_STATUS_FILTER_OPTIONS } from '../utils/columnFilters';
import { ListSearchFields } from '../components/ListSearchFields';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';
import { formatMoney } from '../utils/settlement';

export function PaymentListPage() {
  const { payments, getVendorName, getVendor, markPaid } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [statusFilter, setStatusFilter] = useState('');
  const [markOpen, setMarkOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [current, setCurrent] = useState<PaymentRequest | null>(null);
  const [form, setForm] = useState({ payBank: '', receiptInfo: '', remark: '' });
  const [toast, setToast] = useState('');

  const data = payments.filter((p) => {
    if (!matchesListSearch(search, { vendorId: p.vendorId, vendorName: getVendorName(p.vendorId) })) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    return true;
  });

  const openMark = (p: PaymentRequest) => {
    const v = getVendor(p.vendorId);
    setCurrent(p);
    setForm({ payBank: '公司招商银行', receiptInfo: `${v?.name ?? ''} ${v?.cardNumber ?? ''}`, remark: '' });
    setMarkOpen(true);
  };

  const openLetter = (p: PaymentRequest) => { setCurrent(p); setLetterOpen(true); };
  const openVoucher = (p: PaymentRequest) => { setCurrent(p); setVoucherOpen(true); };

  const saveMark = () => {
    if (current) {
      markPaid(current.id, { ...form, actualAmount: current.pendingAmount });
      setMarkOpen(false);
      setToast('已标记付款');
    }
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
          { key: 'pending', title: '待付金额', render: (r) => formatMoney(r.pendingAmount) },
          { key: 'actual', title: '实际支付金额', render: (r) => r.actualAmount ? formatMoney(r.actualAmount) : '-' },
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
              {r.status === '待付款' && <button type="button" className="agf-btn agf-btn--link" onClick={() => openMark(r)}>标记付款</button>}
              <button type="button" className="agf-btn agf-btn--link" onClick={() => openLetter(r)}>结算函</button>
              {r.status === '待付款' && <button type="button" className="agf-btn agf-btn--link" onClick={() => openVoucher(r)}>请款凭证</button>}
            </div>
          ) },
        ]}
      />
      <Drawer title="标记付款" open={markOpen} onClose={() => setMarkOpen(false)} large
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setMarkOpen(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={saveMark}>确认付款</button></>}>
        <ReadonlyField label="厂商ID" value={current?.vendorId ?? ''} />
        <ReadonlyField label="厂商名称" value={current ? getVendorName(current.vendorId) : ''} />
        <ReadonlyField label="待付金额" value={formatMoney(current?.pendingAmount ?? 0)} />
        <div className="agf-form-item"><label className="agf-form-label">付款银行</label><input className="agf-form-input" value={form.payBank} onChange={(e) => setForm({ ...form, payBank: e.target.value })} /></div>
        <div className="agf-form-item"><label className="agf-form-label">收款信息</label><input className="agf-form-input" value={form.receiptInfo} onChange={(e) => setForm({ ...form, receiptInfo: e.target.value })} /></div>
        <div className="agf-form-item"><label className="agf-form-label">结算函上传</label><div className="agf-upload">点击上传结算函（模拟）</div></div>
        <div className="agf-form-item"><label className="agf-form-label">电子发票</label><div className="agf-upload">点击上传电子发票（模拟）</div></div>
        <div className="agf-form-item"><label className="agf-form-label">备注</label><textarea className="agf-form-textarea" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></div>
      </Drawer>
      <Drawer title="请款凭证" open={voucherOpen} onClose={() => setVoucherOpen(false)}
        footer={<button type="button" className="agf-btn agf-btn--default" onClick={() => setVoucherOpen(false)}>关闭</button>}>
        <ReadonlyField label="厂商ID" value={current?.vendorId ?? ''} />
        <ReadonlyField label="厂商名称" value={current ? getVendorName(current.vendorId) : ''} />
        <div className="agf-form-item"><label className="agf-form-label">结算函（厂商盖章）</label><div className="agf-upload">点击上传结算函扫描件（模拟）</div></div>
        <div className="agf-form-item"><label className="agf-form-label">电子发票</label><div className="agf-upload">点击上传电子发票（模拟）</div></div>
      </Drawer>
      {current && <SettlementLetterDrawer open={letterOpen} onClose={() => setLetterOpen(false)} vendorId={current.vendorId} amount={current.pendingAmount} />}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
