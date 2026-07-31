import type { Contract, Game, Vendor } from '../data/types';
import { isGamePrepaymentMissing } from './prepayment';

const BANK_FIELDS: (keyof Vendor)[] = ['accountName', 'bank', 'bankLocation', 'branch', 'cardNumber'];

function isVendorBankInfoComplete(vendor?: Vendor): boolean {
  if (!vendor) return false;
  return BANK_FIELDS.every((key) => String(vendor[key] ?? '').trim());
}

export type ApplyGamePaymentBlock =
  | { type: 'bank' }
  | { type: 'paymentSettings' }
  | { type: 'prepayment' };

export function getApplyGamePaymentBlock(
  game: Game | undefined,
  vendor: Vendor | undefined,
  contract: Contract | undefined,
): ApplyGamePaymentBlock | null {
  if (!isVendorBankInfoComplete(vendor)) return { type: 'bank' };
  if (game?.hasPrepayment == null || !game.sharePaymentCurrency) {
    return { type: 'paymentSettings' };
  }
  if (isGamePrepaymentMissing(game, contract)) {
    return { type: 'prepayment' };
  }
  return null;
}

export function getApplyGamePaymentBlockMessage(block: ApplyGamePaymentBlock): string {
  switch (block.type) {
    case 'bank':
      return '未填写银行信息';
    case 'paymentSettings':
      return '请先配置【付款设置】，完善预付分成信息和付款币种信息';
    case 'prepayment':
      return '未补充预付分成款信息';
  }
}
