import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Drawer } from './Modal';
import { useAppStore } from '../data/store';
import { displaySettlementFormula, formatMoney } from '../utils/settlement';
import { buildLetterIncomeRows, buildLetterRefundRows, calcGameLetterPrepaymentDeduction, calcLetterPrepaymentDeduction } from '../utils/settlementLetter';
import { formatExchangeRate, getExchangeRateByApplyTime } from '../utils/exchangeRate';
import { calcGamePrepaymentSummary, calcVendorPrepaymentSummary } from '../utils/prepayment';
import { resolveGameMarkPaymentDefaults } from '../utils/gamePaymentMarkDefaults';
import { downloadMockPdf } from '../utils/mockPdf';
import type { ContractCurrency, SettlementLetterSnapshot } from '../data/types';

interface SettlementLetterDrawerProps {
  open: boolean;
  onClose: () => void;
  vendorId: string;
  amount: number;
  settlementIds?: string[];
  /** 游戏付款管理：按游戏维度计算预付抵扣 */
  gameId?: string;
  /** 付款记录申请时间：结算函汇率与【标记付款】同源（取申请月上月末汇率） */
  applyTime?: string;
  /** 已付款记录的快照；有则不再实时计算 */
  letterSnapshot?: SettlementLetterSnapshot;
  /** 批注锚点 id（游戏付款 / 厂商付款页传入不同值） */
  contentAnnotationId?: string;
}

const PLATFORM_NAME = '四三九九网络股份有限公司';
const PLATFORM_INVOICE = {
  item: '信息技术服务*信息服务费',
  company: PLATFORM_NAME,
  taxId: '9135020073786628XK',
  addressPhone: '厦门市厦门火炬高新区软件园二期望海路2号楼202室 0592-3304399',
  bankAccount: '中国建设银行股份有限公司厦门市分行营业部 35101535001059664399',
};
const PLATFORM_CONTACT = {
  recipient: '朱建婷（开放平台）',
  phone: '0592-3304399',
  address: '厦门市思明区软件园二期望海路2号楼',
};

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
  return `¥ ${formatMoney(value)}`;
}

function formatLetterPayAmount(currency: ContractCurrency, value: number): string {
  if (currency === '美金') return `$ ${formatMoney(value)}`;
  return formatCurrency(value);
}

function amountToChineseUpper(amount: number): string {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const intUnits = ['', '拾', '佰', '仟'];
  const sectionUnits = ['', '万', '亿'];

  const convertSection = (num: number): string => {
    if (num === 0) return '';
    let result = '';
    let zero = false;
    for (let i = 0; num > 0; i += 1) {
      const n = num % 10;
      if (n === 0) {
        zero = true;
      } else {
        if (zero) result = digits[0] + result;
        result = digits[n] + intUnits[i] + result;
        zero = false;
      }
      num = Math.floor(num / 10);
    }
    return result;
  };

  const convertInteger = (num: number): string => {
    if (num === 0) return digits[0];
    let result = '';
    let sectionIndex = 0;
    while (num > 0) {
      const section = num % 10000;
      if (section !== 0) {
        const sectionText = convertSection(section);
        result = sectionText + sectionUnits[sectionIndex] + result;
      } else if (result && !result.startsWith(digits[0])) {
        result = digits[0] + result;
      }
      num = Math.floor(num / 10000);
      sectionIndex += 1;
    }
    return result.replace(/零+/g, '零').replace(/零$/g, '');
  };

  const fixed = Math.round(amount * 100);
  const integerPart = Math.floor(fixed / 100);
  const decimalPart = fixed % 100;
  const jiao = Math.floor(decimalPart / 10);
  const fen = decimalPart % 10;

  let result = `${convertInteger(integerPart)}元`;
  if (jiao === 0 && fen === 0) {
    result += '整';
  } else {
    if (jiao > 0) result += `${digits[jiao]}角`;
    if (fen > 0) result += `${digits[fen]}分`;
    else if (jiao > 0) result += '整';
  }
  return result;
}

type LetterLang = 'zh' | 'en';

function formatExchangeRateDisplay(value: number): string {
  return formatExchangeRate(value);
}

