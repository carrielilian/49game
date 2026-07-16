import type { FormulaConfig, Game, ImportPreviewRow, Vendor } from '../data/types';
import { isFormulaConfigured } from '../data/mock-data';
import { resolveFollowInvoiceTax } from './invoiceTax';
import { calcSettlement, formatFormulaText, genId } from './settlement';

/** 按上传报表「游戏名称 + 厂商名称」匹配游戏（游戏名称取 onlineName） */
export function resolveGameFromImportRow(
  games: Game[],
  vendors: Vendor[],
  gameName: string,
  vendorName: string,
): { gameId: string; game: Game } | null {
  const trimmedGame = gameName.trim();
  const trimmedVendor = vendorName.trim();
  if (!trimmedGame || !trimmedVendor) return null;
  const vendor = vendors.find((v) => v.name === trimmedVendor);
  if (!vendor) return null;
  const game = games.find((g) => g.vendorId === vendor.id && g.onlineName === trimmedGame);
  if (!game) return null;
  return { gameId: game.id, game };
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
  const resolved = resolveGameFromImportRow(games, vendors, row.gameName, row.vendorName);
  if (!resolved) {
    return { ...row, calculated: false, error: '未匹配到游戏，请检查游戏名称与厂商名称' };
  }
  const formula = formulas.find((f) => f.gameId === resolved.gameId);
  if (!formula || !isFormulaConfigured(formula)) {
    return {
      ...row,
      gameId: resolved.gameId,
      gameName: resolved.game.onlineName,
      vendorName: vendors.find((v) => v.id === resolved.game.vendorId)?.name ?? row.vendorName,
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
    vendorName: vendor?.name ?? row.vendorName,
    formulaText,
    settlementIncome,
    calculated: true,
    error: undefined,
  };
}

/** 模拟解析上传表格（字段：收入时间、游戏名称、厂商名称、待结算金额） */
export function buildMockImportRows(
  channel: string,
  formulas: FormulaConfig[],
  games: Game[],
  vendors: Vendor[],
): ImportPreviewRow[] {
  const rows: ImportPreviewRow[] = [];
  const months = ['2026-06', '2026-07', '2026-08'];

  const matched = formulas
    .filter((f) => isFormulaConfigured(f))
    .flatMap((f) => {
      const game = games.find((g) => g.id === f.gameId);
      if (!game) return [];
      const vendor = vendors.find((v) => v.id === game.vendorId);
      if (!vendor) return [];
      return [{ game, vendor }];
    });
  const picks = matched.slice(0, 3);
  picks.forEach(({ game, vendor }, i) => {
    rows.push({
      id: genId('IP'),
      incomeTime: months[i % months.length],
      gameName: game.onlineName,
      vendorName: vendor.name,
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
    const resolved = resolveGameFromImportRow(games, vendors, row.gameName, row.vendorName);
    if (!resolved) {
      return { ...row, calculated: false, error: '未匹配到游戏，请检查游戏名称与厂商名称' };
    }
    const formula = formulas.find((f) => f.gameId === resolved.gameId);
    if (!formula || !isFormulaConfigured(formula)) {
      const vendor = vendors.find((v) => v.id === resolved.game.vendorId);
      return {
        ...row,
        gameId: resolved.gameId,
        gameName: resolved.game.onlineName,
        vendorName: vendor?.name ?? row.vendorName,
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
      vendorName: vendor?.name ?? row.vendorName,
      calculated: false,
      formulaText,
      settlementIncome: undefined,
      error: undefined,
    };
  });
}
