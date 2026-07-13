import React, { useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { Modal } from './Modal';

export const VENDOR_INCOME_FIELD_HINTS = [
  '账户总收入 = 累计收入 - 累计退款',
  '账户余额 = 内部收入结算与外部收入结算中「申请付款状态」为「未申请」的「结算收入」之和 − 内部退款结算中「申请付款状态」为「未申请」的「结算退款」之和 − 预付分成款',
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
