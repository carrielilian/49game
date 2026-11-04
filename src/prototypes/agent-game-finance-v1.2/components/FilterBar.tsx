import React from 'react';
import { BusinessTypeSelect } from './BusinessTypeSelect';

interface FilterBarProps {
  children?: React.ReactNode;
  /** 查询栏同一行右侧区域（如导出） */
  aside?: React.ReactNode;
  actions?: React.ReactNode;
}

export function FilterBar({ children, aside, actions }: FilterBarProps) {
  if (!children && !aside && !actions) return null;
  return (
    <div className="agf-list-toolbar">
      <div className="agf-list-toolbar__row">
        <div className="agf-list-toolbar__fields">
          <BusinessTypeSelect />
          {children}
        </div>
        {aside ? <div className="agf-list-toolbar__aside">{aside}</div> : null}
      </div>
      {actions ? <div className="agf-list-toolbar__actions">{actions}</div> : null}
    </div>
  );
}
