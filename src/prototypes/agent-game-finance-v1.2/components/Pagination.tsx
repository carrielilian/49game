import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100, 200] as const;

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

function buildPageItems(current: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, 6, 'ellipsis', totalPages];
  }
  if (current >= totalPages - 3) {
    return [1, 'ellipsis', totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', totalPages];
}

export function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange }: PaginationProps) {
  const [sizeOpen, setSizeOpen] = useState(false);
  const sizeRef = useRef<HTMLDivElement>(null);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = buildPageItems(safePage, totalPages);

  useEffect(() => {
    if (!sizeOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (sizeRef.current && !sizeRef.current.contains(e.target as Node)) setSizeOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [sizeOpen]);

  return (
    <div className="agf-pagination">
      <span className="agf-pagination__total">共 {total} 条</span>
      <div className="agf-pagination__size" ref={sizeRef}>
        <button
          type="button"
          className={`agf-pagination__size-trigger${sizeOpen ? ' agf-pagination__size-trigger--open' : ''}`}
          onClick={() => setSizeOpen((v) => !v)}
        >
          <span>{pageSize}条/页</span>
          <ChevronDown size={14} className="agf-pagination__size-icon" />
        </button>
        {sizeOpen && (
          <div className="agf-pagination__size-menu">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                type="button"
                className={`agf-pagination__size-item${size === pageSize ? ' agf-pagination__size-item--active' : ''}`}
                onClick={() => {
                  onPageSizeChange(size);
                  setSizeOpen(false);
                }}
              >
                {size}条/页
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="agf-pagination__nav">
        <button
          type="button"
          className="agf-pagination__btn agf-pagination__btn--arrow"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="上一页"
        >
          <ChevronLeft size={14} />
        </button>
        {pageItems.map((item, i) => (
          item === 'ellipsis' ? (
            <span key={`ellipsis-${i}`} className="agf-pagination__ellipsis">…</span>
          ) : (
            <button
              key={item}
              type="button"
              className={`agf-pagination__btn${item === safePage ? ' agf-pagination__btn--active' : ''}`}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          )
        ))}
        <button
          type="button"
          className="agf-pagination__btn agf-pagination__btn--arrow"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="下一页"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
