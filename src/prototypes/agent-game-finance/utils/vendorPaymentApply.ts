import type { Contract, Game, PaymentRequest, Vendor } from '../data/types';

const BANK_FIELDS: (keyof Vendor)[] = ['accountName', 'bank', 'bankLocation', 'branch', 'cardNumber'];

export function isVendorBankInfoComplete(vendor?: Vendor): boolean {
  if (!vendor) return false;
  return BANK_FIELDS.every((k) => String(vendor[k] ?? '').trim());
}

/** 返回首个未填写预付分成款的游戏（prepayment ≤ 0 或合同缺失） */
export function getFirstMissingPrepaymentGame(
  vendorId: string,
  games: Game[],
  contracts: Contract[],
): Game | null {
  for (const g of games.filter((x) => x.vendorId === vendorId)) {
    const c = contracts.find((x) => x.gameId === g.id);
    if (!c || c.prepayment <= 0) return g;
  }
  return null;
}

export function hasUnpaidPaymentRecord(vendorId: string, payments: PaymentRequest[]): boolean {
  return payments.some((p) => p.vendorId === vendorId && p.status === '待付款');
}

export type ApplyPaymentBlock =
  | { type: 'bank' }
  | { type: 'prepayment'; gameName: string }
  | { type: 'unpaid' };

export function getApplyPaymentBlock(
  vendorId: string,
  vendor: Vendor | undefined,
  games: Game[],
  contracts: Contract[],
  payments: PaymentRequest[],
  getGameName: (gameId: string) => string,
): ApplyPaymentBlock | null {
  if (!isVendorBankInfoComplete(vendor)) return { type: 'bank' };
  const missingGame = getFirstMissingPrepaymentGame(vendorId, games, contracts);
  if (missingGame) {
    return { type: 'prepayment', gameName: getGameName(missingGame.id) };
  }
  if (hasUnpaidPaymentRecord(vendorId, payments)) return { type: 'unpaid' };
  return null;
}

export function getApplyPaymentBlockMessage(block: ApplyPaymentBlock): string {
  switch (block.type) {
    case 'bank':
      return '未填写银行信息';
    case 'prepayment':
      return `${block.gameName}未补充预付分成款信息`;
    case 'unpaid':
      return '存在一笔未付款的记录';
  }
}
