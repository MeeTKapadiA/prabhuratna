import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import DataTable from '../../components/ui/DataTable';
import Toast from '../../components/ui/Toast';
import StatCard from '../../components/ui/StatCard';
import { apiRequest } from '../../services/api';
import {formatCurrency, todayLocalDate} from '../../services/calcService';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Save, Banknote, CreditCard, Smartphone, Wallet, Receipt } from 'lucide-react';

export default function CashbookPage() {
  const { isAdmin } = useAuth();
  const [date, setDate] = useState(todayLocalDate());
  const [openingCash, setOpeningCash] = useState('0');
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [live, setLive] = useState({
    cash_sales: 0,
    upi_sales: 0,
    card_sales: 0,
    credit_sales: 0,
    cash_expenses: 0
  });
  const [aging, setAging] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  const fetchCashbook = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest(`/cashbook?date=${date}`);
      if (res.success) {
        const entry = res.cashbook || {};
        const liveData = res.live || entry.live || {};
        setOpeningCash(String(entry.opening_cash ?? 0));
        setClosingCash(entry.closing_cash === null || entry.closing_cash === undefined ? '' : String(entry.closing_cash));
        setNotes(entry.notes || '');
        setLive({
          cash_sales: liveData.cash_sales ?? entry.cash_sales ?? 0,
          upi_sales: liveData.upi_sales ?? entry.upi_sales ?? 0,
          card_sales: liveData.card_sales ?? entry.card_sales ?? 0,
          credit_sales: liveData.credit_sales ?? entry.credit_sales ?? 0,
          cash_expenses: liveData.cash_expenses ?? entry.cash_expenses ?? 0
        });
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.message || 'Failed to load cashbook' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAging = async () => {
    if (!isAdmin) return;
    try {
      const res = await apiRequest('/cashbook/supplier-aging');
      if (res.success) setAging(res.aging || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCashbook();
  }, [date]);

  useEffect(() => {
    fetchAging();
  }, [isAdmin]);

  const expectedClosing =
    (Number.parseFloat(openingCash) || 0) +
    (Number(live.cash_sales) || 0) -
    (Number(live.cash_expenses) || 0);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiRequest('/cashbook', 'POST', {
        entry_date: date,
        opening_cash: openingCash,
        closing_cash: closingCash === '' ? null : closingCash,
        notes
      });
      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: 'Cashbook saved' });
        fetchCashbook();
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'danger', message: err.message || 'Failed to save cashbook' });
    } finally {
      setIsSaving(false);
    }
  };

  const agingColumns = [
    { header: 'Supplier', accessor: 'name' },
    {
      header: 'Balance',
      render: (row) => (
        <span className="font-extrabold text-[#C0392B] dark:text-[#E74C3C]">
          {formatCurrency(row.current_balance)}
        </span>
      )
    },
    { header: '0-30', render: (row) => formatCurrency(row.due_0_30) },
    { header: '31-60', render: (row) => formatCurrency(row.due_31_60) },
    { header: '61-90', render: (row) => formatCurrency(row.due_61_90) },
    { header: '90+', render: (row) => formatCurrency(row.due_90_plus) }
  ];

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#C0392B] dark:text-[#E74C3C]" /> Daily Cashbook
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">Opening cash, live sales mix, and day close</p>
        </div>
        <div className="w-full sm:w-48">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Cash Sales" value={formatCurrency(live.cash_sales)} icon={Banknote} color="emerald" subtitle="Live" />
        <StatCard title="UPI Sales" value={formatCurrency(live.upi_sales)} icon={Smartphone} color="sky" subtitle="Live" />
        <StatCard title="Card Sales" value={formatCurrency(live.card_sales)} icon={CreditCard} color="purple" subtitle="Live" />
        <StatCard title="Credit Sales" value={formatCurrency(live.credit_sales)} icon={Wallet} color="amber" subtitle="Live" />
        <StatCard title="Cash Expenses" value={formatCurrency(live.cash_expenses)} icon={Receipt} color="rose" subtitle="Live" />
      </div>

      <form
        onSubmit={handleSave}
        className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Opening Cash (₹)"
            type="number"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
          />
          <Input
            label="Closing Cash (₹)"
            type="number"
            value={closingCash}
            onChange={(e) => setClosingCash(e.target.value)}
            placeholder={String(expectedClosing.toFixed(2))}
          />
          <div className="p-3 rounded-xl border border-slate-200 dark:border-[#2D3138] bg-slate-50 dark:bg-[#121417]">
            <p className="text-xs font-bold uppercase text-slate-500 dark:text-[#9CA3AF]">Expected Closing</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-[#F1F1F1] mt-1">
              {isLoading ? '…' : formatCurrency(expectedClosing)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Opening + cash sales − cash expenses</p>
          </div>
        </div>
        <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Shift notes / variance reason" />
        <div className="flex justify-end">
          <Button type="submit" variant="primary" icon={Save} isLoading={isSaving}>Save Cashbook</Button>
        </div>
      </form>

      {isAdmin && (
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-[#F1F1F1]">
            Supplier Aging (Admin)
          </h3>
          <DataTable columns={agingColumns} data={aging} emptyMessage="No supplier dues" />
        </div>
      )}

      <Toast
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
}
