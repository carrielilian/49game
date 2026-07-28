import type {
  FormulaConfig,
  Game,
  ImportPreviewRow,
  SettlementRecord,
  Vendor,
} from '../data/types';
import { EXTERNAL_CHANNELS } from '../data/mock-data';
import { genId, getSettlementFormulaText, isFormulaConfiguredForOwnership } from './settlement';

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
  formulas: FormulaConfig[],
  games: Game[],
  vendors: Vendor[],
): ImportPreviewRow[] {
  const candidates = formulas
    .filter((formula) => isFormulaConfiguredForOwnership(formula, 'external'))
    .flatMap((formula) => {
      const game = games.find((item) => item.id === formula.gameId);
      const vendor = game ? vendors.find((item) => item.id === game.vendorId) : undefined;
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
  vendors: Vendor[],
): ImportPreviewRow[] {
  return rows.map((row) => {
    if (!EXTERNAL_CHANNELS.includes(row.channel)) {
      return { ...row, error: '外部渠道类型无效' };
    }
    const game = resolveGameFromImportRow(games, row.gameId);
    if (!game) {
      return { ...row, error: '未匹配到游戏，请检查游戏ID' };
    }
    const vendor = vendors.find((item) => item.id === game.vendorId);
    if (!vendor) {
      return { ...row, error: '未匹配到厂商，请检查游戏ID' };
    }
    return {
      ...row,
      gameId: game.id,
      gameName: game.onlineName,
      vendorName: vendor.name,
      error: undefined,
    };
  });
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
