import type {
  FormulaConfig,
  Game,
  ImportPreviewRow,
  SettlementRecord,
  Vendor,
} from '../data/types';
import { EXTERNAL_CHANNELS } from '../data/mock-data';
import { genId, getSettlementFormulaText } from './settlement';

const INCOME_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function resolveGameFromImportRow(
  games: Game[],
  gameId: string,
): Game | null {
  const normalizedId = gameId.trim();
  if (!normalizedId) return null;
  return games.find((game) => game.id === normalizedId) ?? null;
}

export function getExternalFormulaText(
  formula: FormulaConfig | undefined,
  vendor: Vendor | undefined,
): string {
  return getSettlementFormulaText(formula, vendor, 'external');
}

/** 模拟解析上传表格（字段：收入时间、渠道、游戏ID、游戏名称、厂商名称、待结算金额） */
export function buildMockImportRows(
  games: Game[],
  vendors: Vendor[],
): ImportPreviewRow[] {
  const candidates = games
    .flatMap((game) => {
      const vendor = vendors.find((item) => item.id === game.vendorId);
      return game && vendor ? [{ game, vendor }] : [];
    })
    .slice(0, 3);

  return candidates.map(({ game, vendor }, index) => ({
    id: genId('IP'),
    incomeTime: '2026-07',
    channel: EXTERNAL_CHANNELS[index % EXTERNAL_CHANNELS.length],
    gameId: game.id,
    gameName: game.onlineName,
    vendorName: vendor.name,
    pendingAmount: 26000 + index * 13500,
  }));
}

export function enrichImportRowsOnParse(
  rows: ImportPreviewRow[],
  games: Game[],
): ImportPreviewRow[] {
  return rows.map((row) => {
    if (!INCOME_MONTH_PATTERN.test(row.incomeTime.trim())) {
      return { ...row, error: '收入时间格式错误' };
    }
    if (!EXTERNAL_CHANNELS.includes(row.channel)) {
      return { ...row, error: `${row.channel.trim() || '空值'}渠道不存在` };
    }
    const game = resolveGameFromImportRow(games, row.gameId);
    if (!game) {
      return { ...row, error: `${row.gameId.trim() || '空值'}游戏ID不存在` };
    }
    const amountHasInvalidPrecision =
      Math.abs(row.pendingAmount * 100 - Math.round(row.pendingAmount * 100)) > 1e-8;
    if (!Number.isFinite(row.pendingAmount) || row.pendingAmount <= 0 || amountHasInvalidPrecision) {
      return { ...row, error: '待结算金额格式错误' };
    }
    return {
      ...row,
      gameId: game.id,
      error: undefined,
    };
  });
}

export function collectImportValidationErrors(rows: ImportPreviewRow[]): string[] {
  const gameIds = new Set<string>();
  const channels = new Set<string>();
  const otherErrors = new Set<string>();

  rows.forEach((row) => {
    const error = row.error;
    if (!error) return;
    if (error.endsWith('游戏ID不存在')) {
      gameIds.add(error.slice(0, -'游戏ID不存在'.length));
      return;
    }
    if (error.endsWith('渠道不存在')) {
      channels.add(error.slice(0, -'渠道不存在'.length));
      return;
    }
    otherErrors.add(error);
  });

  return [
    ...(gameIds.size > 0 ? [`${Array.from(gameIds).join('、')}游戏ID不存在`] : []),
    ...(channels.size > 0 ? [`${Array.from(channels).join('、')}渠道不存在`] : []),
    ...otherErrors,
  ];
}

export function findDuplicateImportGameIds(
  rows: ImportPreviewRow[],
  settlements: SettlementRecord[],
): string[] {
  const existingKeys = new Set(
    settlements
      .filter((record) => record.type === 'external')
      .map((record) => `${record.incomeTime}|${record.channel}|${record.gameId}`),
  );
  const uploadedKeys = new Set<string>();
  const duplicateIds = new Set<string>();

  for (const row of rows) {
    const key = `${row.incomeTime}|${row.channel}|${row.gameId}`;
    if (existingKeys.has(key) || uploadedKeys.has(key)) {
      duplicateIds.add(row.gameId);
    }
    uploadedKeys.add(key);
  }

  return Array.from(duplicateIds);
}
