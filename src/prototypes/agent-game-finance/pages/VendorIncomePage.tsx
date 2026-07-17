import React, { useMemo, useState } from 'react';
import { COL_ALIGN_RIGHT, DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { CurrencyInput, FieldError, FieldHint, FormSectionTitle, ReadonlyCurrencyField, ReadonlyField } from '../components/FormFields';
import type { ContractCurrency, SharePaymentCompany } from '../data/types';
import { SHARE_PAYMENT_COMPANY_OPTIONS } from '../utils/columnFilters';
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
import { formatCurrencyMoney, formatMoney, SETTLEMENT_CURRENCY } from '../utils/settlement';
import {
  getApplyPaymentBlock,
  getApplyPaymentBlockMessage,
} from '../utils/vendorPaymentApply';

function formatPrepayAmountInput(value: number): string {
  return value.toFixed(2);
}

function parsePrepayAmount(value: string): number {
  return Math.round(parseFloat(value.trim()) * 100) / 100;
}

function formatOptionalPrepayAmountInput(value?: number): string {
  if (value == null || Number.isNaN(value)) return '';
  return formatPrepayAmountInput(value);
}

function isPrepaymentUnset(prepayment?: number): boolean {
  return prepayment == null || Number.isNaN(prepayment);
}

function validatePrepayAmount(value: string, label: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${label}不能为空`;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return `${label}精确至小数点后两位`;
  const n = parseFloat(trimmed);
  if (Number.isNaN(n) || n < 0) return `${label}不能小于0`;
  return undefined;
}

const PAYMENT_CURRENCY_OPTIONS: ContractCurrency[] = ['人民币', '美金'];

type PaymentSettingsErrors = Partial<Record<
  'prepayment' | 'historicalDeduction' | 'sharePaymentCompany' | 'sharePaymentCurrency' | 'sharePaymentAccount',
  string
>>;

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
  const [prepayAmount, setPrepayAmount] = useState('');
  const [historicalAmount, setHistoricalAmount] = useState('');
  const [sharePaymentCompany, setSharePaymentCompany] = useState('');
  const [sharePaymentCurrency, setSharePaymentCurrency] = useState<ContractCurrency | ''>('');
  const [sharePaymentAccount, setSharePaymentAccount] = useState('');
  const [prepayErrors, setPrepayErrors] = useState<PaymentSettingsErrors>({});
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const fmtSettlementAmount = (value: number) => formatCurrencyMoney(value, SETTLEMENT_CURRENCY);

  const rows = scopedBalances.map((b) => {
    const v = scopedVendors.find((x) => x.id === b.vendorId);
    const prepaymentUnset = v?.prepayment == null || Number.isNaN(v.prepayment);
    return {
      ...b,
      vendorName: v?.name ?? b.vendorId,
      prepaymentUnset,
      savedPrepayment: v?.prepayment,
    };
  }).filter((r) => matchesListSearch(search, { vendorId: r.vendorId, vendorName: r.vendorName }));

  const selectedBalance = scopedBalances.find((b) => b.vendorId === selectedVendor);
  const confirmAmount = selectedBalance?.balance ?? 0;
  const prepayVendor = selectedVendor ? getVendor(selectedVendor) : undefined;

  const prepaymentUnset = isPrepaymentUnset(prepayVendor?.prepayment);

  // 公式中的「预付分成款」「历史已抵扣分成款」均取已保存值，不随未提交的表单输入变化
  const prepayPreview = useMemo(() => {
    const prepayment = prepayVendor?.prepayment ?? 0;
    const historical = prepayVendor?.historicalDeduction ?? 0;
    const paidSum = selectedVendor ? sumVendorPaidActualAmount(selectedVendor, scopedPayments) : 0;
    const deducted = calcDeductedPrepayment(prepayment, paidSum, historical);
    const remaining = calcRemainingUndeductedPrepayment(prepayment, deducted);
    return { deducted, remaining };
  }, [prepayVendor, scopedPayments, selectedVendor]);

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
    setPrepayAmount(formatOptionalPrepayAmountInput(vendor?.prepayment));
    setHistoricalAmount(formatOptionalPrepayAmountInput(vendor?.historicalDeduction));
    setSharePaymentCompany(vendor?.sharePaymentCompany ?? '');
    setSharePaymentCurrency(vendor?.sharePaymentCurrency ?? '人民币');
    setSharePaymentAccount(vendor?.sharePaymentAccount ?? '');
    setPrepayErrors({});
    setPrepayOpen(true);
  };

  const normalizePrepayAmount = (
    value: string,
    setValue: (v: string) => void,
    errorKey: string,
    label: string,
  ) => {
    const trimmed = value.trim();
    if (!trimmed || validatePrepayAmount(trimmed, label)) return;
    setValue(formatPrepayAmountInput(parseFloat(trimmed)));
    clearPrepayError(errorKey);
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
    const nextErrors: PaymentSettingsErrors = {};
    const prepaymentError = validatePrepayAmount(prepayAmount, '预付分成款');
    const historicalError = validatePrepayAmount(historicalAmount, '历史已抵扣分成款');
    if (prepaymentError) nextErrors.prepayment = prepaymentError;
    if (historicalError) nextErrors.historicalDeduction = historicalError;
    if (!sharePaymentCompany.trim()) nextErrors.sharePaymentCompany = '分成付款公司不能为空';
    if (!sharePaymentCurrency) nextErrors.sharePaymentCurrency = '付款币种不能为空';
    if (!sharePaymentAccount.trim()) nextErrors.sharePaymentAccount = '付款账号不能为空';
    if (Object.keys(nextErrors).length) {
      setPrepayErrors(nextErrors);
      setToast({ message: '请完善所有信息', type: 'error' });
      return;
    }
    const prepayment = parsePrepayAmount(prepayAmount);
    const historicalDeduction = parsePrepayAmount(historicalAmount);
    setPrepayAmount(formatPrepayAmountInput(prepayment));
    setHistoricalAmount(formatPrepayAmountInput(historicalDeduction));
    updateVendor({
      ...prepayVendor,
      prepayment,
      historicalDeduction,
      sharePaymentCompany: sharePaymentCompany as SharePaymentCompany,
      sharePaymentCurrency,
      sharePaymentAccount: sharePaymentAccount.trim(),
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
          { ...COL_ALIGN_RIGHT, key: 'accountTotal', title: '账户总收入', render: (r) => fmtSettlementAmount(r.accountTotalIncome) },
          { ...COL_ALIGN_RIGHT, key: 'balance', title: '账户余额', render: (r) => fmtSettlementAmount(r.balance) },
          {
            ...COL_ALIGN_RIGHT,
            key: 'prepay',
            title: '预付分成款',
            render: (r) => (
              r.prepaymentUnset
                ? '-'
                : fmtSettlementAmount(r.savedPrepayment ?? 0)
            ),
          },
          { ...COL_ALIGN_RIGHT, key: 'deducted', title: '已抵扣分成款', render: (r) => (r.prepaymentUnset ? '-' : fmtSettlementAmount(r.deductedPrepayment)) },
          { ...COL_ALIGN_RIGHT, key: 'remaining', title: '剩余未抵扣分成款', render: (r) => (r.prepaymentUnset ? '-' : fmtSettlementAmount(r.remainingPrepayment)) },
          { ...COL_ALIGN_RIGHT, key: 'income', title: '累计收入', render: (r) => fmtSettlementAmount(r.totalIncome) },
          { ...COL_ALIGN_RIGHT, key: 'refund', title: '累计退款', render: (r) => fmtSettlementAmount(r.totalRefund) },
          {
            key: 'ops',
            title: '操作',
            render: (r) => (
              <div>
                <button type="button" className="agf-btn agf-btn--link" onClick={() => openPrepayDrawer(r.vendorId)}>
                  付款设置
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
        title="付款设置"
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
            <FormSectionTitle>预付分成管理</FormSectionTitle>
            <div className="agf-form-item">
              <label className="agf-form-label agf-form-label--required">预付分成款</label>
              <div className="agf-form-field">
                <CurrencyInput
                  currency={prepayVendor.currency ?? '人民币'}
                  value={prepayAmount}
                  onChange={(v) => {
                    setPrepayAmount(v);
                    clearPrepayError('prepayment');
                  }}
                  onBlur={() => normalizePrepayAmount(prepayAmount, setPrepayAmount, 'prepayment', '预付分成款')}
                />
                <FieldError message={prepayErrors.prepayment} />
              </div>
            </div>
            <div className="agf-form-item">
              <label className="agf-form-label agf-form-label--required">历史已抵扣分成款</label>
              <div className="agf-form-field">
                <CurrencyInput
                  currency={prepayVendor.currency ?? '人民币'}
                  value={historicalAmount}
                  onChange={(v) => {
                    setHistoricalAmount(v);
                    clearPrepayError('historicalDeduction');
                  }}
                  onBlur={() => normalizePrepayAmount(
                    historicalAmount,
                    setHistoricalAmount,
                    'historicalDeduction',
                    '历史已抵扣分成款',
                  )}
                />
                <FieldHint>填写线下手动已处理的预付分成款</FieldHint>
                <FieldError message={prepayErrors.historicalDeduction} />
              </div>
            </div>
            <ReadonlyCurrencyField
              label="已抵扣分成款"
              amount={prepayPreview.deducted}
              currency={prepayVendor.currency ?? '人民币'}
              unset={prepaymentUnset}
            />
            <ReadonlyCurrencyField
              label="剩余未抵扣分成款"
              amount={prepayPreview.remaining}
              currency={prepayVendor.currency ?? '人民币'}
              unset={prepaymentUnset}
            />
            <FormSectionTitle>付费设置</FormSectionTitle>
            <div className="agf-form-item">
              <label className="agf-form-label agf-form-label--required">分成付款公司</label>
              <div className="agf-form-field">
                <select
                  className="agf-form-input"
                  value={sharePaymentCompany}
                  onChange={(e) => {
                    setSharePaymentCompany(e.target.value);
                    clearPrepayError('sharePaymentCompany');
                  }}
                >
                  <option value="">请选择</option>
                  {SHARE_PAYMENT_COMPANY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <FieldError message={prepayErrors.sharePaymentCompany} />
              </div>
            </div>
            <div className="agf-form-item">
              <label className="agf-form-label agf-form-label--required">付款币种</label>
              <div className="agf-radio-group">
                {PAYMENT_CURRENCY_OPTIONS.map((currency) => (
                  <label key={currency} className="agf-radio-item">
                    <input
                      type="radio"
                      name="sharePaymentCurrency"
                      checked={sharePaymentCurrency === currency}
                      onChange={() => {
                        setSharePaymentCurrency(currency);
                        clearPrepayError('sharePaymentCurrency');
                      }}
                    />
                    {currency}
                  </label>
                ))}
              </div>
              <FieldError message={prepayErrors.sharePaymentCurrency} />
            </div>
            <div className="agf-form-item">
              <label className="agf-form-label agf-form-label--required">付款账号</label>
              <div className="agf-form-field">
                <input
                  className="agf-form-input"
                  value={sharePaymentAccount}
                  onChange={(e) => {
                    setSharePaymentAccount(e.target.value);
                    clearPrepayError('sharePaymentAccount');
                  }}
                />
                <FieldError message={prepayErrors.sharePaymentAccount} />
              </div>
            </div>
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
