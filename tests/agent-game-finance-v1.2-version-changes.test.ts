import { describe, expect, it } from 'vitest';
import {
  getVisiblePageChanges,
  VERSION_CHANGES,
  VERSION_CHANGE_TYPES,
  type VersionChange,
} from '../src/prototypes/agent-game-finance-v1.2/content/versionChanges';

describe('代理游戏财务 V1.2 版本变更标识', () => {
  it('初始版本不把 V1.1 内容重复登记为 V1.2 变化', () => {
    expect(VERSION_CHANGES).toEqual([]);
  });

  it('页面标识隐藏删除项并只显示当前页面变化', () => {
    const changes: VersionChange[] = [
      {
        id: 'change-1', requirementId: 'AGF-TEST-001', title: '测试调整', type: '调整',
        before: '调整前', after: '调整后', pageId: 'game-list', pageName: '游戏管理',
        targetAnnotationId: 'game-list-table', acceptance: '页面显示调整结果', status: '已实现',
      },
      {
        id: 'change-2', requirementId: 'AGF-TEST-002', title: '测试删除', type: '删除',
        before: '原内容', after: '删除', pageId: 'game-list', pageName: '游戏管理',
        acceptance: '页面不再显示原内容', status: '已实现',
      },
    ];
    expect(getVisiblePageChanges(changes, 'game-list').map((item) => item.id)).toEqual(['change-1']);
    expect(getVisiblePageChanges(changes, 'vendor-list')).toEqual([]);
  });

  it('支持四种约定的变更类型', () => {
    expect(VERSION_CHANGE_TYPES).toEqual(['新增', '调整', '规则变化', '删除']);
  });
});
