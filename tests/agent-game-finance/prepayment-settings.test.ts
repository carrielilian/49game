import { describe, expect, it } from 'vitest';
import type { Contract, GamePaymentRequest } from '../../src/prototypes/agent-game-finance/data/types';
import {
  calcHistoricalDeductionLimit,
  isHistoricalDeductionWithinLimit,
} from '../../src/prototypes/agent-game-finance/utils/prepayment';

function contractWithPaidPrepayment(paidPrepayment?: number): Contract {
  return {
    gameId: '100001',
    contractNumber: 'HT-001',
    cooperationContents: ['预付分成款'],
    paidPrepayment,
    supplementalNote: '',
    cooperationStatus: '合作中',
  };
}

function payment(id: string, deduction: number): GamePaymentRequest {
  return {
    id,
    gameId: '100001',
    pendingAmount: deduction,
    prepaymentDeductionAmount: deduction,
    status: '未付款',
    applyTime: '2026-08-01 10:00:00',
  };
}

describe('历史已抵扣分成款上限', () => {
  it('未维护已付预付分成款时只允许填写0', () => {
    const contract = contractWithPaidPrepayment();
    expect(isHistoricalDeductionWithinLimit(0, contract, '100001', [])).toBe(true);
    expect(isHistoricalDeductionWithinLimit(0.01, contract, '100001', [])).toBe(false);
  });

  it('已付预付分成款为0时只允许填写0', () => {
    const contract = contractWithPaidPrepayment(0);
    expect(isHistoricalDeductionWithinLimit(0, contract, '100001', [])).toBe(true);
    expect(isHistoricalDeductionWithinLimit(0.01, contract, '100001', [])).toBe(false);
  });

  it('没有历史申请抵扣时，历史已抵扣可以等于但不能大于预付分成款', () => {
    const contract = contractWithPaidPrepayment(100);
    expect(isHistoricalDeductionWithinLimit(100, contract, '100001', [])).toBe(true);
    expect(isHistoricalDeductionWithinLimit(100.01, contract, '100001', [])).toBe(false);
  });

  it('扣除历次申请付款抵扣金额后计算历史已抵扣可填写上限', () => {
    const contract = contractWithPaidPrepayment(100);
    const payments = [payment('GP001', 30.12), payment('GP002', 20)];
    expect(calcHistoricalDeductionLimit(contract, '100001', payments)).toBe(49.88);
    expect(isHistoricalDeductionWithinLimit(49.88, contract, '100001', payments)).toBe(true);
    expect(isHistoricalDeductionWithinLimit(49.89, contract, '100001', payments)).toBe(false);
  });
});
