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

const IMPORT_ERROR_ORDER = [
  '收入时间错误',
  '游戏ID不存在',
  '渠道不存在',
  '待结算金额格式错误',
] as const;

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatErrorRows(rows: number[], message: string): string {
  const sortedRows = Array.from(new Set(rows)).sort((left, right) => left - right);
  return `第${sortedRows.join('、')}行${message}`;
}

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
    sourceRow: index + 2,
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
  currentMonth = getCurrentMonthKey(),
): ImportPreviewRow[] {
  return rows.map((row, index) => {
    const sourceRow = row.sourceRow ?? index + 2;
    const errors: string[] = [];
    const incomeTime = row.incomeTime.trim();
    const channel = row.channel.trim();

    if (!INCOME_MONTH_PATTERN.test(incomeTime) || incomeTime >= currentMonth) {
      errors.push('收入时间错误');
    }
    if (!EXTERNAL_CHANNELS.includes(channel)) {
      errors.push('渠道不存在');
    }
    const game = resolveGameFromImportRow(games, row.gameId);
    if (!game) {
      errors.push('游戏ID不存在');
    }
    const amountHasInvalidPrecision =
      Math.abs(row.pendingAmount * 100 - Math.round(row.pendingAmount * 100)) > 1e-8;
    if (!Number.isFinite(row.pendingAmount) || amountHasInvalidPrecision) {
      errors.push('待结算金额格式错误');
    }
    return {
      ...row,
      sourceRow,
      incomeTime,
      channel,
      gameId: game?.id ?? row.gameId.trim(),
      error: errors[0],
      errors,
    };
  });
}

export function collectImportValidationErrors(rows: ImportPreviewRow[]): string[] {
  const errorRows = new Map<string, number[]>();

  rows.forEach((row, index) => {
    const sourceRow = row.sourceRow ?? index + 2;
    const errors = row.errors ?? (row.error ? [row.error] : []);
    errors.forEach((error) => {
      errorRows.set(error, [...(errorRows.get(error) ?? []), sourceRow]);
    });
  });

  return IMPORT_ERROR_ORDER.flatMap((error) => {
    const rowsForError = errorRows.get(error);
    return rowsForError?.length ? [formatErrorRows(rowsForError, error)] : [];
  });
}

export function findDuplicateImportRowNumbers(
  rows: ImportPreviewRow[],
  settlements: SettlementRecord[],
): number[] {
  const existingKeys = new Set(
    settlements
      .map((record) => `${record.incomeTime}|${record.channel}|${record.gameId}`),
  );
  const uploadedRowsByKey = new Map<string, number[]>();
  const duplicateRows = new Set<number>();

  rows.forEach((row, index) => {
    const key = `${row.incomeTime}|${row.channel}|${row.gameId}`;
    const sourceRow = row.sourceRow ?? index + 2;
    uploadedRowsByKey.set(key, [...(uploadedRowsByKey.get(key) ?? []), sourceRow]);
    if (existingKeys.has(key)) {
      duplicateRows.add(sourceRow);
    }
  });

  uploadedRowsByKey.forEach((sourceRows) => {
    if (sourceRows.length > 1) {
      sourceRows.forEach((sourceRow) => duplicateRows.add(sourceRow));
    }
  });

  return Array.from(duplicateRows).sort((left, right) => left - right);
}
