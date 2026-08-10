import { describe, expect, it } from 'vitest';
import type { FormulaConfig, SettlementRecord, Vendor } from '../src/prototypes/agent-game-finance/data/types';
import { compareSettlementAddedDesc } from '../src/prototypes/agent-game-finance/utils/listSort';
import {
  calcRecordSettlementIncome,
  getSettlementFormulaText,
} from '../src/prototypes/agent-game-finance/utils/settlement';

const formula = {
  gameId: '100001',
  internalTaxMode: '自定义',
  internalTax: 0.05,
  internalChannelFee: 0.1,
  internalShare: 0.5,
  externalTaxMode: '自定义',
  externalTax: 0.06,
  externalChannelFee: 0.2,
  externalShare: 0.4,
  channels: [],
} satisfies FormulaConfig;

const vendor = { businessType: '游戏盒', invoiceInfo: '其他', taxPoint: 0.06 } as unknown as Vendor;

function record(overrides: Partial<SettlementRecord> = {}): SettlementRecord {
  return {
    id: 'S1',
    type: 'refund',
    incomeTime: '2026-07',
    gameId: '100001',
    channel: '快爆',
    grossRevenue: 1000,
    settlementAmount: 1000,
    settlementIncome: 0,
    formulaText: '-',
    paymentApplyStatus: '未申请',
    settled: false,
    vendorId: '4001',
    ...overrides,
  };
}

describe('agent game finance settlement rules', () => {
  it('退款公式和计算均不包含渠道费', () => {
    expect(getSettlementFormulaText(formula, vendor, 'external', '退款金额'))
      .toBe('外部渠道：退款金额*（1-6%）*40%');
    expect(calcRecordSettlementIncome(record(), formula, vendor)).toBe(376);
  });

  it('收入计算仍保留渠道费', () => {
    expect(calcRecordSettlementIncome(record({ type: 'external' }), formula, vendor)).toBe(296);
  });

  it('新拉取或导入记录按写入时间显示在列表最上方', () => {
    const older = record({ id: 'older', createdAt: '2026-08-04 10:00:00' });
    const newer = record({ id: 'newer', createdAt: '2026-08-04 10:01:00' });
    expect([older, newer].sort(compareSettlementAddedDesc).map((item) => item.id))
      .toEqual(['newer', 'older']);
  });

  it('新数据优先于缺少写入时间但结算时间更晚的历史数据', () => {
    const imported = record({ id: 'imported', createdAt: '2026-08-04 10:00:00' });
    const legacy = record({
      id: 'legacy',
      createdAt: undefined,
      settled: true,
      settlementTime: '2026-08-06 12:00:00',
    });
    expect([legacy, imported].sort(compareSettlementAddedDesc).map((item) => item.id))
      .toEqual(['imported', 'legacy']);
  });
});
