import type { FormulaConfig, Game, ImportPreviewRow, Vendor } from '../data/types';
import { isFormulaConfigured } from '../data/mock-data';
import { resolveFollowInvoiceTax } from './invoiceTax';
import { calcSettlement, formatFormulaText, genId } from './settlement';

export function resolveGameFromChannelGameId(
  formulas: FormulaConfig[],
  games: Game[],
  channelGameId: string,
  channelName: string,
): { gameId: string; game: Game } | null {
  for (const f of formulas) {
    const ch = f.channels.find(
      (c) => c.type === 'external' && c.name === channelName && c.enabled && c.channelGameId === channelGameId,
    );
    if (ch) {
      const game = games.find((g) => g.id === f.gameId);
      if (game) return { gameId: f.gameId, game };
    }
  }
  return null;
}

function getExternalTax(formula: FormulaConfig, vendor: Vendor | undefined): number {
  if (formula.externalTaxMode === '跟随发票' && vendor) {
    return resolveFollowInvoiceTax(vendor.invoiceInfo, formula.externalTax);
  }
  return formula.externalTax;
}

function getExternalFormulaDisplay(formula: FormulaConfig, vendor: Vendor | undefined) {
  const tax = getExternalTax(formula, vendor);
  const { externalChannelFee: fee, externalShare: share } = formula;
  return {
    tax,
    fee,
    share,
    formulaText: formatFormulaText(tax, fee, share, '外部渠道'),
  };
}

export function calculateImportRow(
  row: ImportPreviewRow,
  formulas: FormulaConfig[],
  games: Game[],
  vendors: Vendor[],
): ImportPreviewRow {
  const resolved = resolveGameFromChannelGameId(formulas, games, row.channelGameId, row.channel);
  if (!resolved) {
    return { ...row, calculated: false, error: '未匹配到游戏，请检查渠道游戏ID' };
  }
  const formula = formulas.find((f) => f.gameId === resolved.gameId);
  if (!formula || !isFormulaConfigured(formula)) {
    return {
      ...row,
      gameId: resolved.gameId,
      gameName: resolved.game.onlineName,
      calculated: false,
      error: '该游戏尚未配置结算公式',
    };
  }
  const vendor = vendors.find((v) => v.id === resolved.game.vendorId);
  const { tax, fee, share, formulaText } = getExternalFormulaDisplay(formula, vendor);
  const settlementIncome = calcSettlement(row.pendingAmount, tax, fee, share);
  return {
    ...row,
    gameId: resolved.gameId,
    gameName: resolved.game.onlineName,
    formulaText,
    settlementIncome,
    calculated: true,
    error: undefined,
  };
}

export function hasChannelEnabledGames(channelName: string, formulas: FormulaConfig[]): boolean {
  return formulas.some((f) =>
    f.channels.some(
      (c) => c.type === 'external' && c.name === channelName && c.enabled && c.channelGameId,
    ),
  );
}

/** 模拟解析上传表格（字段：渠道游戏ID、收入时间、待结算收入） */
export function buildMockImportRows(
  channel: string,
  formulas: FormulaConfig[],
): ImportPreviewRow[] {
  const rows: ImportPreviewRow[] = [];
  const months = ['2025-05', '2025-06', '2025-07'];

  const matched = formulas.flatMap((f) =>
    f.channels
      .filter((c) => c.type === 'external' && c.name === channel && c.enabled && c.channelGameId)
      .map((c) => ({ channelGameId: c.channelGameId! })),
  );
  const picks = matched.slice(0, 3);
  picks.forEach(({ channelGameId }, i) => {
    rows.push({
      id: genId('IP'),
      channelGameId,
      incomeTime: months[i % months.length],
      pendingAmount: Math.round(Math.random() * 80000 + 10000),
      channel,
      calculated: false,
    });
  });
  return rows;
}

export function enrichImportRowsOnParse(
  rows: ImportPreviewRow[],
  formulas: FormulaConfig[],
  games: Game[],
  vendors: Vendor[],
): ImportPreviewRow[] {
  return rows.map((row) => {
    if (row.error) return row;
    const resolved = resolveGameFromChannelGameId(formulas, games, row.channelGameId, row.channel);
    if (!resolved) {
      return { ...row, calculated: false, error: '未匹配到游戏，请检查渠道游戏ID' };
    }
    const formula = formulas.find((f) => f.gameId === resolved.gameId);
    if (!formula || !isFormulaConfigured(formula)) {
      return {
        ...row,
        gameId: resolved.gameId,
        gameName: resolved.game.onlineName,
        calculated: false,
        formulaText: '-',
        settlementIncome: undefined,
        error: '该游戏尚未配置结算公式',
      };
    }
    const vendor = vendors.find((v) => v.id === resolved.game.vendorId);
    const { formulaText } = getExternalFormulaDisplay(formula, vendor);
    return {
      ...row,
      gameId: resolved.gameId,
      gameName: resolved.game.onlineName,
      calculated: false,
      formulaText,
      settlementIncome: undefined,
      error: undefined,
    };
  });
}
