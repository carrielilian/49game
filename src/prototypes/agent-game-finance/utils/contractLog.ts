import type { Contract, CooperationContent } from '../data/types';

const PAID_FIELD_META: { key: keyof Pick<Contract, 'paidAgencyFee' | 'paidPrepayment' | 'paidDevelopmentFee'>; label: string; content: CooperationContent }[] = [
  { key: 'paidAgencyFee', label: '已付游戏代理金', content: '游戏代理金' },
  { key: 'paidPrepayment', label: '已付预付分成款', content: '预付分成款' },
  { key: 'paidDevelopmentFee', label: '已付委托开发费', content: '委托开发费' },
];

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
  const oldAmount = formatContractAmountDisplay(oldC);
  const newAmount = formatContractAmountDisplay(newC);
  if (oldAmount !== newAmount) lines.push(`"合同金额"变更为"${newAmount}"`);

  for (const { key, label, content } of PAID_FIELD_META) {
    const oldV = formatPaidDisplay(oldC, key, content);
    const newV = formatPaidDisplay(newC, key, content);
    if (oldV !== newV) lines.push(`"${label}"变更为"${newV}"`);
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
