import React from 'react';
import { BusinessTypeSelect } from './BusinessTypeSelect';

interface FilterBarProps {
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

export function FilterBar({ children, actions }: FilterBarProps) {
  if (!children && !actions) return null;
  return (
    <div className="agf-list-toolbar">
      <div className="agf-list-toolbar__fields">
        <BusinessTypeSelect />
        {children}
      </div>
      {actions ? <div className="agf-list-toolbar__actions">{actions}</div> : null}
    </div>
  );
}
