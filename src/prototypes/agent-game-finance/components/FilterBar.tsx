import React from 'react';

interface FilterBarProps {
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

export function FilterBar({ children, actions }: FilterBarProps) {
  if (!children && !actions) return null;
  return (
    <div className="agf-list-toolbar">
      {children ? <div className="agf-list-toolbar__fields">{children}</div> : null}
      {actions ? <div className="agf-list-toolbar__actions">{actions}</div> : null}
    </div>
  );
}
