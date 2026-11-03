import React, { useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { Modal } from './Modal';

export const GAME_INCOME_FIELD_HINTS = [
  '账户总收入 = 累计收入 - 累计退款',
  '账户余额 = 【收入结算】中「申请付款状态」为「未申请」的「结算收入」之和 − 【退款结算】中「申请付款状态」为「未申请」的「结算退款」之和（按游戏维度汇总）',
  '预付分成款 = 【游戏管理】「已付款项」中维护的已付预付分成款',
  '已抵扣分成款 = 历史已抵扣分成款 + 历次付款申请成功时直接抵扣的预付分成款；最大不超过预付分成款',
  '剩余未抵扣分成款 = 预付分成款 − 已抵扣分成款（≤0 时为 0）；公式中的预付分成款为保存后的数值',
  '累计收入 = 【收入结算】全部已结算记录的「结算收入」之和（按游戏维度）',
  '累计退款 = 【退款结算】全部已结算记录的「结算退款」之和（按游戏维度）',
] as const;

export function GameIncomeFieldHelp() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="agf-help-btn"
        data-annotation-id="game-income-field-help"
        onClick={() => setOpen(true)}
        aria-label="游戏请款管理字段说明"
        title="字段说明"
      >
        <CircleHelp size={16} aria-hidden />
      </button>
      <Modal
        title="游戏请款管理字段说明"
        open={open}
        onClose={() => setOpen(false)}
        plain
      >
        <ul className="agf-field-help-list">
          {GAME_INCOME_FIELD_HINTS.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
