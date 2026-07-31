export interface ListSearchQuery {
  game?: string;
  vendor?: string;
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
    vendorId?: string | null;
    vendorName?: string | null;
  },
): boolean {
  if (query.game && !matchesListKeyword(query.game, [fields.gameId, fields.gameName])) return false;
  if (query.vendor && !matchesListKeyword(query.vendor, [fields.vendorId, fields.vendorName])) return false;
  return true;
}

export const SEARCH_FIELD_PLACEHOLDER = {
  game: '游戏ID / 游戏名称',
  vendor: '厂商ID / 厂商名称',
} as const;

export type ListSearchMode = 'game' | 'vendor' | 'gameAndVendor';
