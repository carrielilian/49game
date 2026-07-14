import type { PaymentRequest, Vendor } from '../data/types';
import { isUnpaidPayment } from './payment';
import { isVendorPrepaymentMissing } from './prepayment';

const BANK_FIELDS: (keyof Vendor)[] = ['accountName', 'bank', 'bankLocation', 'branch', 'cardNumber'];

export function isVendorBankInfoComplete(vendor?: Vendor): boolean {
  if (!vendor) return false;
  return BANK_FIELDS.every((k) => String(vendor[k] ?? '').trim());
}

export function hasUnpaidPaymentRecord(vendorId: string, payments: PaymentRequest[]): boolean {
  return payments.some((p) => p.vendorId === vendorId && isUnpaidPayment(p.status));
}

export type ApplyPaymentBlock =
  | { type: 'bank' }
  | { type: 'prepayment'; vendorName: string }
  | { type: 'unpaid' };

export function getApplyPaymentBlock(
  vendorId: string,
  vendor: Vendor | undefined,
  payments: PaymentRequest[],
): ApplyPaymentBlock | null {
  if (!isVendorBankInfoComplete(vendor)) return { type: 'bank' };
  if (isVendorPrepaymentMissing(vendor)) {
    return { type: 'prepayment', vendorName: vendor?.name ?? vendorId };
  }
  if (hasUnpaidPaymentRecord(vendorId, payments)) return { type: 'unpaid' };
  return null;
}

export function getApplyPaymentBlockMessage(block: ApplyPaymentBlock): string {
  switch (block.type) {
    case 'bank':
      return '未填写银行信息';
    case 'prepayment':
      return `${block.vendorName}未补充预付分成款信息`;
    case 'unpaid':
      return '存在一笔未付款的记录';
  }
}
