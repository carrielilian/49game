import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Drawer, Toast, type ToastType } from './Modal';
import { useAppStore } from '../data/store';
import { displaySettlementFormula, formatMoney, currencySymbol } from '../utils/settlement';
import { buildLetterIncomeRows, buildLetterRefundRows, calcGameLetterPrepaymentDeduction, resolveLetterShowExchangeRate } from '../utils/settlementLetter';
import { formatExchangeRate, getExchangeRateByApplyTime } from '../utils/exchangeRate';
import { calcGamePrepaymentSummary } from '../utils/prepayment';
import { resolveGameMarkPaymentDefaults, resolveLetterPayAmount } from '../utils/gamePaymentMarkDefaults';
import { resolveMarkPaymentContractCurrency } from '../utils/currencySnapshot';
import { downloadMockPdf } from '../utils/mockPdf';
import type { ContractCurrency, SettlementLetterSnapshot } from '../data/types';
import { resolveSettlementPayerProfile } from '../utils/settlementPayerProfile';

interface SettlementLetterDrawerProps {
  open: boolean;
  onClose: () => void;
  vendorId: string;
  amount: number;
  settlementIds?: string[];
  gameId: string;
  /** 付款记录申请时间：结算函汇率与【标记付款】同源（取申请月上月末汇率） */
  applyTime?: string;
  /** 申请付款时冻结的汇率取值时间；兼容旧结算函快照 */
  exchangeRateDate?: string;
  /** 已付款记录的快照；有则不再实时计算 */
  letterSnapshot?: SettlementLetterSnapshot;
  /** 付款记录 id：已付款打开结算函时排除本笔，使 remaining 为付款前余额 */
  paymentId?: string;
  /** 申请付款快照中的 remaining；汇率行显示条件用 */
  applyRemainingPrepayment?: number;
  /** 申请付款时冻结的分成付款公司 */
  paymentCompany?: string;
  /** 申请付款时冻结的游戏中文名称 */
  gameName?: string;
  /** 申请付款时冻结的游戏英文名称 */
  gameEnglishName?: string;
  /** 批注锚点 id */
  contentAnnotationId?: string;
}

interface IncomeRow {
  id: string;
  productName: string;
  period: string;
  revenue: number;
  formula: string;
  settlementAmount: number;
}

interface RefundRow {
  id: string;
  productName: string;
  period: string;
  refundAmount: number;
  formula: string;
  settlementRefund: number;
}

function formatLetterFormula(formulaText?: string, marker: '①' | '③' = '①'): string {
  const expr = displaySettlementFormula(formulaText);
  if (expr === '-') return '-';
  return expr.replace('待结算金额', marker);
}

function formatCurrency(value: number): string {
  return `${currencySymbol('人民币')} ${formatMoney(value)}`;
}

function formatLetterPayAmount(currency: ContractCurrency, value: number): string {
  if (currency === '美金') return `$ ${formatMoney(value)}`;
  return formatCurrency(value);
}

type LetterLang = 'zh' | 'en';

function formatExchangeRateDisplay(value: number): string {
  return formatExchangeRate(value);
}

function formatExchangeRateDateDisplay(value?: string, lang: LetterLang = 'zh'): string {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value?.trim() ?? '';
  const [, year, month, day] = match;
  return lang === 'zh' ? `${year}年${month}月${day}日` : `${year}-${month}-${day}`;
}

function formatExchangeRateLabel(value?: string): string {
  const dateText = formatExchangeRateDateDisplay(value);
  return dateText ? `汇率（汇率取值时间${dateText}）：` : '汇率：';
}

