/** 厂商发票信息 → 跟随发票时的结算税率（小数） */
const INVOICE_TAX_RATE: Record<string, number> = {
  '增值税专用发票（6%）': 0,
  '增值税专用发票（3%）': 0.0336,
  '增值税专用发票（1%）': 0.056,
  普通发票: 0.0672,
};

export function isOtherInvoice(invoiceInfo: string): boolean {
  return invoiceInfo === '其他' || !invoiceInfo;
}

/** 已知发票类型返回税率；「其他」或未知返回 null（需手输） */
export function taxRateFromInvoice(invoiceInfo: string): number | null {
  if (invoiceInfo in INVOICE_TAX_RATE) return INVOICE_TAX_RATE[invoiceInfo];
  return null;
}

export function formatTaxPercent(rate: number): string {
  const p = rate * 100;
  if (Number.isInteger(p) || Math.abs(p - Math.round(p)) < 1e-9) return `${Math.round(p)}%`;
  return `${parseFloat(p.toFixed(2))}%`;
}

/** 跟随发票且可映射时返回税率，否则保留当前值 */
export function resolveFollowInvoiceTax(invoiceInfo: string, current: number): number {
  const mapped = taxRateFromInvoice(invoiceInfo);
  return mapped === null ? current : mapped;
}
