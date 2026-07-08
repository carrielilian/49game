import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ColumnFilterConfig {
  type: 'select' | 'text';
  value: string;
  onChange: (value: string) => void;
  options?: { label: string; value: string }[];
  placeholder?: string;
}

export function ColumnFilter({ title, filter }: { title: string; filter: ColumnFilterConfig }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const active = filter.value !== '';
  const selectOptions = filter.type === 'select'
    ? [{ label: '全部', value: '' }, ...(filter.options ?? [])]
    : [];

  return (
    <div className="agf-col-filter" ref={ref}>
      <button
        type="button"
        className={`agf-col-filter__trigger${active ? ' agf-col-filter__trigger--active' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span>{title}</span>
        <ChevronDown size={12} className={`agf-col-filter__icon${open ? ' agf-col-filter__icon--open' : ''}`} />
      </button>
      {open && (
        <div className="agf-col-filter__menu">
          {filter.type === 'select' ? (
            selectOptions.map((opt) => (
              <button
                key={opt.value || '__all__'}
                type="button"
                className={`agf-col-filter__item${filter.value === opt.value ? ' agf-col-filter__item--active' : ''}`}
                onClick={() => { filter.onChange(opt.value); setOpen(false); }}
              >
                {opt.label}
              </button>
            ))
          ) : (
            <div className="agf-col-filter__search">
              <input
                className="agf-col-filter__input"
                placeholder={filter.placeholder ?? '请输入'}
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
