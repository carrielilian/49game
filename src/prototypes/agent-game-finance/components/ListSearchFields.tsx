import React from 'react';
import type { ListSearchMode, ListSearchQuery } from '../utils/listKeyword';
import { SEARCH_FIELD_PLACEHOLDER } from '../utils/listKeyword';

interface ListSearchFieldsProps {
  mode: ListSearchMode;
  value: ListSearchQuery;
  onChange: (value: ListSearchQuery) => void;
  /** 游戏管理：额外展示「合同游戏名称」搜索 */
  showContractName?: boolean;
  /** 与厂商相关搜索同显时，隐藏「厂商ID」输入（如游戏收入管理页） */
  hideVendorId?: boolean;
}

export function ListSearchFields({ mode, value, onChange, showContractName, hideVendorId }: ListSearchFieldsProps) {
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
      {showContractName && (
        <input
          className="agf-input"
          placeholder={SEARCH_FIELD_PLACEHOLDER.contractName}
          value={value.contractName ?? ''}
          onChange={(e) => patch('contractName', e.target.value)}
        />
      )}
      {(mode === 'vendor' || mode === 'gameAndVendor') && (
        <>
          {!hideVendorId && (
            <input
              className="agf-input"
              placeholder={SEARCH_FIELD_PLACEHOLDER.vendorId}
              value={value.vendorId ?? ''}
              onChange={(e) => patch('vendorId', e.target.value)}
            />
          )}
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
