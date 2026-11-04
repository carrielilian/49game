import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ColumnFilterConfig {
  type: 'select' | 'text';
  value: string;
  onChange: (value: string) => void;
  options?: { label: string; value: string }[];
  placeholder?: string;
}

function FilterIcon() {
  return (
    <svg className="agf-col-filter__funnel" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M0 0h10L6.2 5.8V9H3.8V5.8L0 0z" />
    </svg>
  );
}

export function ColumnFilter({ title, filter }: { title: string; filter: ColumnFilterConfig }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 10,
      left: rect.left + rect.width / 2,
      transform: 'translateX(-50%)',
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onLayoutChange = () => updateMenuPosition();
    window.addEventListener('resize', onLayoutChange);
    window.addEventListener('scroll', onLayoutChange, true);
    return () => {
      window.removeEventListener('resize', onLayoutChange);
      window.removeEventListener('scroll', onLayoutChange, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const active = filter.value !== '';
  const selectOptions = filter.type === 'select'
    ? [{ label: '全部', value: '' }, ...(filter.options ?? [])]
    : [];

  const menu = open ? (
    <div ref={menuRef} className="agf-col-filter__menu" style={menuStyle}>
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
  ) : null;

  return (
    <div className="agf-col-filter" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`agf-col-filter__trigger${active ? ' agf-col-filter__trigger--active' : ''}${open ? ' agf-col-filter__trigger--open' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{title}</span>
        <FilterIcon />
      </button>
      {menu && createPortal(menu, document.body)}
    </div>
  );
}
