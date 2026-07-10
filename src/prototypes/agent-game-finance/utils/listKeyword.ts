export interface ListSearchQuery {
  game?: string;
  contractName?: string;
  vendorId?: string;
  vendorName?: string;
}

export const EMPTY_LIST_SEARCH: ListSearchQuery = {};

export function matchesListKeyword(keyword: string, fields: Array<string | undefined | null>): boolean {
  if (!keyword) return true;
  return fields.some((field) => (field ?? '').includes(keyword));
}

export function matchesListSearch(
  query: ListSearchQuery,
  fields: {
    gameId?: string | null;
    gameName?: string | null;
    contractName?: string | null;
    vendorId?: string | null;
    vendorName?: string | null;
  },
): boolean {
  if (query.game && !matchesListKeyword(query.game, [fields.gameId, fields.gameName])) return false;
  if (query.contractName && !(fields.contractName ?? '').includes(query.contractName)) return false;
  if (query.vendorId && !(fields.vendorId ?? '').includes(query.vendorId)) return false;
  if (query.vendorName && !(fields.vendorName ?? '').includes(query.vendorName)) return false;
  return true;
}

export const SEARCH_FIELD_PLACEHOLDER = {
  game: '游戏ID / 游戏名称',
  contractName: '合同游戏名称',
  vendorId: '厂商ID',
  vendorName: '厂商名称',
} as const;

export type ListSearchMode = 'game' | 'vendor' | 'gameAndVendor';
