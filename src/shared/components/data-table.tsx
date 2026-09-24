import type { ReactNode } from 'react';

import { EmptyState } from '@/shared/components/panel';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Hidden below the `sm` breakpoint — the dashboard has to work on a phone. */
  secondary?: boolean;
  align?: 'left' | 'right';
};

type DataTableProps<T> = {
  rows: T[];
  columns: Array<Column<T>>;
  rowKey: (row: T) => string;
  emptyTitle: string;
  emptyDescription?: string;
};

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  emptyTitle,
  emptyDescription,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-lg border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={[
                  'px-2 py-2 text-caption font-medium tracking-wide text-ink-subtle uppercase first:pl-0 last:pr-0',
                  column.align === 'right' ? 'text-right' : '',
                  column.secondary ? 'hidden sm:table-cell' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-line/60 last:border-b-0">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={[
                    'px-2 py-3 align-middle text-body-sm first:pl-0 last:pr-0',
                    column.align === 'right' ? 'text-right' : '',
                    column.secondary ? 'hidden sm:table-cell' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
