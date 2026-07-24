import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Inbox, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export default function DataTable({
  columns = [],
  data = [],
  isLoading = false,
  emptyMessage = 'No records found',
  pageSize = 10,
  className = ''
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumnKey, setSortColumnKey] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  const handleSort = (columnKey) => {
    if (sortColumnKey === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumnKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumnKey(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortColumnKey) return data;
    const sorted = [...data].sort((a, b) => {
      let valA = a[sortColumnKey];
      let valB = b[sortColumnKey];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();

      if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [data, sortColumnKey, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className={`w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm text-slate-900 dark:text-[#F1F1F1] border-collapse">
          <thead className="bg-[#0B101D] dark:bg-[#0B101D] text-[#94A3B8] font-bold text-xs uppercase tracking-wider border-b border-slate-800 select-none">
            <tr>
              {columns.map((col, idx) => {
                const isSorted = sortColumnKey && (col.accessor === sortColumnKey || col.key === sortColumnKey);
                const sortable = col.sortable !== false && (col.accessor || col.key);
                const colKey = col.accessor || col.key;

                return (
                  <th
                    key={idx}
                    onClick={() => sortable && handleSort(colKey)}
                    className={`px-4 py-3.5 ${col.className || ''} ${sortable ? 'cursor-pointer hover:text-white transition-colors' : ''}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {sortable && (
                        <span className="text-slate-500">
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[#E74C3C]" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-[#E74C3C]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-[#2D3138]">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-4 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-[#2D3138] rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500 dark:text-[#9CA3AF]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                    <p className="text-sm font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rIdx) => (
                <tr key={row.id || rIdx} className="hover:bg-slate-50 dark:hover:bg-[#121417]/60 transition-colors">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className={`px-4 py-3.5 ${col.className || ''}`}>
                      {col.render ? col.render(row, rIdx) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-[#2D3138] bg-[#FAFAF8] dark:bg-[#121417] text-xs text-slate-500 dark:text-[#9CA3AF]">
          <span>
            Showing <strong className="text-slate-900 dark:text-[#F1F1F1]">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-slate-900 dark:text-[#F1F1F1]">{Math.min(currentPage * pageSize, sortedData.length)}</strong> of{' '}
            <strong className="text-slate-900 dark:text-[#F1F1F1]">{sortedData.length}</strong> results
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#2D3138] hover:bg-slate-100 dark:hover:bg-[#1E2126] text-slate-700 dark:text-[#F1F1F1] disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-900 dark:text-[#F1F1F1] px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#2D3138] hover:bg-slate-100 dark:hover:bg-[#1E2126] text-slate-700 dark:text-[#F1F1F1] disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
