export function selectOptions(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }));
}

export const LICENSE_FILTER_OPTIONS = selectOptions(['有', '无']);
export const OPERATION_STATUS_FILTER_OPTIONS = selectOptions(['已上线', '未上线']);
export const COOPERATION_STATUS_FILTER_OPTIONS = selectOptions(['合作中', '合作终止']);
export const PAYMENT_APPLY_STATUS_FILTER_OPTIONS = selectOptions(['未申请', '已申请']);
export const PAYMENT_STATUS_FILTER_OPTIONS = selectOptions(['待付款', '已付款']);
export const INVOICE_INFO_FILTER_OPTIONS = selectOptions([
  '增值税专用发票（6%）',
  '增值税专用发票（3%）',
  '增值税专用发票（1%）',
  '普通发票',
  '其他',
]);
export const SETTLED_STATUS_FILTER_OPTIONS = selectOptions(['已结算', '待结算']);

export function uniqueOptions(values: string[]) {
  return selectOptions([...new Set(values)].sort());
}
