import React, { useState } from 'react';
import { DataTable } from '../components/DataTable';
import { ReadonlyField } from '../components/FormFields';
import { Drawer, Toast } from '../components/Modal';
import { FilterBar } from '../components/FilterBar';
import { useAppStore } from '../data/store';
import { formatMoney } from '../utils/settlement';

export function VendorIncomePage() {
  const { balances, vendors, applyPayment, getVendorName } = useAppStore();
  const [keyword, setKeyword] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [toast, setToast] = useState('');

  const rows = balances.map((b) => {
    const v = vendors.find((x) => x.id === b.vendorId);
    return { ...b, vendorName: v?.name ?? b.vendorId };
  }).filter((r) => !keyword || r.vendorName.includes(keyword) || r.vendorId.includes(keyword));

  const handleApply = (vendorId: string) => {
    setSelectedVendor(vendorId);
    setConfirmOpen(true);
  };

  const confirmApply = () => {
    const ok = applyPayment(selectedVendor);
    setConfirmOpen(false);
    setToast(ok ? '申请付款成功，账户余额已清零' : '账户余额不足，无法申请');
  };

  const selectedBalance = balances.find((b) => b.vendorId === selectedVendor);

  return (
    <div className="agf-card">
      <FilterBar>
        <input className="agf-input" placeholder="厂商ID / 厂商名称" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      </FilterBar>
      <DataTable
        rowKey={(r) => r.vendorId}
        data={rows}
        columns={[
          { key: 'vendorId', title: '厂商ID', render: (r) => r.vendorId },
          { key: 'vendorName', title: '厂商名称', render: (r) => r.vendorName },
          { key: 'accountTotal', title: '账户总收入', render: (r) => formatMoney(r.accountTotalIncome) },
          { key: 'balance', title: '账户余额', render: (r) => <span style={{ color: r.balance > 0 ? '#4A7CFF' : undefined, fontWeight: r.balance > 0 ? 500 : undefined }}>{formatMoney(r.balance)}</span> },
          { key: 'prepay', title: '预付分成款', render: (r) => formatMoney(r.prepayment) },
          { key: 'income', title: '累计收入', render: (r) => formatMoney(r.totalIncome) },
          { key: 'refund', title: '累计退款', render: (r) => formatMoney(r.totalRefund) },
          { key: 'ops', title: '操作', render: (r) => (
            <button type="button" className="agf-btn agf-btn--link" disabled={r.balance <= 0} onClick={() => handleApply(r.vendorId)}>申请付款</button>
          ) },
        ]}
      />
      <Drawer title="申请付款" open={confirmOpen} onClose={() => setConfirmOpen(false)}
        footer={<><button type="button" className="agf-btn agf-btn--default" onClick={() => setConfirmOpen(false)}>取消</button><button type="button" className="agf-btn agf-btn--primary" onClick={confirmApply}>确认申请</button></>}>
        <ReadonlyField label="厂商ID" value={selectedVendor} />
        <ReadonlyField label="厂商名称" value={getVendorName(selectedVendor)} />
        <ReadonlyField label="账户余额（待付金额）" value={formatMoney(selectedBalance?.balance ?? 0)} />
        <p style={{ marginTop: 12, color: '#666', fontSize: 13 }}>确认后将账户余额清零，并进入付款管理列表。</p>
      </Drawer>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
