import React, { useMemo, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { FieldError, FieldHint, ReadonlyField } from '../components/FormFields';
import { Drawer, Modal, Toast, type ToastType } from '../components/Modal';
import { useAppStore } from '../data/store';
import { ListSearchFields } from '../components/ListSearchFields';
import { EMPTY_LIST_SEARCH, matchesListSearch, type ListSearchQuery } from '../utils/listKeyword';
import { getPreviousMonthKey } from '../utils/monthRange';
import {
  calcDeductedPrepayment,
  calcRemainingUndeductedPrepayment,
  sumVendorPaidActualAmount,
} from '../utils/prepayment';
import { formatMoney } from '../utils/settlement';
import {
  getApplyPaymentBlock,
  getApplyPaymentBlockMessage,
} from '../utils/vendorPaymentApply';

interface PrepayForm {
  prepayment: number;
  historicalDeduction: number;
}

function parseNonNegative(value: string): number {
  if (value.trim() === '') return NaN;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export function VendorIncomePage() {
  const {
    businessType,
    scopedBalances,
    scopedVendors,
    scopedPayments,
    applyPayment,
    updateVendor,
    getVendor,
    internalSettlementButtons,
  } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [prepayOpen, setPrepayOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [prepayForm, setPrepayForm] = useState<PrepayForm>({ prepayment: NaN, historicalDeduction: 0 });
  const [prepayErrors, setPrepayErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const rows = scopedBalances.map((b) => {
    const v = scopedVendors.find((x) => x.id === b.vendorId);
    return { ...b, vendorName: v?.name ?? b.vendorId };
  }).filter((r) => matchesListSearch(search, { vendorId: r.vendorId, vendorName: r.vendorName }));

  const selectedBalance = scopedBalances.find((b) => b.vendorId === selectedVendor);
  const confirmAmount = selectedBalance?.balance ?? 0;
  const prepayVendor = selectedVendor ? getVendor(selectedVendor) : undefined;

  const prepayPreview = useMemo(() => {
    const prepayment = Number.isNaN(prepayForm.prepayment) ? 0 : prepayForm.prepayment;
    const historical = Number.isNaN(prepayForm.historicalDeduction) ? 0 : prepayForm.historicalDeduction;
    const paidSum = selectedVendor ? sumVendorPaidActualAmount(selectedVendor, scopedPayments) : 0;
    const deducted = calcDeductedPrepayment(prepayment, paidSum, historical);
    const remaining = calcRemainingUndeductedPrepayment(prepayment, deducted);
    return { deducted, remaining };
  }, [prepayForm, scopedPayments, selectedVendor]);

  const confirmContent = useMemo(() => {
    const amountText = `申请付款金额：${formatMoney(confirmAmount)}元`;
    const internalChannelSettled =
      internalSettlementButtons[businessType].internal.settleCompleted
      && internalSettlementButtons[businessType].refund.settleCompleted;
    if (internalChannelSettled) return { warning: null as string | null, amount: amountText };
    return {
      warning: `${getPreviousMonthKey()}内部渠道还未结算，是否继续申请付款？`,
      amount: amountText,
    };
  }, [confirmAmount, businessType, internalSettlementButtons]);

  const openPrepayDrawer = (vendorId: string) => {
    const vendor = getVendor(vendorId);
    setSelectedVendor(vendorId);
    setPrepayForm({
      prepayment: vendor?.prepayment != null && !Number.isNaN(vendor.prepayment) ? vendor.prepayment : NaN,
      historicalDeduction: vendor?.historicalDeduction ?? 0,
    });
    setPrepayErrors({});
    setPrepayOpen(true);
  };

  const clearPrepayError = (key: string) => {
    setPrepayErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const savePrepay = () => {
    if (!prepayVendor) return;
    const nextErrors: Record<string, string> = {};
    if (Number.isNaN(prepayForm.prepayment)) {
      nextErrors.prepayment = '预付分成款不能为空';
    } else if (prepayForm.prepayment < 0) {
      nextErrors.prepayment = '预付分成款不能小于0';
    }
    if (Number.isNaN(prepayForm.historicalDeduction)) {
      nextErrors.historicalDeduction = '历史已抵扣分成款不能为空';
    } else if (prepayForm.historicalDeduction < 0) {
      nextErrors.historicalDeduction = '历史已抵扣分成款不能小于0';
    }
    if (Object.keys(nextErrors).length) {
      setPrepayErrors(nextErrors);
      setToast({ message: '请完善所有信息', type: 'error' });
      return;
    }
    updateVendor({
      ...prepayVendor,
      prepayment: prepayForm.prepayment,
      historicalDeduction: prepayForm.historicalDeduction,
    });
    setPrepayOpen(false);
    setToast({ message: '保存成功', type: 'success' });
  };

  const handleApply = (vendorId: string) => {
    const vendor = scopedVendors.find((v) => v.id === vendorId);
    const block = getApplyPaymentBlock(vendorId, vendor, scopedPayments);
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
          { key: 'deducted', title: '已抵扣分成款', render: (r) => formatMoney(r.deductedPrepayment) },
          { key: 'remaining', title: '剩余未抵扣分成款', render: (r) => formatMoney(r.remainingPrepayment) },
          { key: 'income', title: '累计收入', render: (r) => formatMoney(r.totalIncome) },
          { key: 'refund', title: '累计退款', render: (r) => formatMoney(r.totalRefund) },
          {
            key: 'ops',
            title: '操作',
            render: (r) => (
              <div>
                <button type="button" className="agf-btn agf-btn--link" onClick={() => openPrepayDrawer(r.vendorId)}>
                  预付分成管理
                </button>
                {r.balance > 0 && (
                  <button type="button" className="agf-btn agf-btn--link" onClick={() => handleApply(r.vendorId)}>
                    申请付款
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />
      <Drawer
        title="预付分成管理"
        open={prepayOpen}
        onClose={() => setPrepayOpen(false)}
        large
        footer={(
          <>
            <button type="button" className="agf-btn agf-btn--default" onClick={() => setPrepayOpen(false)}>取消</button>
            <button type="button" className="agf-btn agf-btn--primary" onClick={savePrepay}>保存</button>
          </>
        )}
      >
        {prepayVendor && (
          <>
            <ReadonlyField label="厂商ID" value={prepayVendor.id} />
            <ReadonlyField label="厂商名称" value={prepayVendor.name} />
            <div className="agf-form-item">
              <label className="agf-form-label agf-form-label--required">预付分成款</label>
              <div className="agf-form-field">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="agf-form-input"
                  value={Number.isNaN(prepayForm.prepayment) ? '' : prepayForm.prepayment}
                  onChange={(e) => {
                    clearPrepayError('prepayment');
                    setPrepayForm({ ...prepayForm, prepayment: parseNonNegative(e.target.value) });
                  }}
                />
                <FieldError message={prepayErrors.prepayment} />
              </div>
            </div>
            <div className="agf-form-item">
              <label className="agf-form-label agf-form-label--required">历史已抵扣分成款</label>
              <div className="agf-form-field">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="agf-form-input"
                  value={Number.isNaN(prepayForm.historicalDeduction) ? '' : prepayForm.historicalDeduction}
                  onChange={(e) => {
                    clearPrepayError('historicalDeduction');
                    setPrepayForm({ ...prepayForm, historicalDeduction: parseNonNegative(e.target.value) });
                  }}
                />
                <FieldHint>填写线下手动已处理的预付分成款</FieldHint>
                <FieldError message={prepayErrors.historicalDeduction} />
              </div>
            </div>
            <ReadonlyField label="已抵扣分成款" value={formatMoney(prepayPreview.deducted)} />
            <ReadonlyField label="剩余未抵扣分成款" value={formatMoney(prepayPreview.remaining)} />
          </>
        )}
      </Drawer>
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
