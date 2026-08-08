import React, { useState, useEffect } from 'react';
import SearchBar from '../../components/ui/SearchBar';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import { apiRequest } from '../../services/api';
import { formatDate } from '../../services/calcService';
import { Activity } from 'lucide-react';

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest(`/audit?search=${encodeURIComponent(search)}&limit=200`);
      if (res.success) setLogs(res.logs || []);
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.message || 'Failed to fetch audit logs' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search]);

  const columns = [
    {
      header: 'When',
      render: (row) => (
        <span className="text-xs text-slate-500 dark:text-[#9CA3AF]">
          {formatDate(row.created_at, true)}
        </span>
      )
    },
    {
      header: 'User',
      render: (row) => (
        <span className="font-semibold text-slate-900 dark:text-[#F1F1F1]">{row.username || '—'}</span>
      )
    },
    {
      header: 'Action',
      render: (row) => <Badge variant="info">{row.action}</Badge>
    },
    {
      header: 'Entity',
      render: (row) => (
        <span className="text-xs font-mono text-slate-600 dark:text-[#9CA3AF]">
          {row.entity_type || '—'}{row.entity_id != null ? ` #${row.entity_id}` : ''}
        </span>
      )
    },
    {
      header: 'Details',
      render: (row) => {
        let details = row.details;
        if (typeof details === 'string') {
          try { details = JSON.parse(details); } catch { /* keep string */ }
        }
        const text = typeof details === 'object' && details !== null
          ? JSON.stringify(details)
          : String(details || '—');
        return <span className="text-xs text-slate-600 dark:text-[#9CA3AF] break-all">{text}</span>;
      }
    }
  ];

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#C0392B] dark:text-[#E74C3C]" /> Activity / Audit Log
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">Admin trail of create, update, and delete actions</p>
        </div>
        <div className="w-full sm:w-80">
          <SearchBar
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Search user, action, entity..."
          />
        </div>
      </div>

      <DataTable columns={columns} data={logs} isLoading={isLoading} emptyMessage="No audit logs found" />

      <Toast
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
}
