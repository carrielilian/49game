import type { FormulaConfig, Game } from '../data/types';

/** 原型 mock：false 时模拟财务中心本月尚有业务未结算 */
export const MOCK_FINANCE_CENTER_READY = true;

export interface FinanceCenterRow {
  channel: string;
  channelGameId: string;
  gameId: string;
  amount: number;
}

const PULL_DELAY_MS = 800;

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 模拟查询财务中心上月业务是否全部结算完成（通过后才可拉取上月收入） */
export async function checkFinanceCenterReady(): Promise<boolean> {
  await delay(PULL_DELAY_MS);
  return MOCK_FINANCE_CENTER_READY;
}

function mockAmount(gameId: string, channelGameId: string, type: 'internal' | 'refund'): number {
  let hash = 0;
  const seed = `${gameId}-${channelGameId}-${type}`;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  const base = type === 'refund' ? 8000 : 30000;
  return base + (hash % 70000);
}

/**
 * 按「渠道 + 渠道游戏ID」从财务中心拉取待结算/待退款数据（原型 mock）。
 * 仅包含已上线游戏、结算公式中已勾选的内部渠道。
 */
/** @param incomeMonthKey 拉取的收入月份（上一自然月，YYYY-MM） */
export function fetchFinanceCenterRows(
  type: 'internal' | 'refund',
  formulas: FormulaConfig[],
  games: Game[],
  incomeMonthKey: string,
): FinanceCenterRow[] {
  void incomeMonthKey;
  const rows: FinanceCenterRow[] = [];
  for (const game of games) {
    if (game.operationStatus !== '已上线') continue;
    const formula = formulas.find((f) => f.gameId === game.id);
    if (!formula) continue;
    for (const ch of formula.channels) {
      if (ch.type !== 'internal' || !ch.enabled || !ch.channelGameId) continue;
      rows.push({
        channel: ch.name,
        channelGameId: ch.channelGameId,
        gameId: game.id,
        amount: mockAmount(game.id, ch.channelGameId, type),
      });
    }
  }
  return rows;
}
