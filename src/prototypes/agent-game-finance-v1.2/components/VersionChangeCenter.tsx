import React from 'react';
import { Drawer } from './Modal';
import type { VersionChange, VersionChangeType } from '../content/versionChanges';

const TYPE_CLASS: Record<VersionChangeType, string> = {
  新增: 'is-add',
  调整: 'is-adjust',
  规则变化: 'is-rule',
  删除: 'is-delete',
};

export function VersionChangeTypeBadge({ type }: { type: VersionChangeType }) {
  return <span className={`agf-change-type ${TYPE_CLASS[type]}`}>{type}</span>;
}

interface VersionChangeCenterProps {
  open: boolean;
  changes: VersionChange[];
  onClose: () => void;
  onNavigate: (pageId: string) => void;
  focusedChangeId?: string;
}

export function VersionChangeCenter({ open, changes, onClose, onNavigate, focusedChangeId }: VersionChangeCenterProps) {
  const orderedChanges = focusedChangeId
    ? [...changes].sort((left, right) => Number(right.id === focusedChangeId) - Number(left.id === focusedChangeId))
    : changes;
  return (
    <Drawer title="V1.2 版本变更" open={open} onClose={onClose} width={760}>
      <div className="agf-change-center__summary">
        <strong>V1.2｜基于 V1.1</strong>
        <span>这里只展示 V1.2 相对 V1.1 的变化，不重复展示既有功能。</span>
      </div>
      {changes.length === 0 ? (
        <div className="agf-change-center__empty">
          <strong>暂无相对 V1.1 的业务变更</strong>
          <span>收到并确认 V1.2 新需求后，需求编号、前后规则、影响页面和验收标准会显示在这里。</span>
        </div>
      ) : (
        <div className="agf-change-center__list">
          {orderedChanges.map((change) => (
            <article key={change.id} className={`agf-change-card${change.id === focusedChangeId ? ' is-focused' : ''}`}>
              <div className="agf-change-card__header">
                <div>
                  <VersionChangeTypeBadge type={change.type} />
                  <strong>{change.title}</strong>
                </div>
                <span className="agf-change-card__status">{change.status}</span>
              </div>
              <dl className="agf-change-card__detail">
                <div><dt>需求编号</dt><dd>{change.requirementId}</dd></div>
                <div><dt>调整前规则</dt><dd>{change.before}</dd></div>
                <div><dt>调整后规则</dt><dd>{change.after}</dd></div>
                <div><dt>影响页面</dt><dd>{change.pageName}</dd></div>
                <div><dt>验收标准</dt><dd>{change.acceptance}</dd></div>
              </dl>
              {change.type !== '删除' && (
                <button
                  type="button"
                  className="agf-btn agf-btn--primary agf-change-card__link"
                  onClick={() => { onNavigate(change.pageId); onClose(); }}
                >
                  查看对应页面
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </Drawer>
  );
}
