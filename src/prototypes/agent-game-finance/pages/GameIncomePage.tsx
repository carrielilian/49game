import React, { useMemo, useState } from 'react';
import { DataTable, DualCell } from '../components/DataTable';
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
  sumGamePaidActualAmount,
} from '../utils/prepayment';
import { formatCurrencyMoney, formatMoney, SETTLEMENT_CURRENCY } from '../utils/settlement';
import {
  getApplyGamePaymentBlock,
  getApplyGamePaymentBlockMessage,
} from '../utils/gamePaymentApply';

function formatPrepayAmountInput(value: number): string {
  return value.toFixed(2);
}

function parsePrepayAmount(value: string): number {
  return Math.round(parseFloat(value.trim()) * 100) / 100;
}

function validatePrepayAmount(value: string, label: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${label}不能为空`;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return `${label}精确至小数点后两位`;
  const n = parseFloat(trimmed);
  if (Number.isNaN(n) || n < 0) return `${label}不能小于0`;
  return undefined;
}

export function GameIncomePage() {
  const {
    businessType,
    scopedGameBalances,
    scopedGames,
    scopedGamePayments,
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
  const [prepayErrors, setPrepayErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const fmtSettlementAmount = (value: number) => formatCurrencyMoney(value, SETTLEMENT_CURRENCY);

  const rows = scopedGameBalances.map((b) => {
    const g = scopedGames.find((x) => x.id === b.gameId);
    const prepaymentUnset = g?.prepayment == null || Number.isNaN(g.prepayment);
    return {
      ...b,
      gameName: g ? getGameName(g.id) : b.gameId,
      vendorId: g?.vendorId ?? '',
      vendorName: g ? getVendorName(g.vendorId) : '',
      prepaymentUnset,
      savedPrepayment: g?.prepayment,
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
    setPrepayAmount(
      game?.prepayment != null && !Number.isNaN(game.prepayment)
        ? formatPrepayAmountInput(game.prepayment)
        : '',
    );
    setHistoricalAmount(formatPrepayAmountInput(game?.historicalDeduction ?? 0));
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
    const nextErrors: Record<string, string> = {};
    const prepaymentError = validatePrepayAmount(prepayAmount, '预付分成款');
    const historicalError = validatePrepayAmount(historicalAmount, '历史已抵扣分成款');
    if (prepaymentError) nextErrors.prepayment = prepaymentError;
    if (historicalError) nextErrors.historicalDeduction = historicalError;
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
    });
    setPrepayOpen(false);
    setToast({ message: '保存成功', type: 'success' });
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
      <FilterBar>
        <ListSearchFields mode="gameAndVendor" value={search} onChange={setSearch} hideVendorId />
      </FilterBar>
      <DataTable
        rowKey={(r) => r.gameId}
        data={rows}
        columns={[
          { key: 'game', title: '游戏ID / 游戏名称', render: (r) => <DualCell main={r.gameName} sub={r.gameId} /> },
          { key: 'vendorName', title: '厂商名称', render: (r) => r.vendorName },
          { key: 'accountTotal', title: '账户总收入', render: (r) => fmtSettlementAmount(r.accountTotalIncome) },
          { key: 'balance', title: '账户余额', render: (r) => fmtSettlementAmount(r.balance) },
          {
            key: 'prepay',
            title: '预付分成款',
            render: (r) => (
              r.prepaymentUnset
                ? '-'
                : fmtSettlementAmount(r.savedPrepayment ?? 0)
            ),
          },
          { key: 'deducted', title: '已抵扣分成款', render: (r) => fmtSettlementAmount(r.deductedPrepayment) },
          { key: 'remaining', title: '剩余未抵扣分成款', render: (r) => fmtSettlementAmount(r.remainingPrepayment) },
          { key: 'income', title: '累计收入', render: (r) => fmtSettlementAmount(r.totalIncome) },
          { key: 'refund', title: '累计退款', render: (r) => fmtSettlementAmount(r.totalRefund) },
          {
            key: 'ops',
            title: '操作',
            render: (r) => (
              <div>
                <button type="button" className="agf-btn agf-btn--link" onClick={() => openPrepayDrawer(r.gameId)}>
                  预付分成管理
                </button>
                {r.balance > 0 && (
                  <button type="button" className="agf-btn agf-btn--link" onClick={() => handleApply(r.gameId)}>
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
        {prepayGame && (
          <>
            <ReadonlyField label="游戏ID" value={prepayGame.id} />
            <ReadonlyField label="游戏名称" value={prepayGame.onlineName} />
            <div className="agf-form-item">
              <label className="agf-form-label agf-form-label--required">预付分成款</label>
              <div className="agf-form-field">
                <input
                  className="agf-form-input"
                  value={prepayAmount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) {
                      setPrepayAmount(v);
                      clearPrepayError('prepayment');
                    }
                  }}
                  onBlur={() => normalizePrepayAmount(prepayAmount, setPrepayAmount, 'prepayment', '预付分成款')}
                />
                <FieldError message={prepayErrors.prepayment} />
              </div>
            </div>
            <div className="agf-form-item">
              <label className="agf-form-label agf-form-label--required">历史已抵扣分成款</label>
              <div className="agf-form-field">
                <input
                  className="agf-form-input"
                  value={historicalAmount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) {
                      setHistoricalAmount(v);
                      clearPrepayError('historicalDeduction');
                    }
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
