import { describe, expect, it } from 'vitest';
import type { Contract } from '../../src/prototypes/agent-game-finance/data/types';
import { isHistoricalDeductionWithinPaidPrepayment } from '../../src/prototypes/agent-game-finance/utils/prepayment';

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

describe('历史已抵扣分成款上限', () => {
  it('未维护已付预付分成款时只允许填写0', () => {
    const contract = contractWithPaidPrepayment();
    expect(isHistoricalDeductionWithinPaidPrepayment(0, contract)).toBe(true);
    expect(isHistoricalDeductionWithinPaidPrepayment(0.01, contract)).toBe(false);
  });

  it('已付预付分成款为0时只允许填写0', () => {
    const contract = contractWithPaidPrepayment(0);
    expect(isHistoricalDeductionWithinPaidPrepayment(0, contract)).toBe(true);
    expect(isHistoricalDeductionWithinPaidPrepayment(0.01, contract)).toBe(false);
  });

  it('历史已抵扣可以等于但不能大于已付预付分成款', () => {
    const contract = contractWithPaidPrepayment(100);
    expect(isHistoricalDeductionWithinPaidPrepayment(100, contract)).toBe(true);
    expect(isHistoricalDeductionWithinPaidPrepayment(100.01, contract)).toBe(false);
  });
});
