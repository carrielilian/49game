export type VersionChangeType = '新增' | '调整' | '规则变化' | '删除';
export type VersionChangeStatus = '待评估' | '待确认' | '已确认' | '已实现' | '已验收' | '已废弃';

export interface VersionChange {
  id: string;
  requirementId: string;
  title: string;
  type: VersionChangeType;
  before: string;
  after: string;
  pageId: string;
  pageName: string;
  targetAnnotationId?: string;
  acceptance: string;
  status: VersionChangeStatus;
}

/**
 * V1.2 只登记相对 V1.1 的变化。新需求完成规则确认后再追加，禁止把 V1.1 内容重复登记。
 */
export const VERSION_CHANGES: VersionChange[] = [];

export const VERSION_CHANGE_TYPES: VersionChangeType[] = ['新增', '调整', '规则变化', '删除'];

export function getVisiblePageChanges(
  changes: VersionChange[],
  pageId: string,
): VersionChange[] {
  return changes.filter((change) => change.pageId === pageId && change.type !== '删除');
}
