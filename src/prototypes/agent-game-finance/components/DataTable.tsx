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
            <tr>
              <td colSpan={columns.length} className="agf-table__empty">{emptyText}</td>
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
      {data.length > 0 && (
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
      )}
    </div>
  );
}

export function DualCell({ main, sub }: { main: string; sub: string }) {
  return (
    <span>
      <span className="agf-cell-main">{main}</span>
      <span className="agf-cell-sub">{sub}</span>
    </span>
  );
}