function buildLetterPdfLines(
  lang: LetterLang,
  vendorName: string,
  platformName: string,
  gameName: string,
  gameEnglishName: string,
  incomeTotal: number,
  refundTotal: number,
  netTotal: number,
  payAmount: number,
  showPrepayment: boolean,
  prepaidDeduction: number,
  exchangeRateDate: string,
  exchangeRate: number,
  showExchangeRate: boolean,
  remainingUndeducted: number,
  sharePaymentCurrency: ContractCurrency,
  contractPaymentCurrency: ContractCurrency,
): string[] {
  const fmtDeduction = (v: number) => formatLetterPayAmount(contractPaymentCurrency, v);
  if (lang === 'en') {
    const englishLetterGameName = gameEnglishName.trim() || gameName;
    return [
      'Settlement Confirmation Letter (Mock)',
      `Vendor: ${vendorName}`,
      `Platform: ${platformName}`,
      `Game: ${englishLetterGameName}`,
      `Total Income (2): ${formatMoney(incomeTotal)}`,
      `Total Refund (4): ${formatMoney(refundTotal)}`,
      `Subtotal (2)-(4): ${formatMoney(netTotal)}`,
      ...(showExchangeRate ? [
        `Exchange Rate${exchangeRateDate ? ` (Selected on ${formatExchangeRateDateDisplay(exchangeRateDate, 'en')})` : ''}: ${formatExchangeRateDisplay(exchangeRate)}`,
      ] : []),
      ...(showPrepayment ? [
        `Settlement/Deduction Amount: ${fmtDeduction(prepaidDeduction)}`,
        `Remaining Prepaid: ${fmtDeduction(remainingUndeducted)}`,
      ] : []),
      `Actual Pay Amount: ${formatLetterPayAmount(sharePaymentCurrency, payAmount)}`,
    ];
  }
  return [
    '合作分成结算确认函（原型模拟）',
    `收款方：${vendorName}`,
    `付款方：${platformName}`,
    `合计②：${formatMoney(incomeTotal)} 元`,
    `合计④：${formatMoney(refundTotal)} 元`,
    `总计②-④：${formatMoney(netTotal)} 元`,
    ...(showExchangeRate ? [`${formatExchangeRateLabel(exchangeRateDate)}${formatExchangeRateDisplay(exchangeRate)}`] : []),
    ...(showPrepayment ? [
      `结算/抵扣金额：${fmtDeduction(prepaidDeduction)}`,
      `剩余未抵扣预付分成款：${fmtDeduction(remainingUndeducted)}`,
    ] : []),
    `实际付款金额：${formatLetterPayAmount(sharePaymentCurrency, payAmount)}`,
  ];
}

function downloadLetterPdf(
  vendorName: string,
  vendorId: string,
  lang: LetterLang,
  lines: string[],
) {
  const suffix = lang === 'zh' ? '' : '_EN';
  downloadMockPdf(`结算函${suffix}_${vendorName || vendorId}.pdf`, lines);
}

