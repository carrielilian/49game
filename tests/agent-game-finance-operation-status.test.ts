import { describe, expect, it } from 'vitest';
import { INITIAL_GAMES } from '../src/prototypes/agent-game-finance/data/mock-data';
import { OPERATION_STATUS_FILTER_OPTIONS } from '../src/prototypes/agent-game-finance/utils/columnFilters';

describe('游戏管理运营状态', () => {
  it('列表筛选包含未上线、已上线和已下线', () => {
    expect(OPERATION_STATUS_FILTER_OPTIONS.map((option) => option.value)).toEqual([
      '已上线',
      '未上线',
      '已下线',
    ]);
  });

  it('存在已下线演示数据', () => {
    expect(INITIAL_GAMES.some((game) => game.operationStatus === '已下线')).toBe(true);
  });
});
