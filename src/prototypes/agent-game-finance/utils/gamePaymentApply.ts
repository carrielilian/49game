import type { Game, GamePaymentRequest, Vendor } from '../data/types';
import { isUnpaidPayment } from './payment';
import { isGamePrepaymentMissing } from './prepayment';

const BANK_FIELDS: (keyof Vendor)[] = ['accountName', 'bank', 'bankLocation', 'branch', 'cardNumber'];

function isVendorBankInfoComplete(vendor?: Vendor): boolean {
  if (!vendor) return false;
  return BANK_FIELDS.every((key) => String(vendor[key] ?? '').trim());
}

export function hasUnpaidGamePaymentRecord(gameId: string, payments: GamePaymentRequest[]): boolean {
  return payments.some((p) => p.gameId === gameId && isUnpaidPayment(p.status));
}

export type ApplyGamePaymentBlock =
  | { type: 'bank' }
  | { type: 'prepayment'; gameName: string }
  | { type: 'unpaid' };

export function getApplyGamePaymentBlock(
  gameId: string,
  game: Game | undefined,
  vendor: Vendor | undefined,
  payments: GamePaymentRequest[],
): ApplyGamePaymentBlock | null {
  if (!isVendorBankInfoComplete(vendor)) return { type: 'bank' };
  if (isGamePrepaymentMissing(game)) {
    return { type: 'prepayment', gameName: game?.onlineName ?? gameId };
  }
  if (hasUnpaidGamePaymentRecord(gameId, payments)) return { type: 'unpaid' };
  return null;
}

export function getApplyGamePaymentBlockMessage(block: ApplyGamePaymentBlock): string {
  switch (block.type) {
    case 'bank':
      return '未填写银行信息';
    case 'prepayment':
      return `${block.gameName}未补充预付分成款信息`;
    case 'unpaid':
      return '存在一笔未付款的记录';
  }
}
