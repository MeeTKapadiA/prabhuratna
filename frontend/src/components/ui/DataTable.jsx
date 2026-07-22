import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export default function DataTable({
  columns = [],
  data = [],
  isLoading = false,
  emptyMessage = 'No records found',
  pageSize = 10
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="w-full glass-panel rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-900 dark:text-[#F1F1F1]">
          <thead className="bg-[#FAFAF8] dark:bg-[#121417] text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#9CA3AF] border-b border-slate-200 dark:border-[#2D3138]">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`px-5 py-3.5 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-[#2D3138]">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-5 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-[#2D3138] rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-slate-500 dark:text-[#9CA3AF]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                    <p className="text-sm font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rIdx) => (
                <tr key={row.id || rIdx} className="hover:bg-slate-50 dark:hover:bg-[#121417]/50 transition-colors">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className={`px-5 py-4 ${col.className || ''}`}>
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
            <strong className="text-slate-900 dark:text-[#F1F1F1]">{Math.min(currentPage * pageSize, data.length)}</strong> of{' '}
            <strong className="text-slate-900 dark:text-[#F1F1F1]">{data.length}</strong> results
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#2D3138] hover:bg-slate-100 dark:hover:bg-[#1E2126] text-slate-700 dark:text-[#F1F1F1] disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-900 dark:text-[#F1F1F1] px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#2D3138] hover:bg-slate-100 dark:hover:bg-[#1E2126] text-slate-700 dark:text-[#F1F1F1] disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
