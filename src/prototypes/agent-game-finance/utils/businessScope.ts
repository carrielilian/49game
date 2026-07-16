import type { BusinessType, Game, GameBalance, GamePaymentRequest, PaymentRequest, SettlementRecord, Vendor, VendorBalance } from '../data/types';

export const BUSINESS_TYPE_OPTIONS: { value: BusinessType; label: string }[] = [
  { value: '4399', label: '游戏盒' },
  { value: '快爆', label: '快爆' },
];

export const VENDOR_ID_BASE: Record<BusinessType, number> = {
  '4399': 1001,
  '快爆': 2001,
};

export const GAME_ID_BASE: Record<BusinessType, number> = {
  '4399': 4001,
  '快爆': 5001,
};

export function vendorIdsInBusiness(vendors: Vendor[], businessType: BusinessType): Set<string> {
  return new Set(vendors.filter((v) => v.businessType === businessType).map((v) => v.id));
}

export function filterVendorsByBusiness(vendors: Vendor[], businessType: BusinessType): Vendor[] {
  return vendors.filter((v) => v.businessType === businessType);
}

export function filterGamesByBusiness(games: Game[], vendorIds: Set<string>): Game[] {
  return games.filter((g) => vendorIds.has(g.vendorId));
}

export function filterSettlementsByBusiness(settlements: SettlementRecord[], vendorIds: Set<string>): SettlementRecord[] {
  return settlements.filter((s) => vendorIds.has(s.vendorId));
}

export function filterPaymentsByBusiness(payments: PaymentRequest[], vendorIds: Set<string>): PaymentRequest[] {
  return payments.filter((p) => vendorIds.has(p.vendorId));
}

export function filterBalancesByBusiness(balances: VendorBalance[], vendorIds: Set<string>): VendorBalance[] {
  return balances.filter((b) => vendorIds.has(b.vendorId));
}

export function filterGamePaymentsByBusiness(payments: GamePaymentRequest[], gameIds: Set<string>): GamePaymentRequest[] {
  return payments.filter((p) => gameIds.has(p.gameId));
}

export function filterGameBalancesByBusiness(balances: GameBalance[], gameIds: Set<string>): GameBalance[] {
  return balances.filter((b) => gameIds.has(b.gameId));
}
