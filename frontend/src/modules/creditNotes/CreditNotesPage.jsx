import React, { useState, useEffect } from 'react';
import SearchBar from '../../components/ui/SearchBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import StatCard from '../../components/ui/StatCard';
import { apiRequest } from '../../services/api';
import { formatCurrency, formatDate } from '../../services/calcService';
import { FileMinus2, Plus, Search } from 'lucide-react';

const RESTOCK_BUCKETS = [
  { value: 'saleable', label: 'Saleable' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'display', label: 'Display' },
  { value: 'scrap', label: 'Scrap' }
];

export default function CreditNotesPage() {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState('');
  const [reason, setReason] = useState('Sales return');
  const [restockBucket, setRestockBucket] = useState('saleable');
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest(`/credit-notes?search=${encodeURIComponent(search)}`);
      if (res.success) setNotes(res.credit_notes || []);
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.message || 'Failed to fetch credit notes' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [search]);

  const resetCreateForm = () => {
    setInvoiceId('');
    setReason('Sales return');
    setRestockBucket('saleable');
    setInvoice(null);
    setItems([]);
  };

  const handleLookupInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceId.trim()) return;
    setIsLookingUp(true);
    try {
      const res = await apiRequest(`/invoices/${encodeURIComponent(invoiceId.trim())}`);
      if (res.success && res.invoice) {
        setInvoice(res.invoice);
        setItems(
          (res.invoice.items || []).map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            hsn_sac: item.hsn_sac || '',
            max_qty: item.quantity,
            quantity: item.quantity,
            unit_price: item.unit_price,
            gst_percent: item.gst_percent || 0,
            selected: true
          }))
        );
        setToast({ isOpen: true, type: 'success', message: `Loaded ${res.invoice.invoice_number}` });
      }
    } catch (err) {
      setInvoice(null);
      setItems([]);
      setToast({ isOpen: true, type: 'danger', message: err.message || 'Invoice not found' });
    } finally {
      setIsLookingUp(false);
    }
  };

  const updateItemQty = (index, qty) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const nextQty = Math.max(0, Math.min(item.max_qty, Number.parseFloat(qty) || 0));
        return { ...item, quantity: nextQty };
      })
    );
  };

  const toggleItem = (index) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!invoice) {
      setToast({ isOpen: true, type: 'warning', message: 'Lookup an invoice first' });
      return;
    }
    const selectedItems = items
      .filter((item) => item.selected && item.quantity > 0)
      .map(({ product_id, product_name, hsn_sac, quantity, unit_price, gst_percent }) => ({
        product_id,
        product_name,
        hsn_sac,
        quantity,
        unit_price,
        gst_percent
      }));

    if (!selectedItems.length) {
      setToast({ isOpen: true, type: 'warning', message: 'Select at least one item with quantity' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiRequest('/credit-notes', 'POST', {
        invoice_id: invoice.id,
        reason,
        restock_bucket: restockBucket,
        customer_name: invoice.customer_name,
        customer_gstin: invoice.customer_gstin,
        items: selectedItems
      });
      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: res.message || 'Credit note issued' });
        setIsModalOpen(false);
        resetCreateForm();
        fetchNotes();
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'danger', message: err.message || 'Failed to create credit note' });
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { header: 'Credit Note', accessor: 'credit_note_number' },
    {
      header: 'Date',
      render: (row) => formatDate(row.created_at)
    },
    { header: 'Customer', accessor: 'customer_name' },
    { header: 'Reason', accessor: 'reason' },
    {
      header: 'Amount',
      render: (row) => (
        <span className="font-extrabold text-[#C0392B] dark:text-[#E74C3C]">
          {formatCurrency(row.grand_total)}
        </span>
      )
    }
  ];

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
            <FileMinus2 className="w-5 h-5 text-[#C0392B] dark:text-[#E74C3C]" /> Credit Notes
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">Issue credit notes against invoices and restock returned stock</p>
        </div>
        <Button
          onClick={() => {
            resetCreateForm();
            setIsModalOpen(true);
          }}
          variant="primary"
          icon={Plus}
        >
          New Credit Note
        </Button>
      </div>

      <StatCard title="Credit Notes" value={notes.length} icon={FileMinus2} subtitle="Issued notes" color="amber" />

      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <SearchBar
          value={search}
          onChange={setSearch}
          onClear={() => setSearch('')}
          placeholder="Search credit note or customer..."
        />
      </div>

      <DataTable columns={columns} data={notes} isLoading={isLoading} emptyMessage="No credit notes yet" />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Credit Note"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="Invoice ID / Number *"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                placeholder="e.g. INV/25-26/0001 or numeric id"
              />
            </div>
            <Button type="button" variant="secondary" icon={Search} isLoading={isLookingUp} onClick={handleLookupInvoice}>
              Lookup
            </Button>
          </div>

          {invoice && (
            <div className="p-3 rounded-xl border border-slate-200 dark:border-[#2D3138] bg-slate-50 dark:bg-[#121417] text-xs space-y-1">
              <p className="flex justify-between">
                <span className="text-slate-500">Invoice</span>
                <span className="font-bold text-slate-900 dark:text-[#F1F1F1]">{invoice.invoice_number}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">Customer</span>
                <span className="font-semibold">{invoice.customer_name || 'Walk-in'}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">Grand Total</span>
                <span className="font-extrabold text-[#C0392B] dark:text-[#E74C3C]">{formatCurrency(invoice.grand_total)}</span>
              </p>
            </div>
          )}

          <Input label="Reason *" value={reason} onChange={(e) => setReason(e.target.value)} required />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF] mb-1">
              Restock Bucket
            </label>
            <select
              value={restockBucket}
              onChange={(e) => setRestockBucket(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1]"
            >
              {RESTOCK_BUCKETS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          {items.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#9CA3AF]">Items to credit</p>
              <div className="max-h-56 overflow-y-auto space-y-2">
                {items.map((item, index) => (
                  <div
                    key={`${item.product_id}-${index}`}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-[#2D3138]"
                  >
                    <input type="checkbox" checked={item.selected} onChange={() => toggleItem(index)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-[#F1F1F1] truncate">{item.product_name}</p>
                      <p className="text-[11px] text-slate-500">Max {item.max_qty} · {formatCurrency(item.unit_price)}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={item.max_qty}
                      value={item.quantity}
                      onChange={(e) => updateItemQty(index, e.target.value)}
                      className="w-20 p-2 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-lg text-xs text-slate-900 dark:text-[#F1F1F1]"
                      disabled={!item.selected}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#2D3138]">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isSaving} isDisabled={!invoice}>
              Issue Credit Note
            </Button>
          </div>
        </form>
      </Modal>

      <Toast
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
}
