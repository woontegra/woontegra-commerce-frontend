import React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Column<T> {
  key:       string;
  header:    React.ReactNode;
  cell:      (row: T, index: number) => React.ReactNode;
  width?:    string;
  align?:    'left' | 'center' | 'right';
  sortable?: boolean;
}

interface TableProps<T> {
  data:          T[];
  columns:       Column<T>[];
  keyExtractor:  (row: T) => string;
  loading?:      boolean;
  emptyState?:   React.ReactNode;
  onRowClick?:   (row: T) => void;
  stickyHeader?: boolean;
  className?:    string;
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3.5">
              <div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Table component ──────────────────────────────────────────────────────────

export function Table<T>({
  data,
  columns,
  keyExtractor,
  loading      = false,
  emptyState,
  onRowClick,
  className    = '',
}: TableProps<T>) {
  const align: Record<string, string> = {
    left:   'text-left',
    center: 'text-center',
    right:  'text-right',
  };

  return (
    <div className={`overflow-x-auto rounded-xl ${className}`}>
      <table className="wn-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={`${align[col.align ?? 'left']}`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows cols={columns.length} />
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {emptyState ?? (
                  <div className="empty-state py-16">
                    <div className="empty-state-icon">📋</div>
                    <p className="empty-state-title">Veri bulunamadı</p>
                    <p className="empty-state-desc">Gösterilecek kayıt yok.</p>
                  </div>
                )}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={keyExtractor(row)}
                className={onRowClick ? 'cursor-pointer' : ''}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map(col => (
                  <td key={col.key} className={align[col.align ?? 'left']}>
                    {col.cell(row, i)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page:       number;
  totalPages: number;
  total:      number;
  limit:      number;
  onChange:   (page: number) => void;
}

export function Pagination({ page, totalPages, total, limit, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-4 py-4 border-t border-white/[0.06]">
      <p className="text-xs text-slate-500">
        {from}–{to} / {total} kayıt
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="btn-icon btn disabled:opacity-30"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p = i + 1;
          if (totalPages > 5) {
            if (page <= 3) p = i + 1;
            else if (page >= totalPages - 2) p = totalPages - 4 + i;
            else p = page - 2 + i;
          }
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-all duration-150 ${
                p === page
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="btn-icon btn disabled:opacity-30"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default Table;
