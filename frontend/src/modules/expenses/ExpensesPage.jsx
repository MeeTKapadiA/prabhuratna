import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import StatCard from '../../components/ui/StatCard';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import TableActionsMenu from '../../components/ui/TableActionsMenu';
import { apiRequest } from '../../services/api';
import {formatCurrency, formatDate, todayLocalDate} from '../../services/calcService';
import { Receipt, Plus, Trash2, IndianRupee } from 'lucide-react';

const CATEGORIES = ['Rent', 'Salary', 'Transport', 'Utilities', 'Maintenance', 'Marketing', 'Misc'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Misc',
    description: '',
    amount: '',
    payment_mode: 'CASH',
    expense_date: todayLocalDate()
  });
  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      let query = '/expenses?';
      if (category) query += `category=${encodeURIComponent(category)}&`;
      if (startDate) query += `startDate=${startDate}&`;
      if (endDate) query += `endDate=${endDate}&`;
      const res = await apiRequest(query);
      if (res.success) {
        setExpenses(res.expenses || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.message || 'Failed to fetch expenses' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [category, startDate, endDate]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/expenses', 'POST', formData);
      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: 'Expense recorded' });
        setIsModalOpen(false);
        setFormData({
          category: 'Misc',
          description: '',
          amount: '',
          payment_mode: 'CASH',
          expense_date: todayLocalDate()
        });
        fetchExpenses();
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'danger', message: err.message || 'Failed to create expense' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await apiRequest(`/expenses/${deleteTarget.id}`, 'DELETE');
      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: 'Expense deleted' });
        setDeleteTarget(null);
        fetchExpenses();
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'danger', message: err.message || 'Failed to delete expense' });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Actions',
      className: 'w-16 text-center',
      render: (row) => (
        <TableActionsMenu
          actions={[
            {
              label: 'Delete Expense',
              icon: Trash2,
              variant: 'danger',
              onClick: () => setDeleteTarget(row)
            }
          ]}
        />
      )
    },
    {
      header: 'Date',
      render: (row) => formatDate(row.expense_date)
    },
    {
      header: 'Category',
      render: (row) => <Badge variant="info">{row.category}</Badge>
    },
    { header: 'Description', accessor: 'description' },
    {
      header: 'Payment',
      render: (row) => <Badge variant="neutral">{row.payment_mode}</Badge>
    },
    {
      header: 'Amount',
      render: (row) => (
        <span className="font-extrabold text-[#C0392B] dark:text-[#E74C3C]">{formatCurrency(row.amount)}</span>
      )
    }
  ];

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#C0392B] dark:text-[#E74C3C]" /> Store Expenses
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">Track rent, salary, utilities and other operating costs</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="primary"
          icon={Plus}
        >
          Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Expense Entries" value={expenses.length} icon={Receipt} subtitle="Matching filters" color="amber" />
        <StatCard title="Total Amount" value={formatCurrency(total)} icon={IndianRupee} subtitle="Filtered period" color="rose" />
      </div>

      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] grid grid-cols-1 sm:grid-cols-4 gap-4 shadow-sm">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF] mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1]"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <div className="flex items-end">
          <Button variant="ghost" fullWidth onClick={() => { setCategory(''); setStartDate(''); setEndDate(''); }}>
            Reset Filters
          </Button>
        </div>
      </div>

      <DataTable columns={columns} data={expenses} isLoading={isLoading} emptyMessage="No expenses recorded" />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Expense" maxWidth="max-w-md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF] mb-1">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1]"
              required
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input
            label="Amount (₹) *"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
          />
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF] mb-1">Payment Mode</label>
              <select
                value={formData.payment_mode}
                onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                className="w-full p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1]"
              >
                <option value="CASH">CASH</option>
                <option value="UPI">UPI</option>
                <option value="CARD">CARD</option>
              </select>
            </div>
            <Input
              label="Expense Date"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#2D3138]">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Expense</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message={`Delete this ${deleteTarget?.category || ''} expense of ${formatCurrency(deleteTarget?.amount || 0)}?`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
      />

      <Toast
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
}
