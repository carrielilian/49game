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
import {
  isHistoricalDeductionWithinPaidPrepayment,
  isPaidPrepaymentMaintained,
} from '../utils/prepayment';
import { formatCurrencyMoney, formatMoney, formatOptionalCurrencyMoney, SETTLEMENT_CURRENCY } from '../utils/settlement';
import {
  getApplyGamePaymentBlock,
  getApplyGamePaymentBlockMessage,
} from '../utils/gamePaymentApply';
import { resolveContractCurrency } from '../utils/currencySnapshot';
import { DatePicker, getTodayDateValue } from '../components/DatePicker';
import { compareGameAddedDesc } from '../utils/listSort';

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
  'historicalDeduction' | 'sharePaymentCompany' | 'sharePaymentCurrency',
  string
>>;

export function GameIncomePage() {
  const {
    scopedGameBalances,
    scopedGames,
    contracts,
    applyGamePayment,
    updateGame,
    getGame,
    getVendor,
    getGameName,
    getVendorName,
  } = useAppStore();
  const [search, setSearch] = useState<ListSearchQuery>(EMPTY_LIST_SEARCH);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [prepayOpen, setPrepayOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [historicalAmount, setHistoricalAmount] = useState('');
  const [sharePaymentCompany, setSharePaymentCompany] = useState('');
  const [sharePaymentCurrency, setSharePaymentCurrency] = useState<ContractCurrency | ''>('');
  const [prepayErrors, setPrepayErrors] = useState<PaymentSettingsErrors>({});
  const [exchangeRateDate, setExchangeRateDate] = useState('');
  const [exchangeRateValue, setExchangeRateValue] = useState('');
  const [applyErrors, setApplyErrors] = useState<{ exchangeRateDate?: string; exchangeRate?: string }>({});
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const fmtSettlementAmount = (value: number) => formatCurrencyMoney(value, SETTLEMENT_CURRENCY);
  const fmtPrepayAmount = (value: number, currency?: ContractCurrency) =>
    formatOptionalCurrencyMoney(value, currency);

  const contractByGameId = useMemo(
    () => new Map(contracts.map((c) => [c.gameId, c])),
    [contracts],
  );
  const gameById = useMemo(
    () => new Map(scopedGames.map((game) => [game.id, game])),
    [scopedGames],
  );

  const rows = scopedGameBalances.map((b) => {
    const g = gameById.get(b.gameId);
    const contract = g ? contractByGameId.get(g.id) : undefined;
    const savedPrepayment = isPaidPrepaymentMaintained(contract) ? contract?.paidPrepayment : undefined;
    const prepaymentUnset = savedPrepayment == null || Number.isNaN(savedPrepayment);
    const prepayCurrency = resolveContractCurrency(contract);
    return {
      ...b,
      gameName: g ? getGameName(g.id) : b.gameId,
      vendorId: g?.vendorId ?? '',
      vendorName: g ? getVendorName(g.vendorId) : '',
      prepaymentUnset,
      savedPrepayment,
      prepayCurrency,
    };
  }).filter((r) => matchesListSearch(search, {
    gameId: r.gameId,
    gameName: r.gameName,
    vendorId: r.vendorId,
    vendorName: r.vendorName,
  })).sort((a, b) => compareGameAddedDesc(
    { id: a.gameId, createdAt: gameById.get(a.gameId)?.createdAt ?? '' },
    { id: b.gameId, createdAt: gameById.get(b.gameId)?.createdAt ?? '' },
  ));

  const selectedBalance = scopedGameBalances.find((b) => b.gameId === selectedGameId);
  const confirmAmount = selectedBalance?.balance ?? 0;
  const prepayGame = selectedGameId ? getGame(selectedGameId) : undefined;
  const prepayContract = prepayGame ? contractByGameId.get(prepayGame.id) : undefined;
  const prepayCurrency = resolveContractCurrency(prepayContract);

  const confirmAmountText = `申请付款金额：${formatMoney(confirmAmount)}元`;

  const openPrepayDrawer = (gameId: string) => {
    const game = getGame(gameId);
    setSelectedGameId(gameId);
    setHistoricalAmount(formatOptionalPrepayAmountInput(game?.historicalDeduction));
    setSharePaymentCompany(game?.sharePaymentCompany ?? '');
    setSharePaymentCurrency(game?.sharePaymentCurrency ?? '');
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
    const historicalError = validatePrepayAmount(historicalAmount, '历史已抵扣分成款');
    if (historicalError) nextErrors.historicalDeduction = historicalError;
    const historicalDeduction = historicalError ? undefined : parsePrepayAmount(historicalAmount);
    if (
      historicalDeduction != null
      && !isHistoricalDeductionWithinPaidPrepayment(historicalDeduction, prepayContract)
    ) {
      nextErrors.historicalDeduction = '历史已抵扣分成款不能大于已付预付分成款';
    }
    if (!sharePaymentCompany.trim()) nextErrors.sharePaymentCompany = '分成付款公司不能为空';
    if (!sharePaymentCurrency) nextErrors.sharePaymentCurrency = '付款币种不能为空';
    if (Object.keys(nextErrors).length) {
      setPrepayErrors(nextErrors);
      setToast({ message: '请完善所有信息', type: 'error' });
      return;
    }
    if (historicalDeduction != null) setHistoricalAmount(formatPrepayAmountInput(historicalDeduction));
    updateGame({
      ...prepayGame,
      historicalDeduction,
      sharePaymentCompany: sharePaymentCompany as SharePaymentCompany,
      sharePaymentCurrency,
    });
    setPrepayOpen(false);
    setToast({ message: '提交成功', type: 'success' });
  };

  const handleApply = (gameId: string) => {
    const game = getGame(gameId);
    const vendor = game ? getVendor(game.vendorId) : undefined;
    const contract = contractByGameId.get(gameId);
    const block = getApplyGamePaymentBlock(game, vendor, contract);
    if (block) {
      setToast({ message: getApplyGamePaymentBlockMessage(block), type: 'error' });
      return;
    }
    setSelectedGameId(gameId);
    setExchangeRateDate(getTodayDateValue());
    setExchangeRateValue('');
    setApplyErrors({});
    setConfirmOpen(true);
  };

  const confirmApply = () => {
    const nextErrors: { exchangeRateDate?: string; exchangeRate?: string } = {};
    if (!exchangeRateDate) nextErrors.exchangeRateDate = '汇率取值时间不能为空';
    const trimmedRate = exchangeRateValue.trim();
    if (!trimmedRate) {
      nextErrors.exchangeRate = '汇率不能为空';
    } else if (!/^\d+(\.\d{1,4})?$/.test(trimmedRate) || Number(trimmedRate) <= 0) {
      nextErrors.exchangeRate = '汇率仅允许输入正数，最多四位小数';
    }
    if (Object.keys(nextErrors).length) {
      setApplyErrors(nextErrors);
      setToast({ message: '请完善所有信息', type: 'error' });
      return;
    }
    const exchangeRate = Number(trimmedRate);
    setExchangeRateValue(exchangeRate.toFixed(4));
    const ok = applyGamePayment(selectedGameId, exchangeRateDate, exchangeRate);
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
          <ListSearchFields mode="gameAndVendor" value={search} onChange={setSearch} />
        </FilterBar>
      </div>
      <div data-annotation-id="game-income-table">
      <DataTable
        rowKey={(r) => r.gameId}
        data={rows}
        columns={[
          { key: 'game', title: '游戏ID / 游戏名称', render: (r) => <DualCell main={r.gameName} sub={r.gameId} /> },
          { key: 'vendor', title: '厂商ID / 厂商名称', render: (r) => <DualCell main={r.vendorName} sub={r.vendorId} /> },
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
            <button type="button" className="agf-btn agf-btn--primary" onClick={savePrepay}>确定</button>
          </>
        )}
      >
        <div data-annotation-id="game-income-payment-form">
        {prepayGame && (
          <>
            <ReadonlyField label="游戏ID / 游戏名称" value={`${prepayGame.id} / ${prepayGame.onlineName}`} />
            <FormSectionTitle>预付分成信息</FormSectionTitle>
            <ReadonlyCurrencyField
              label="已付预付分成款"
              amount={prepayContract?.paidPrepayment}
              currency={prepayCurrency}
              unset={isPrepaymentUnset(prepayContract?.paidPrepayment)}
            />
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
                <FieldHint>请填写线下已抵扣处理的预付分成款，若无则填写0；不能大于已付预付分成款</FieldHint>
                <FieldError message={prepayErrors.historicalDeduction} />
              </div>
            </div>
            <FormSectionTitle>付款信息</FormSectionTitle>
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
        overflowVisible
        footer={(
          <>
            <button type="button" className="agf-btn agf-btn--default" onClick={() => setConfirmOpen(false)}>取消</button>
            <button type="button" className="agf-btn agf-btn--primary" onClick={confirmApply}>确认申请</button>
          </>
        )}
      >
        <div className="agf-confirm-text" data-annotation-id="game-income-apply-modal">
          <p>{confirmAmountText}</p>
          <div className="agf-apply-form">
            <div className="agf-form-item">
              <label className="agf-form-label agf-form-label--required">汇率取值时间：</label>
              <div className="agf-form-field">
                <DatePicker
                  value={exchangeRateDate}
                  onChange={(value) => {
                    setExchangeRateDate(value);
                    setApplyErrors((prev) => ({ ...prev, exchangeRateDate: undefined }));
                  }}
                />
                <FieldError message={applyErrors.exchangeRateDate} />
              </div>
            </div>
            <div className="agf-form-item">
              <label className="agf-form-label agf-form-label--required">汇率：</label>
              <div className="agf-form-field">
                <input
                  inputMode="decimal"
                  className="agf-form-input"
                  placeholder="请输入小数，最多四位小数"
                  value={exchangeRateValue}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === '' || /^\d*(\.\d{0,4})?$/.test(next)) {
                      setExchangeRateValue(next);
                      setApplyErrors((prev) => ({ ...prev, exchangeRate: undefined }));
                    }
                  }}
                  onBlur={() => {
                    if (/^\d+(\.\d{1,4})?$/.test(exchangeRateValue) && Number(exchangeRateValue) > 0) {
                      setExchangeRateValue(Number(exchangeRateValue).toFixed(4));
                    }
                  }}
                />
                <FieldError message={applyErrors.exchangeRate} />
              </div>
            </div>
          </div>
        </div>
      </Modal>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
