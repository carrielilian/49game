import { describe, expect, it } from 'vitest';
import {
  EXTERNAL_CHANNELS,
  EXTERNAL_CHANNEL_IDENTIFIERS,
} from '../src/prototypes/agent-game-finance-v1.1/data/mock-data';
import { normalizeExternalChannel } from '../src/prototypes/agent-game-finance-v1.1/utils/externalImport';
import { requiresFinanceCenterSettlementCheck } from '../src/prototypes/agent-game-finance-v1.1/utils/financeCenter';

describe('代理游戏财务 V1.1', () => {
  it('包含五个新增外部渠道及约定英文标识', () => {
    expect(EXTERNAL_CHANNELS).toEqual(expect.arrayContaining([
      'WeGame', '穿山甲广告 iOS', '穿山甲广告安卓', 'mumu', '雷电',
    ]));
    expect(EXTERNAL_CHANNEL_IDENTIFIERS).toEqual({
      WeGame: 'WeGame',
      '穿山甲广告 iOS': 'csj(iOS)',
      穿山甲广告安卓: 'csj(Android)',
      mumu: 'mumu',
      雷电: 'LDPlayer',
    });
    expect(normalizeExternalChannel('csj(Android)')).toBe('穿山甲广告安卓');
    expect(normalizeExternalChannel('LDPlayer')).toBe('雷电');
  });

  it('收入和退款数据拉取均需要校验财务中心结算状态', () => {
    expect(requiresFinanceCenterSettlementCheck('internal')).toBe(true);
    expect(requiresFinanceCenterSettlementCheck('refund')).toBe(true);
  });
});
