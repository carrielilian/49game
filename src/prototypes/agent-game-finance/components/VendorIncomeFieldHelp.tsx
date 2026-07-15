import React, { useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { Modal } from './Modal';

export const VENDOR_INCOME_FIELD_HINTS = [
  '账户总收入 = 累计收入 - 累计退款',
  '账户余额 = 内部收入结算与外部收入结算中「申请付款状态」为「未申请」的「结算收入」之和 − 内部退款结算中「申请付款状态」为「未申请」的「结算退款」之和',
  '预付分成款 = 厂商收入「预付分成管理」中维护的预付分成款',
  '已抵扣分成款 = 已付款实际付款金额之和 + 历史已抵扣分成款；若预付分成款 − 上述合计 ≤ 0，则取预付分成款（公式中的预付分成款、历史已抵扣分成款均为保存后的数值）',
  '剩余未抵扣分成款 = 预付分成款 − 已抵扣分成款（≤0 时为 0）；公式中的预付分成款为保存后的数值',
  '累计收入 = 内部收入结算与外部收入结算全部已结算记录的「结算收入」之和',
  '累计退款 = 内部退款结算全部已结算记录的「结算退款」之和',
] as const;

export function VendorIncomeFieldHelp() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="agf-help-btn"
        onClick={() => setOpen(true)}
        aria-label="厂商收入字段说明"
        title="字段说明"
      >
        <CircleHelp size={16} aria-hidden />
      </button>
      <Modal
        title="厂商收入字段说明"
        open={open}
        onClose={() => setOpen(false)}
        plain
      >
        <ul className="agf-field-help-list">
          {VENDOR_INCOME_FIELD_HINTS.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
