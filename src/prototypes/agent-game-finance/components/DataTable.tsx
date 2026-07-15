import React, { useEffect, useRef, useState } from 'react';
import { ColumnFilter, type ColumnFilterConfig } from './ColumnFilter';
import { DEFAULT_PAGE_SIZE, Pagination } from './Pagination';

export interface Column<T> {
  key: string;
  title: string;
  render?: (row: T, index: number) => React.ReactNode;
  width?: string;
  filter?: ColumnFilterConfig;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyText?: string;
}

function TableEmptyState({ text }: { text: string }) {
  return (
    <div className="agf-table-empty">
      <svg className="agf-table-empty__icon" viewBox="0 0 120 100" fill="none" aria-hidden>
        <path d="M18 38 L60 18 L102 38 L102 72 L60 92 L18 72 Z" fill="#EEF2FC" stroke="#C5D3F0" strokeWidth="1.5" />
        <path d="M18 38 L60 58 L102 38" stroke="#C5D3F0" strokeWidth="1.5" />
        <path d="M60 58 L60 92" stroke="#C5D3F0" strokeWidth="1.5" />
        <path d="M34 46 L34 66 L46 72 L46 52 Z" fill="#DCE6FA" stroke="#C5D3F0" strokeWidth="1.2" />
        <path d="M86 46 L86 66 L74 72 L74 52 Z" fill="#DCE6FA" stroke="#C5D3F0" strokeWidth="1.2" />
        <path d="M44 28 L76 28 L82 34 L38 34 Z" fill="#F5F8FE" stroke="#C5D3F0" strokeWidth="1.2" />
      </svg>
      <span className="agf-table-empty__text">{text}</span>
    </div>
  );
}

export function DataTable<T>({ columns, data, rowKey, emptyText = '暂无数据' }: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const prevLengthRef = useRef(data.length);

  useEffect(() => {
    if (data.length !== prevLengthRef.current) {
      setPage(1);
      prevLengthRef.current = data.length;
    }
  }, [data.length]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedData = data.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="agf-table-panel">
      <div className="agf-table-wrap">
        <table className="agf-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                  {col.filter ? <ColumnFilter title={col.title} filter={col.filter} /> : col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr className="agf-table__empty-row">
                <td colSpan={columns.length} className="agf-table__empty">
                  <TableEmptyState text={emptyText} />
                </td>
              </tr>
            ) : (
              pagedData.map((row, i) => (
                <tr key={rowKey(row)}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row, (safePage - 1) * pageSize + i) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        total={data.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}

/** 列表「游戏ID / 游戏名称」：单行 `ID / 名称` */
export function DualCell({ main, sub }: { main: string; sub: string }) {
  return <span>{sub} / {main}</span>;
}
