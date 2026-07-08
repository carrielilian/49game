export function calcSettlement(
  gross: number,
  tax: number,
  channelFee: number,
  share: number,
): number {
  const net = gross * (1 - tax - channelFee) * share;
  return Math.round(net * 100) / 100;
}

export function formatFormulaText(
  tax: number,
  channelFee: number,
  share: number,
  channelLabel: string,
): string {
  return `${channelLabel}：收入×(1-${(tax * 100).toFixed(0)}%-${(channelFee * 100).toFixed(0)}%)×${(share * 100).toFixed(0)}%`;
}

export function formatMoney(value: number): string {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function genId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
