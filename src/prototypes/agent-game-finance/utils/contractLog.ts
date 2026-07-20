import type { Contract, CooperationContent } from '../data/types';
import { formatOptionalCurrencyMoney } from './settlement';

const PAID_FIELD_META: { key: keyof Pick<Contract, 'paidAgencyFee' | 'paidPrepayment' | 'paidDevelopmentFee'>; label: string; content: CooperationContent }[] = [
  { key: 'paidAgencyFee', label: '已付游戏代理金', content: '游戏代理金' },
  { key: 'paidPrepayment', label: '已付预付分成款', content: '预付分成款' },
  { key: 'paidDevelopmentFee', label: '已付委托开发费', content: '委托开发费' },
];

function formatLogMoney(c: Contract, value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  return formatOptionalCurrencyMoney(value, c.currency);
}

export function formatContractAmountDisplay(c: Contract): string {
  const val = c.contractAmount;
  if (val == null || Number.isNaN(val)) return '-';
  return val.toFixed(2);
}

export function formatPaidDisplay(c: Contract, key: typeof PAID_FIELD_META[number]['key'], content: CooperationContent): string {
  if (!c.cooperationContents.includes(content)) return '-';
  const val = c[key];
  if (val == null || Number.isNaN(val)) return '-';
  return val.toFixed(2);
}

function formatContractAmountForLog(c: Contract): string {
  return formatLogMoney(c, c.contractAmount);
}

function formatPaidForLog(
  c: Contract,
  key: typeof PAID_FIELD_META[number]['key'],
  content: CooperationContent,
): string {
  if (!c.cooperationContents.includes(content)) return '-';
  return formatLogMoney(c, c[key]);
}

export function getPaidAmount(c: Contract | undefined, key: typeof PAID_FIELD_META[number]['key'], content: CooperationContent): number {
  if (!c || !c.cooperationContents.includes(content)) return -1;
  const val = c[key];
  if (val == null || Number.isNaN(val)) return -1;
  return val;
}

/** 已付游戏代理金 + 已付预付分成款 + 已付委托开发费（与游戏管理合同一致） */
export function calcContractPaymentTotal(c: Contract | undefined): number {
  if (!c) return 0;
  let sum = 0;
  for (const { key, content } of PAID_FIELD_META) {
    if (!c.cooperationContents.includes(content)) continue;
    const val = c[key];
    if (val != null && !Number.isNaN(val)) sum += val;
  }
  return sum;
}

export function buildContractChangeDetail(oldC: Contract, newC: Contract): string | undefined {
  const lines: string[] = [];
  if (formatContractAmountDisplay(oldC) !== formatContractAmountDisplay(newC)) {
    lines.push(`"合同金额"变更为"${formatContractAmountForLog(newC)}"`);
  }

  for (const { key, label, content } of PAID_FIELD_META) {
    if (formatPaidDisplay(oldC, key, content) !== formatPaidDisplay(newC, key, content)) {
      lines.push(`"${label}"变更为"${formatPaidForLog(newC, key, content)}"`);
    }
  }
  return lines.length ? lines.join('\n') : undefined;
}

export function emptyContract(gameId: string): Contract {
  return {
    gameId,
    contractNumber: '',
    cooperationContents: [],
    supplementalNote: '',
    cooperationStatus: '合作中',
  };
}
