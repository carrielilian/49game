import React, { useMemo, useState } from 'react';
import { COL_ALIGN_RIGHT, DataTable, DualCell } from '../components/DataTable';
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
  sumGamePaidActualAmount,
} from '../utils/prepayment';
import { formatCurrencyMoney, formatMoney, formatOptionalCurrencyMoney, SETTLEMENT_CURRENCY } from '../utils/settlement';
import {
  getApplyGamePaymentBlock,
  getApplyGamePaymentBlockMessage,
} from '../utils/gamePaymentApply';
import { resolvePrepaymentCurrency, withCurrencyOnFirstSave } from '../utils/currencySnapshot';

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

export function GameIncomePage() {
  const {
    businessType,
    scopedGameBalances,
    scopedGames,
    scopedGamePayments,
    contracts,
    applyGamePayment,
    updateGame,
    getGame,
    getVendor,
    getGameName,
    getVendorName,
    internalSettlementButtons,
  } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [prepayOpen, setPrepayOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [prepayAmount, setPrepayAmount] = useState('');
  const [historicalAmount, setHistoricalAmount] = useState('');
  const [sharePaymentCompany, setSharePaymentCompany] = useState('');
  const [sharePaymentCurrency, setSharePaymentCurrency] = useState<ContractCurrency | ''>('');
  const [sharePaymentAccount, setSharePaymentAccount] = useState('');
  const [prepayErrors, setPrepayErrors] = useState<PaymentSettingsErrors>({});
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const fmtSettlementAmount = (value: number) => formatCurrencyMoney(value, SETTLEMENT_CURRENCY);
  const fmtPrepayAmount = (value: number, currency?: ContractCurrency) =>
    formatOptionalCurrencyMoney(value, currency);

  const contractByGameId = useMemo(
    () => new Map(contracts.map((c) => [c.gameId, c])),
    [contracts],
  );

  const rows = scopedGameBalances.map((b) => {
    const g = scopedGames.find((x) => x.id === b.gameId);
    const prepaymentUnset = g?.prepayment == null || Number.isNaN(g.prepayment);
    const contract = g ? contractByGameId.get(g.id) : undefined;
    const prepayCurrency = resolvePrepaymentCurrency(g, contract);
    return {
      ...b,
      gameName: g ? getGameName(g.id) : b.gameId,
      vendorId: g?.vendorId ?? '',
      vendorName: g ? getVendorName(g.vendorId) : '',
      prepaymentUnset,
      savedPrepayment: g?.prepayment,
      prepayCurrency,
    };
  }).filter((r) => matchesListSearch(search, {
    gameId: r.gameId,
    gameName: r.gameName,
    vendorId: r.vendorId,
    vendorName: r.vendorName,
  }));

  const selectedBalance = scopedGameBalances.find((b) => b.gameId === selectedGameId);
  const confirmAmount = selectedBalance?.balance ?? 0;
  const prepayGame = selectedGameId ? getGame(selectedGameId) : undefined;
  const prepayContract = prepayGame ? contractByGameId.get(prepayGame.id) : undefined;
  const prepayCurrency = resolvePrepaymentCurrency(prepayGame, prepayContract);

  const prepaymentUnset = isPrepaymentUnset(prepayGame?.prepayment);

  const prepayPreview = useMemo(() => {
    const prepayment = prepayGame?.prepayment ?? 0;
    const historical = prepayGame?.historicalDeduction ?? 0;
    const paidSum = selectedGameId ? sumGamePaidActualAmount(selectedGameId, scopedGamePayments) : 0;
    const deducted = calcDeductedPrepayment(prepayment, paidSum, historical);
    const remaining = calcRemainingUndeductedPrepayment(prepayment, deducted);
    return { deducted, remaining };
  }, [prepayGame, scopedGamePayments, selectedGameId]);

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

  const openPrepayDrawer = (gameId: string) => {
    const game = getGame(gameId);
    setSelectedGameId(gameId);
    setPrepayAmount(formatOptionalPrepayAmountInput(game?.prepayment));
    setHistoricalAmount(formatOptionalPrepayAmountInput(game?.historicalDeduction));
    setSharePaymentCompany(game?.sharePaymentCompany ?? '');
    setSharePaymentCurrency(game?.sharePaymentCurrency ?? '人民币');
    setSharePaymentAccount(game?.sharePaymentAccount ?? '');
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
    if (!prepayGame) return;
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
    updateGame({
      ...prepayGame,
      prepayment,
      historicalDeduction,
      prepaymentCurrency: withCurrencyOnFirstSave(prepayGame.prepaymentCurrency, prepayContract?.currency),
      sharePaymentCompany: sharePaymentCompany as SharePaymentCompany,
      sharePaymentCurrency,
      sharePaymentAccount: sharePaymentAccount.trim(),
    });
    setPrepayOpen(false);
    setToast({ message: '提交成功', type: 'success' });
  };

  const handleApply = (gameId: string) => {
    const game = getGame(gameId);
    const vendor = game ? getVendor(game.vendorId) : undefined;
    const block = getApplyGamePaymentBlock(gameId, game, vendor, scopedGamePayments);
    if (block) {
      setToast({ message: getApplyGamePaymentBlockMessage(block), type: 'error' });
      return;
    }
    setSelectedGameId(gameId);
    setConfirmOpen(true);
  };

  const confirmApply = () => {
    const ok = applyGamePayment(selectedGameId);
    setConfirmOpen(false);
    setToast({
      message: ok ? '申请付款成功，账户余额已清零' : '账户余额不足，无法申请',
      type: ok ? 'success' : 'error',
    });
  };

  return (
    <div className="agf-card">
      <div data-annotation-id="game-income-query">
        <FilterBar>
          <ListSearchFields mode="gameAndVendor" value={search} onChange={setSearch} hideVendorId />
        </FilterBar>
      </div>
      <div data-annotation-id="game-income-table">
      <DataTable
        rowKey={(r) => r.gameId}
        data={rows}
        columns={[
          { key: 'game', title: '游戏ID / 游戏名称', render: (r) => <DualCell main={r.gameName} sub={r.gameId} /> },
          { key: 'vendorName', title: '厂商名称', render: (r) => r.vendorName },
          { ...COL_ALIGN_RIGHT, key: 'balance', title: '账户余额', render: (r) => fmtSettlementAmount(r.balance) },
          { ...COL_ALIGN_RIGHT, key: 'accountTotal', title: '账户总收入', render: (r) => fmtSettlementAmount(r.accountTotalIncome) },
          {
            ...COL_ALIGN_RIGHT,
            key: 'prepay',
            title: '预付分成款',
            render: (r) => (
              r.prepaymentUnset
                ? '-'
                : fmtPrepayAmount(r.savedPrepayment ?? 0, r.prepayCurrency)
            ),
          },
          { ...COL_ALIGN_RIGHT, key: 'deducted', title: '已抵扣分成款', render: (r) => (r.prepaymentUnset ? '-' : fmtPrepayAmount(r.deductedPrepayment, r.prepayCurrency)) },
          { ...COL_ALIGN_RIGHT, key: 'remaining', title: '剩余未抵扣分成款', render: (r) => (r.prepaymentUnset ? '-' : fmtPrepayAmount(r.remainingPrepayment, r.prepayCurrency)) },
          { ...COL_ALIGN_RIGHT, key: 'income', title: '累计收入', render: (r) => fmtSettlementAmount(r.totalIncome) },
          { ...COL_ALIGN_RIGHT, key: 'refund', title: '累计退款', render: (r) => fmtSettlementAmount(r.totalRefund) },
          {
            key: 'ops',
            title: '操作',
            render: (r) => (
              <div>
                <button type="button" className="agf-btn agf-btn--link" data-annotation-id="game-income-payment-settings" onClick={() => openPrepayDrawer(r.gameId)}>
                  付款设置
                </button>
                {r.balance > 0 && (
                  <button type="button" className="agf-btn agf-btn--link" data-annotation-id="game-income-apply-payment" onClick={() => handleApply(r.gameId)}>
                    申请付款
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />
      </div>
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
        <div data-annotation-id="game-income-payment-form">
        {prepayGame && (
          <>
            <ReadonlyField label="游戏ID / 游戏名称" value={`${prepayGame.id} / ${prepayGame.onlineName}`} />
            <FormSectionTitle>预付分成管理</FormSectionTitle>
            <div className="agf-form-item">
              <label className="agf-form-label agf-form-label--required">预付分成款</label>
              <div className="agf-form-field">
                <CurrencyInput
                  currency={prepayCurrency}
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
                  currency={prepayCurrency}
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
                <FieldHint>请填写线下已抵扣处理的预付分成款，若无则填写0</FieldHint>
                <FieldError message={prepayErrors.historicalDeduction} />
              </div>
            </div>
            <ReadonlyCurrencyField
              label="已抵扣分成款"
              amount={prepayPreview.deducted}
              currency={prepayCurrency}
              unset={prepaymentUnset}
            />
            <ReadonlyCurrencyField
              label="剩余未抵扣分成款"
              amount={prepayPreview.remaining}
              currency={prepayCurrency}
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
        </div>
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
        <div className="agf-confirm-text" data-annotation-id="game-income-apply-modal">
          {confirmContent.warning && <p>{confirmContent.warning}</p>}
          <p>{confirmContent.amount}</p>
        </div>
      </Modal>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
