import React, { useMemo, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { Modal, Toast, type ToastType } from '../components/Modal';
import { useAppStore } from '../data/store';
import { ListSearchFields } from '../components/ListSearchFields';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';
import { getPreviousMonthKey } from '../utils/monthRange';
import { formatMoney } from '../utils/settlement';
import {
  getApplyPaymentBlock,
  getApplyPaymentBlockMessage,
} from '../utils/vendorPaymentApply';

export function VendorIncomePage() {
  const {
    balances,
    vendors,
    games,
    contracts,
    payments,
    applyPayment,
    getGameName,
    internalSettlementButtons,
    externalSettlementButtons,
  } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const rows = balances.map((b) => {
    const v = vendors.find((x) => x.id === b.vendorId);
    return { ...b, vendorName: v?.name ?? b.vendorId };
  }).filter((r) => matchesListSearch(search, { vendorId: r.vendorId, vendorName: r.vendorName }));

  const selectedBalance = balances.find((b) => b.vendorId === selectedVendor);
  const confirmAmount = selectedBalance?.balance ?? 0;

  const confirmContent = useMemo(() => {
    const amountText = `申请付款金额：${formatMoney(confirmAmount)}元`;
    const incomeSettled =
      internalSettlementButtons.internal.settleCompleted
      && externalSettlementButtons.settleCompleted;
    if (incomeSettled) return { warning: null as string | null, amount: amountText };
    return {
      warning: `${getPreviousMonthKey()}内部渠道收入还未结算，是否继续申请付款？`,
      amount: amountText,
    };
  }, [
    confirmAmount,
    internalSettlementButtons.internal.settleCompleted,
    externalSettlementButtons.settleCompleted,
  ]);

  const handleApply = (vendorId: string) => {
    const vendor = vendors.find((v) => v.id === vendorId);
    const block = getApplyPaymentBlock(vendorId, vendor, games, contracts, payments, getGameName);
    if (block) {
      setToast({ message: getApplyPaymentBlockMessage(block), type: 'error' });
      return;
    }
    setSelectedVendor(vendorId);
    setConfirmOpen(true);
  };

  const confirmApply = () => {
    const ok = applyPayment(selectedVendor);
    setConfirmOpen(false);
    setToast({
      message: ok ? '申请付款成功，账户余额已清零' : '账户余额不足，无法申请',
      type: ok ? 'success' : 'error',
    });
  };

  return (
    <div className="agf-card">
      <FilterBar>
        <ListSearchFields mode="vendor" value={search} onChange={setSearch} />
      </FilterBar>
      <DataTable
        rowKey={(r) => r.vendorId}
        data={rows}
        columns={[
          { key: 'vendorId', title: '厂商ID', render: (r) => r.vendorId },
          { key: 'vendorName', title: '厂商名称', render: (r) => r.vendorName },
          { key: 'accountTotal', title: '账户总收入', render: (r) => formatMoney(r.accountTotalIncome) },
          { key: 'balance', title: '账户余额', render: (r) => formatMoney(r.balance) },
          { key: 'prepay', title: '预付分成款', render: (r) => formatMoney(r.prepayment) },
          { key: 'income', title: '累计收入', render: (r) => formatMoney(r.totalIncome) },
          { key: 'refund', title: '累计退款', render: (r) => formatMoney(r.totalRefund) },
          {
            key: 'ops',
            title: '操作',
            render: (r) => (
              r.balance > 0 ? (
                <button type="button" className="agf-btn agf-btn--link" onClick={() => handleApply(r.vendorId)}>
                  申请付款
                </button>
              ) : '-'
            ),
          },
        ]}
      />
      <Modal
        title="申请付款"
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        plain
        compact
        footer={(
          <>
            <button type="button" className="agf-btn agf-btn--default" onClick={() => setConfirmOpen(false)}>取消</button>
            <button type="button" className="agf-btn agf-btn--primary" onClick={confirmApply}>确认申请</button>
          </>
        )}
      >
        <div className="agf-confirm-text">
          {confirmContent.warning && <p>{confirmContent.warning}</p>}
          <p>{confirmContent.amount}</p>
        </div>
      </Modal>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
