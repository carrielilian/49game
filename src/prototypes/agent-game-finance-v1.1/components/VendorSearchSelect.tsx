import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface VendorOption {
  id: string;
  name: string;
}

function formatVendorLabel(vendor: VendorOption): string {
  return `${vendor.id} - ${vendor.name}`;
}

function filterVendors(vendors: VendorOption[], query: string): VendorOption[] {
  const keyword = query.trim();
  if (!keyword) return vendors;
  return vendors.filter((v) => v.id.includes(keyword) || v.name.includes(keyword));
}

interface VendorSearchSelectProps {
  value: string;
  vendors: VendorOption[];
  onChange: (vendorId: string) => void;
  placeholder?: string;
}

export function VendorSearchSelect({
  value,
  vendors,
  onChange,
  placeholder = '请输入厂商ID或厂商名称',
}: VendorSearchSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const selected = useMemo(
    () => vendors.find((v) => v.id === value),
    [vendors, value],
  );

  const filtered = useMemo(() => filterVendors(vendors, query), [vendors, query]);

  const updateMenuPosition = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const rect = input.getBoundingClientRect();
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (open) return;
    setQuery(selected ? formatVendorLabel(selected) : '');
  }, [selected, open]);

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
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const selectVendor = (vendor: VendorOption) => {
    onChange(vendor.id);
    setQuery(formatVendorLabel(vendor));
    setOpen(false);
  };

  const menu = open ? (
    <div ref={menuRef} className="agf-search-select__menu" style={menuStyle} role="listbox">
      {filtered.length === 0 ? (
        <div className="agf-search-select__empty">无匹配厂商</div>
      ) : (
        filtered.map((vendor) => (
          <button
            key={vendor.id}
            type="button"
            role="option"
            aria-selected={vendor.id === value}
            className={`agf-search-select__option${vendor.id === value ? ' agf-search-select__option--active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => selectVendor(vendor)}
          >
            {formatVendorLabel(vendor)}
          </button>
        ))
      )}
    </div>
  ) : null;

  return (
    <div className="agf-search-select" ref={rootRef}>
      <input
        ref={inputRef}
        className="agf-form-input"
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);
          const exact = vendors.find((v) => formatVendorLabel(v) === next.trim());
          if (exact) {
            onChange(exact.id);
            return;
          }
          if (!next.trim()) onChange('');
        }}
      />
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
