import type { SettlementRecord } from '../data/types';

function compareTextDesc(a: string, b: string): number {
  return b.localeCompare(a);
}

/** 历史厂商没有 createdAt 时，以递增ID代表添加先后。 */
export function compareVendorAddedDesc(
  a: { id: string; createdAt?: string },
  b: { id: string; createdAt?: string },
): number {
  if (a.createdAt || b.createdAt) return compareTextDesc(a.createdAt ?? '', b.createdAt ?? '');
  return compareTextDesc(a.id, b.id);
}

export function compareGameAddedDesc(
  a: { id: string; createdAt: string },
  b: { id: string; createdAt: string },
): number {
  return compareTextDesc(a.createdAt, b.createdAt) || compareTextDesc(a.id, b.id);
}

/** 兼容历史结算数据：缺少 createdAt 时，以结算时间、收入月份、ID依次回退。 */
export function settlementAddedAt(record: SettlementRecord): string {
  return record.createdAt
    ?? record.settlementTime
    ?? `${record.incomeTime}-31 23:59:59`;
}

export function compareSettlementAddedDesc(a: SettlementRecord, b: SettlementRecord): number {
  return compareTextDesc(settlementAddedAt(a), settlementAddedAt(b))
    || compareTextDesc(a.id, b.id);
}

export function comparePaymentAddedDesc(
  a: { id: string; applyTime: string },
  b: { id: string; applyTime: string },
): number {
  return compareTextDesc(a.applyTime, b.applyTime) || compareTextDesc(a.id, b.id);
}