function buildLetterPdfLines(
  lang: LetterLang,
  vendorName: string,
  platformName: string,
  incomeTotal: number,
  refundTotal: number,
  netTotal: number,
  payAmount: number,
  payAmountUpper: string,
  showPrepayment: boolean,
  prepaidDeduction: number,
  exchangeRate: number,
  showExchangeRate: boolean,
  remainingUndeducted: number,
): string[] {
  if (lang === 'en') {
    return [
      'Settlement Confirmation Letter (Mock)',
      `Vendor: ${vendorName}`,
      `Platform: ${platformName}`,
      `Total Income (2): ${formatMoney(incomeTotal)}`,
      `Total Refund (4): ${formatMoney(refundTotal)}`,
      `Subtotal (2)-(4): ${formatMoney(netTotal)}`,
      ...(showExchangeRate ? [`Exchange Rate: ${formatExchangeRateDisplay(exchangeRate)}`] : []),
      ...(showPrepayment ? [
        `Settlement/Deduction Amount: ${formatMoney(prepaidDeduction)}`,
        `Remaining Prepaid: ${formatMoney(remainingUndeducted)}`,
      ] : []),
      `Actual Pay Amount: ${formatMoney(payAmount)}`,
      `Amount in words: ${payAmountUpper}`,
    ];
  }
  return [
    '合作分成结算确认函（原型模拟）',
    `收款方：${vendorName}`,
    `付款方：${platformName}`,
    `合计②：${formatMoney(incomeTotal)} 元`,
    `合计④：${formatMoney(refundTotal)} 元`,
    `总计②-④：${formatMoney(netTotal)} 元`,
    ...(showExchangeRate ? [`汇率：${formatExchangeRateDisplay(exchangeRate)}`] : []),
    ...(showPrepayment ? [
      `结算/抵扣金额：${formatMoney(prepaidDeduction)} 元`,
      `剩余未抵扣预付分成款：${formatMoney(remainingUndeducted)} 元`,
    ] : []),
    `实际付款金额：${formatMoney(payAmount)} 元`,
    `支付金额（大写）：${payAmountUpper}`,
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
  open, onClose, vendorId, amount, settlementIds, gameId, applyTime, letterSnapshot, contentAnnotationId,
}: SettlementLetterDrawerProps) {
  const { getVendor, getGame, getGameName, games, settlements, payments, gamePayments, exchangeRates, contracts } = useAppStore();
  const vendor = getVendor(vendorId);
  const game = gameId ? getGame(gameId) : undefined;
  const contract = gameId ? contracts.find((c) => c.gameId === gameId) : undefined;
  const isGameLetter = Boolean(gameId);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);

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

    const fallbackGame = gameId ? games.find((g) => g.id === gameId) : games.find((g) => g.vendorId === vendorId);
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

  const livePaymentCurrency: ContractCurrency = game?.sharePaymentCurrency ?? vendor?.sharePaymentCurrency ?? '人民币';
  const paymentCurrency = letterSnapshot?.paymentCurrency ?? livePaymentCurrency;
  const showExchangeRate = letterSnapshot?.showExchangeRate ?? (livePaymentCurrency === '美金');
  const liveExchangeRate = useMemo(
    () => (applyTime ? getExchangeRateByApplyTime(applyTime, exchangeRates) : undefined) ?? 7.21,
    [applyTime, exchangeRates],
  );
  const exchangeRate = letterSnapshot?.exchangeRate ?? liveExchangeRate;

  const prepaymentSummary = isGameLetter && gameId
    ? calcGamePrepaymentSummary(game, gameId, gamePayments)
    : calcVendorPrepaymentSummary(vendor, vendorId, payments);
  const vendorRemainingPrepayment = prepaymentSummary.remainingPrepayment;
  const showPrepaymentDeductionRows = letterSnapshot?.showPrepaymentDeductionRows
    ?? (vendorRemainingPrepayment > 0);
  const liveDeduction = isGameLetter && gameId
    ? calcGameLetterPrepaymentDeduction(game, gameId, gamePayments, incomeTotal, refundTotal)
    : calcLetterPrepaymentDeduction(vendor, vendorId, payments, incomeTotal, refundTotal);
  const prepaidDeduction = letterSnapshot?.prepaidDeduction ?? liveDeduction.deduction;
  const remainingUndeducted = letterSnapshot?.remainingUndeducted ?? liveDeduction.remainingUndeducted;
  const formulaPayAmount = liveDeduction.payAmount;

  const letterPayAmount = useMemo(() => {
    if (letterSnapshot) return letterSnapshot.letterPayAmount;
    if (isGameLetter && gameId) {
      const defaults = resolveGameMarkPaymentDefaults(
        amount,
        game,
        vendor,
        contract,
        prepaymentSummary.remainingPrepayment,
        exchangeRate,
      );
      if (paymentCurrency === '美金') {
        return defaults.actualAmountUsd ?? 0;
      }
      return defaults.actualAmount;
    }
    return formulaPayAmount;
  }, [
    amount,
    exchangeRate,
    formulaPayAmount,
    game,
    gameId,
    isGameLetter,
    letterSnapshot,
    paymentCurrency,
    prepaymentSummary.remainingPrepayment,
    vendor,
  ]);

  const payAmountUpper = amountToChineseUpper(letterPayAmount);
  const vendorName = vendor?.name ?? vendorId;

  const downloadLines = (lang: LetterLang) => buildLetterPdfLines(
    lang,
    vendorName,
    PLATFORM_NAME,
    incomeTotal,
    refundTotal,
    netTotal,
    letterPayAmount,
    payAmountUpper,
    showPrepaymentDeductionRows,
    prepaidDeduction,
    exchangeRate,
    showExchangeRate,
    remainingUndeducted,
  );

  return (
    <Drawer title="结算函" open={open} onClose={onClose} width={1175}>
      <div className="agf-settlement-letter" data-annotation-id={contentAnnotationId}>
        <div className="agf-settlement-letter__headline">
          <h2 className="agf-settlement-letter__title">
            <span className="agf-settlement-letter__title-name">{vendor?.name ?? vendorId}</span>
            {' 与 '}
            <span className="agf-settlement-letter__title-name">{PLATFORM_NAME}</span>
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
                <td colSpan={4} className="agf-settlement-letter__subtotal-label">汇率：</td>
                <td className="agf-settlement-letter__subtotal-amount">{formatExchangeRateDisplay(exchangeRate)}</td>
              </tr>
            )}
            {showPrepaymentDeductionRows && (
              <>
                <tr>
                  <td colSpan={4} className="agf-settlement-letter__subtotal-label">结算/抵扣金额：</td>
                  <td className="agf-settlement-letter__subtotal-amount">{formatCurrency(prepaidDeduction)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="agf-settlement-letter__subtotal-label">剩余未抵扣预付分成款：</td>
                  <td className="agf-settlement-letter__subtotal-amount">{formatCurrency(remainingUndeducted)}</td>
                </tr>
              </>
            )}
            <tr>
              <td colSpan={4} className="agf-settlement-letter__subtotal-label">实际付款金额：</td>
              <td className="agf-settlement-letter__subtotal-amount">{formatLetterPayAmount(paymentCurrency, letterPayAmount)}</td>
            </tr>
            <tr>
              <th className="agf-settlement-letter__label-cell">支付金额（大写）</th>
              <td colSpan={4} className="agf-settlement-letter__content-cell">{payAmountUpper}</td>
            </tr>
            <tr>
              <th className="agf-settlement-letter__label-cell">
                付款方开票信息
                <br />
                （增值税专用发票）
              </th>
              <td colSpan={4} className="agf-settlement-letter__content-cell">
                <p>发票项目：{PLATFORM_INVOICE.item}</p>
                <p>公司名称：{PLATFORM_INVOICE.company}</p>
                <p>公司税号：{PLATFORM_INVOICE.taxId}</p>
                <p>注册地址及电话：{PLATFORM_INVOICE.addressPhone}</p>
                <p>开户行及账号：{PLATFORM_INVOICE.bankAccount}</p>
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
            <p><span className="agf-settlement-letter__sign-label">开发者账号</span>{vendor?.email?.split('@')[0] ?? vendorId}</p>
            <p><span className="agf-settlement-letter__sign-label">开户银行</span>{vendor?.bank}{vendor?.branch}</p>
            <p><span className="agf-settlement-letter__sign-label">银行账号</span>{vendor?.cardNumber?.replace(/\s+/g, '') ?? '-'}</p>
            <p className="agf-settlement-letter__stamp"><span className="agf-settlement-letter__sign-label">盖章</span></p>
          </div>
          <div className="agf-settlement-letter__sign-block">
            <p><span className="agf-settlement-letter__sign-label">付款方</span>{PLATFORM_NAME}</p>
            <p><span className="agf-settlement-letter__sign-label">收件人</span>{PLATFORM_CONTACT.recipient}</p>
            <p><span className="agf-settlement-letter__sign-label">联系电话</span>{PLATFORM_CONTACT.phone}</p>
            <p><span className="agf-settlement-letter__sign-label">通信地址</span>{PLATFORM_CONTACT.address}</p>
            <p className="agf-settlement-letter__stamp"><span className="agf-settlement-letter__sign-label">盖章</span></p>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
