import type { PaymentStatus } from '../data/types';

/** 付款管理：未付款（含历史「待付款」） */
export function isUnpaidPayment(status: PaymentStatus | string): boolean {
  return status === '未付款' || status === '待付款';
}

export function isPaidPayment(status: PaymentStatus | string): boolean {
  return status === '已付款';
}