export function SettlementLetterDrawer({
  open, onClose, vendorId, amount, settlementIds, gameId, applyTime, exchangeRateDate: frozenExchangeRateDate, letterSnapshot, paymentId, applyRemainingPrepayment, paymentCompany, gameName, gameEnglishName, contentAnnotationId,
}: SettlementLetterDrawerProps) {
  const { getVendor, getGame, getGameName, games, settlements, gamePayments, exchangeRates, contracts } = useAppStore();
  const vendor = getVendor(vendorId);
  const game = getGame(gameId);
  const contract = contracts.find((c) => c.gameId === gameId);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);
  const payerProfile = resolveSettlementPayerProfile(paymentCompany);

  useEffect(() => {
    if (!downloadOpen) return;
    const handler = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) setDownloadOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [downloadOpen]);

  useEffect(() => {
    if (!open) setDownloadOpen(false);
  }, [open]);

  const { incomeRows, refundRows } = useMemo(() => {
    if (letterSnapshot) {
      return { incomeRows: letterSnapshot.incomeRows, refundRows: letterSnapshot.refundRows };
    }
    const linked = settlementIds?.length
      ? settlements.filter((s) => settlementIds.includes(s.id) && s.settled)
      : [];

    if (linked.length > 0) {
      const incomeRecords = linked.filter((s) => s.type !== 'refund');
      const refundRecords = linked.filter((s) => s.type === 'refund');
      const fmtIncome = (text?: string) => formatLetterFormula(text, '①');
      const fmtRefund = (text?: string) => formatLetterFormula(text, '③');
      return {
        incomeRows: buildLetterIncomeRows(incomeRecords, getGameName, fmtIncome),
        refundRows: buildLetterRefundRows(refundRecords, getGameName, fmtRefund),
      };
    }

    const fallbackGame = games.find((g) => g.id === gameId);
    if (!fallbackGame) return { incomeRows: [], refundRows: [] };

    return {
      incomeRows: [{
        id: 'fallback',
        productName: `《${getGameName(fallbackGame.id)}》快爆付费`,
        period: '2025.06',
        revenue: amount,
        formula: '①* (1-5%-0%) *50%',
        settlementAmount: amount,
      }],
      refundRows: [],
    };
  }, [amount, gameId, games, getGameName, letterSnapshot, settlementIds, settlements, vendorId]);

  const incomeTotal = letterSnapshot?.incomeTotal ?? incomeRows.reduce((sum, row) => sum + row.settlementAmount, 0);
  const refundTotal = letterSnapshot?.refundTotal ?? refundRows.reduce((sum, row) => sum + row.settlementRefund, 0);
  const netTotal = letterSnapshot?.netTotal ?? Math.round((incomeTotal - refundTotal) * 100) / 100;
  const showRefundSection = refundRows.length > 0;

  const liveSharePaymentCurrency: ContractCurrency = game?.sharePaymentCurrency ?? '人民币';
  const sharePaymentCurrency = letterSnapshot?.paymentCurrency ?? liveSharePaymentCurrency;
  const liveContractPaymentCurrency = resolveMarkPaymentContractCurrency(game, contract);
  const contractPaymentCurrency = letterSnapshot?.contractPaymentCurrency ?? liveContractPaymentCurrency;

  const scopedGamePayments = useMemo(
    () => (paymentId ? gamePayments.filter((p) => p.id !== paymentId) : gamePayments),
    [gamePayments, paymentId],
  );
  const prepaymentSummary = calcGamePrepaymentSummary(game, contract, gameId, scopedGamePayments);
  const remainingPrepaymentForExchange = applyRemainingPrepayment ?? prepaymentSummary.remainingPrepayment;
  const showExchangeRate = letterSnapshot?.showExchangeRate ?? resolveLetterShowExchangeRate(
    liveSharePaymentCurrency,
    liveContractPaymentCurrency,
    remainingPrepaymentForExchange,
  );
  const liveExchangeRate = useMemo(
    () => (applyTime ? getExchangeRateByApplyTime(applyTime, exchangeRates) : undefined) ?? 7.21,
    [applyTime, exchangeRates],
  );
  const exchangeRate = letterSnapshot?.exchangeRate ?? liveExchangeRate;
  const exchangeRateDate = letterSnapshot?.exchangeRateDate
    ?? frozenExchangeRateDate
    ?? applyTime?.slice(0, 10)
    ?? '';

  const vendorRemainingPrepayment = prepaymentSummary.remainingPrepayment;
  const showPrepaymentDeductionRows = letterSnapshot?.showPrepaymentDeductionRows
    ?? (vendorRemainingPrepayment > 0);
  const liveDeduction = calcGameLetterPrepaymentDeduction(
    game,
    contract,
    gameId,
    gamePayments,
    incomeTotal,
    refundTotal,
    contractPaymentCurrency,
    exchangeRate,
    paymentId,
  );
  const prepaidDeduction = letterSnapshot?.prepaidDeduction ?? liveDeduction.deduction;
  const remainingUndeducted = letterSnapshot?.remainingUndeducted ?? liveDeduction.remainingUndeducted;
  const letterPayAmount = useMemo(() => {
    if (letterSnapshot) return letterSnapshot.letterPayAmount;
    const defaults = resolveGameMarkPaymentDefaults(
      amount,
      game,
      vendor,
      contract,
      prepaymentSummary.remainingPrepayment,
      exchangeRate,
    );
    return resolveLetterPayAmount(defaults, sharePaymentCurrency);
  }, [
    amount,
    contract,
    exchangeRate,
    game,
    gameId,
    letterSnapshot,
    sharePaymentCurrency,
    prepaymentSummary.remainingPrepayment,
    vendor,
  ]);

  const vendorName = vendor?.name ?? vendorId;
  const frozenGameName = gameName ?? game?.onlineName ?? gameId;
  const frozenGameEnglishName = gameEnglishName ?? game?.englishName ?? '';

  const downloadLines = (lang: LetterLang) => buildLetterPdfLines(
    lang,
    vendorName,
    payerProfile.legalName,
    frozenGameName,
    frozenGameEnglishName,
    incomeTotal,
    refundTotal,
    netTotal,
    letterPayAmount,
    showPrepaymentDeductionRows,
    prepaidDeduction,
    exchangeRateDate,
    exchangeRate,
    showExchangeRate,
    remainingUndeducted,
    sharePaymentCurrency,
    contractPaymentCurrency,
  );

  return (
    <Drawer title="结算函" open={open} onClose={onClose} width={1175}>
      <div className="agf-settlement-letter" data-annotation-id={contentAnnotationId}>
        <div className="agf-settlement-letter__headline">
          <h2 className="agf-settlement-letter__title">
            <span className="agf-settlement-letter__title-name">{vendor?.name ?? vendorId}</span>
            {' 与 '}
            <span className="agf-settlement-letter__title-name">{payerProfile.legalName}</span>
            {' 合作分成结算确认函'}
          </h2>
          <div className="agf-settlement-letter__download-wrap" ref={downloadRef}>
            <button
              type="button"
              className={`agf-btn agf-btn--primary agf-settlement-letter__download${downloadOpen ? ' agf-settlement-letter__download--open' : ''}`}
              onClick={() => setDownloadOpen((prev) => !prev)}
            >
              下载
              <ChevronDown size={14} className="agf-settlement-letter__download-icon" />
            </button>
            {downloadOpen && (
              <div className="agf-settlement-letter__download-menu">
                <button
                  type="button"
                  className="agf-settlement-letter__download-item"
                  onClick={() => {
                    downloadLetterPdf(vendorName, vendorId, 'zh', downloadLines('zh'));
                    setDownloadOpen(false);
                  }}
                >
                  中文
                </button>
                <button
                  type="button"
                  className="agf-settlement-letter__download-item"
                  onClick={() => {
                    if (!payerProfile.supportsEnglishDownload) {
                      setDownloadOpen(false);
                      setToast({
                        message: `${payerProfile.key}的分成付款公司不支持英文版结算函下载`,
                        type: 'error',
                      });
                      return;
                    }
                    downloadLetterPdf(vendorName, vendorId, 'en', downloadLines('en'));
                    setDownloadOpen(false);
                  }}
                >
                  英文
                </button>
              </div>
            )}
          </div>
        </div>

        <table className="agf-settlement-letter__sheet">
          <colgroup>
            <col style={{ width: '28%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>合作产品名称</th>
              <th>结算时间</th>
              <th>游戏产品收入①</th>
              <th>结算公式</th>
              <th>结算金额</th>
            </tr>
          </thead>
          <tbody>
            {incomeRows.map((row) => (
              <tr key={row.id}>
                <td>{row.productName}</td>
                <td>{row.period}</td>
                <td>{formatCurrency(row.revenue)}</td>
                <td>{row.formula}</td>
                <td>{formatCurrency(row.settlementAmount)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="agf-settlement-letter__subtotal-label">合计②：</td>
              <td className="agf-settlement-letter__subtotal-amount">{formatCurrency(incomeTotal)}</td>
            </tr>
          </tbody>
          {showRefundSection && (
            <>
              <thead>
                <tr>
                  <th>合作产品名称</th>
                  <th>退款时间</th>
                  <th>退款金额③</th>
                  <th>结算公式</th>
                  <th>结算退款</th>
                </tr>
              </thead>
              <tbody>
                {refundRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.productName}</td>
                    <td>{row.period}</td>
                    <td>{formatCurrency(row.refundAmount)}</td>
                    <td>{row.formula}</td>
                    <td>{formatCurrency(row.settlementRefund)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} className="agf-settlement-letter__subtotal-label">合计④：</td>
                  <td className="agf-settlement-letter__subtotal-amount">{formatCurrency(refundTotal)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="agf-settlement-letter__subtotal-label">总计②-④：</td>
                  <td className="agf-settlement-letter__subtotal-amount">{formatCurrency(netTotal)}</td>
                </tr>
              </tbody>
            </>
          )}
          <tbody>
            {showExchangeRate && (
              <tr>
                <td colSpan={4} className="agf-settlement-letter__subtotal-label">{formatExchangeRateLabel(exchangeRateDate)}</td>
                <td className="agf-settlement-letter__subtotal-amount">{formatExchangeRateDisplay(exchangeRate)}</td>
              </tr>
            )}
            {showPrepaymentDeductionRows && (
              <>
                <tr>
                  <td colSpan={4} className="agf-settlement-letter__subtotal-label">结算/抵扣金额：</td>
                  <td className="agf-settlement-letter__subtotal-amount">{formatLetterPayAmount(contractPaymentCurrency, prepaidDeduction)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="agf-settlement-letter__subtotal-label">剩余未抵扣预付分成款：</td>
                  <td className="agf-settlement-letter__subtotal-amount">{formatLetterPayAmount(contractPaymentCurrency, remainingUndeducted)}</td>
                </tr>
              </>
            )}
            <tr>
              <td colSpan={4} className="agf-settlement-letter__subtotal-label">实际付款金额：</td>
              <td className="agf-settlement-letter__subtotal-amount">{formatLetterPayAmount(sharePaymentCurrency, letterPayAmount)}</td>
            </tr>
            <tr>
              <th className="agf-settlement-letter__label-cell">付款方开票信息</th>
              <td colSpan={4} className="agf-settlement-letter__content-cell">
                {payerProfile.invoice.item && <p>开票项目：{payerProfile.invoice.item}</p>}
                <p>公司名称：{payerProfile.legalName}</p>
                <p>公司税号：{payerProfile.invoice.taxId}</p>
                <p>注册地址及电话：{payerProfile.invoice.addressPhone}</p>
                <p>开户行及账号：{payerProfile.invoice.bankAccount}</p>
              </td>
            </tr>
            <tr>
              <th className="agf-settlement-letter__label-cell">备注</th>
              <td colSpan={4} className="agf-settlement-letter__content-cell">如果结算确认函出现分页，请加盖骑缝章，谢谢！</td>
            </tr>
          </tbody>
        </table>

        <div className="agf-settlement-letter__signatures">
          <div className="agf-settlement-letter__sign-block">
            <p><span className="agf-settlement-letter__sign-label">收款方</span>{vendor?.name ?? vendorId}</p>
            <p><span className="agf-settlement-letter__sign-label">开户行名称</span>{vendor ? `${vendor.bank}${vendor.branch}` : '-'}</p>
            <p><span className="agf-settlement-letter__sign-label">银行账号</span>{vendor?.cardNumber?.replace(/\s+/g, '') ?? '-'}</p>
            <p><span className="agf-settlement-letter__sign-label">银行代码</span>{vendor?.bankCode ?? ''}</p>
            <p className="agf-settlement-letter__stamp"><span className="agf-settlement-letter__sign-label">盖章</span></p>
          </div>
          <div className="agf-settlement-letter__sign-block">
            <p><span className="agf-settlement-letter__sign-label">付款方</span>{payerProfile.legalName}</p>
            <p><span className="agf-settlement-letter__sign-label">收件人</span>{payerProfile.contact.recipient}</p>
            <p><span className="agf-settlement-letter__sign-label">联系电话</span>{payerProfile.contact.phone}</p>
            <p><span className="agf-settlement-letter__sign-label">{payerProfile.contact.addressLabel}</span>{payerProfile.contact.address}</p>
            <p className="agf-settlement-letter__stamp"><span className="agf-settlement-letter__sign-label">盖章</span></p>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </Drawer>
  );
}
