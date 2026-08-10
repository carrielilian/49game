import { describe, expect, it } from 'vitest';
import type {
  Game,
  ImportPreviewRow,
  SettlementRecord,
} from '../src/prototypes/agent-game-finance/data/types';
import {
  collectImportValidationErrors,
  enrichImportRowsOnParse,
  findDuplicateImportRowNumbers,
} from '../src/prototypes/agent-game-finance/utils/externalImport';

function row(overrides: Partial<ImportPreviewRow> = {}): ImportPreviewRow {
  return {
    id: 'row',
    sourceRow: 2,
    incomeTime: '2026-07',
    channel: 'Steam',
    gameId: '100001',
    gameName: '测试游戏',
    vendorName: '测试厂商',
    pendingAmount: 100,
    ...overrides,
  };
}

const games = [{ id: '100001' }] as Game[];

describe('agent game finance external import validation', () => {
  it('按文件行号汇总全表数据错误', () => {
    const validated = enrichImportRowsOnParse([
      row({ sourceRow: 2, incomeTime: '2026-08', gameId: '999999' }),
      row({ sourceRow: 3, channel: '未知渠道', pendingAmount: 10.123 }),
      row({ sourceRow: 5, incomeTime: '2026/07' }),
    ], games, '2026-08');

    expect(collectImportValidationErrors(validated)).toEqual([
      '第2、5行收入时间错误',
      '第2行游戏ID不存在',
      '第3行渠道不存在',
      '第3行待结算金额格式错误',
    ]);
  });

  it('文件内重复时返回同组全部行号', () => {
    expect(findDuplicateImportRowNumbers([
      row({ sourceRow: 2 }),
      row({ id: 'row-2', sourceRow: 6 }),
    ], [])).toEqual([2, 6]);
  });

  it('与主列表重复时返回上传文件中的冲突行号', () => {
    const settlements = [{
      incomeTime: '2026-07',
      channel: 'Steam',
      gameId: '100001',
    }] as SettlementRecord[];

    expect(findDuplicateImportRowNumbers([
      row({ sourceRow: 4 }),
    ], settlements)).toEqual([4]);
  });
});
