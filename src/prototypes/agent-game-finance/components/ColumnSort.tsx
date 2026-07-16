import React from 'react';

export interface ColumnSortConfig {
  active: boolean;
  order: 'asc' | 'desc';
  onToggle: () => void;
}

function SortIcon({ direction, active }: { direction: 'up' | 'down'; active: boolean }) {
  const isUp = direction === 'up';
  return (
    <svg
      className={`agf-col-sort__icon agf-col-sort__icon--${direction}${active ? ' agf-col-sort__icon--on' : ''}`}
      viewBox="0 0 8 5"
      aria-hidden="true"
    >
      {isUp ? (
        <path d="M4 0 L8 5 H0 Z" />
      ) : (
        <path d="M0 0 H8 L4 5 Z" />
      )}
    </svg>
  );
}

export function ColumnSort({ title, sort }: { title: string; sort: ColumnSortConfig }) {
  return (
    <button
      type="button"
      className={`agf-col-sort__trigger${sort.active ? ' agf-col-sort__trigger--active' : ''}`}
      onClick={sort.onToggle}
    >
      <span>{title}</span>
      <span className="agf-col-sort__icons">
        <SortIcon direction="up" active={sort.active && sort.order === 'asc'} />
        <SortIcon direction="down" active={sort.active && sort.order === 'desc'} />
      </span>
    </button>
  );
}
