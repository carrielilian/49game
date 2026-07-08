import React from 'react';
import type { ListSearchMode, ListSearchQuery } from '../utils/listKeyword';
import { SEARCH_FIELD_PLACEHOLDER } from '../utils/listKeyword';

interface ListSearchFieldsProps {
  mode: ListSearchMode;
  value: ListSearchQuery;
  onChange: (value: ListSearchQuery) => void;
}

export function ListSearchFields({ mode, value, onChange }: ListSearchFieldsProps) {
  const patch = (key: keyof ListSearchQuery, next: string) => onChange({ ...value, [key]: next });

  return (
    <>
      {(mode === 'game' || mode === 'gameAndVendor') && (
        <input
          className="agf-input"
          placeholder={SEARCH_FIELD_PLACEHOLDER.game}
          value={value.game ?? ''}
          onChange={(e) => patch('game', e.target.value)}
        />
      )}
      {(mode === 'vendor' || mode === 'gameAndVendor') && (
        <>
          <input
            className="agf-input"
            placeholder={SEARCH_FIELD_PLACEHOLDER.vendorId}
            value={value.vendorId ?? ''}
            onChange={(e) => patch('vendorId', e.target.value)}
          />
          <input
            className="agf-input"
            placeholder={SEARCH_FIELD_PLACEHOLDER.vendorName}
            value={value.vendorName ?? ''}
            onChange={(e) => patch('vendorName', e.target.value)}
          />
        </>
      )}
    </>
  );
}
