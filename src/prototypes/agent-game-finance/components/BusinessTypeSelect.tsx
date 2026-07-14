import React from 'react';
import { useAppStore } from '../data/store';
import type { BusinessType } from '../data/types';
import { BUSINESS_TYPE_OPTIONS } from '../utils/businessScope';

export function BusinessTypeSelect() {
  const { businessType, setBusinessType } = useAppStore();

  return (
    <select
      className="agf-select agf-business-type-select"
      value={businessType}
      onChange={(e) => setBusinessType(e.target.value as BusinessType)}
      aria-label="业务类型"
    >
      {BUSINESS_TYPE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
