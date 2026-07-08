import React from 'react';
import { ColumnFilter, type ColumnFilterConfig } from './ColumnFilter';

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
            data.map((row, i) => (
              <tr key={rowKey(row)}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row, i) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="agf-pagination">共 {data.length} 条</div>
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
