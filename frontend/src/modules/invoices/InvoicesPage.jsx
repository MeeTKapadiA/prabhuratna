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
import { formatCurrency } from '../../services/calcService';
import { generateInvoicePDF, printInvoicePDF } from '../../services/pdfService';
import { Receipt, Eye, Printer, Phone, Mail, FileSpreadsheet, Calendar, DollarSign, CreditCard } from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [paymentModeFilter, setPaymentModeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Detail Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      let query = `/billing/invoices?search=${encodeURIComponent(search)}`;
      if (paymentModeFilter) query += `&payment_mode=${paymentModeFilter}`;
      if (startDate) query += `&startDate=${startDate}`;
      if (endDate) query += `&endDate=${endDate}`;

      const res = await apiRequest(query);
      if (res.success) {
        setInvoices(res.invoices || []);
      }
    } catch (err) {
      console.error(err);
      setToast({ isOpen: true, type: 'danger', message: 'Failed to fetch customer invoices' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, paymentModeFilter, startDate, endDate]);

  const handleOpenDetailModal = async (invoiceId) => {
    try {
      const res = await apiRequest(`/billing/invoices/${invoiceId}`);
      if (res.success) {
        setSelectedInvoice(res.invoice);
        setIsModalOpen(true);
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'danger', message: 'Failed to fetch invoice details' });
    }
  };

  // KPI Calculations
  const totalInvoicesCount = invoices.length;
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
  const avgInvoiceValue = totalInvoicesCount > 0 ? totalRevenue / totalInvoicesCount : 0;

  const getPaymentBadge = (mode) => {
    if (!mode) return <Badge variant="secondary">Unknown</Badge>;
    const lower = mode.toLowerCase();
    if (lower.includes('cash')) return <Badge variant="success">Cash</Badge>;
    if (lower.includes('upi')) return <Badge variant="info">UPI</Badge>;
    if (lower.includes('card')) return <Badge variant="warning">Card</Badge>;
    return <Badge variant="primary">{mode}</Badge>;
  };

  const columns = [
    {
      header: 'Invoice Number',
      render: (row) => (
        <div>
          <span className="font-extrabold text-[#C0392B] dark:text-[#E74C3C]">{row.invoice_number}</span>
          <p className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString('en-IN')}</p>
        </div>
      )
    },
    {
      header: 'Customer Details',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-[#F1F1F1]">{row.customer_name || 'Walk-in Customer'}</p>
          {row.customer_phone && <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {row.customer_phone}</p>}
        </div>
      )
    },
    {
      header: 'Payment Mode',
      render: (row) => getPaymentBadge(row.payment_mode)
    },
    {
      header: 'Tax (GST)',
      render: (row) => formatCurrency(row.tax_amount || 0)
    },
    {
      header: 'Discount',
      render: (row) => formatCurrency(row.discount_amount || 0)
    },
    {
      header: 'Grand Total',
      render: (row) => <span className="font-extrabold text-sm text-slate-900 dark:text-[#F1F1F1]">{formatCurrency(row.grand_total)}</span>
    },
    {
      header: 'Actions',
      render: (row) => (
        <Button size="sm" variant="secondary" onClick={() => handleOpenDetailModal(row.id)} icon={Eye}>
          View Receipt
        </Button>
      )
    }
  ];

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#C0392B] dark:text-[#E74C3C]" /> Customer Invoices & Billing Records
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">Search and view all generated sales invoices, customer details, and reprint receipts</p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Invoices"
          value={totalInvoicesCount}
          icon={Receipt}
          subtitle="Generated Invoices"
        />
        <StatCard
          title="Total Revenue Collected"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          subtitle="Gross Sales Value"
        />
        <StatCard
          title="Average Invoice Value"
          value={formatCurrency(avgInvoiceValue)}
          icon={CreditCard}
          subtitle="Per Invoice Average"
        />
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] grid grid-cols-1 sm:grid-cols-4 gap-4 shadow-sm">
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by invoice #, customer name or phone..."
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-[#9CA3AF] mb-1">Payment Mode</label>
          <select
            value={paymentModeFilter}
            onChange={(e) => setPaymentModeFilter(e.target.value)}
            className="w-full p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1]"
          >
            <option value="">All Payment Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI / QR</option>
            <option value="Card">Credit / Debit Card</option>
            <option value="Net Banking">Net Banking</option>
          </select>
        </div>

        <Input
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <Input
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      {/* Invoices Table */}
      <DataTable
        columns={columns}
        data={invoices}
        isLoading={isLoading}
        emptyMessage="No customer invoices match the search criteria"
      />

      {/* Invoice Detail & Receipt Print Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Invoice Receipt: ${selectedInvoice.invoice_number}`}
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-[#121417] rounded-xl border border-slate-200 dark:border-[#2D3138] grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-500 font-bold uppercase">Customer Information</p>
                <p className="font-extrabold text-sm text-slate-900 dark:text-[#F1F1F1] mt-0.5">{selectedInvoice.customer_name || 'Walk-in Customer'}</p>
                {selectedInvoice.customer_phone && <p className="text-slate-500 mt-0.5">Phone: {selectedInvoice.customer_phone}</p>}
                {selectedInvoice.customer_email && <p className="text-slate-500">Email: {selectedInvoice.customer_email}</p>}
              </div>

              <div>
                <p className="text-slate-500 font-bold uppercase">Invoice Metadata</p>
                <p className="font-bold text-slate-900 dark:text-[#F1F1F1] mt-0.5">{selectedInvoice.invoice_number}</p>
                <p className="text-slate-500 mt-0.5">Date: {new Date(selectedInvoice.created_at).toLocaleString('en-IN')}</p>
                <p className="text-slate-500 mt-0.5">Payment Mode: {getPaymentBadge(selectedInvoice.payment_mode)}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF]">
                Purchased Items
              </h4>
              <div className="divide-y divide-slate-200 dark:divide-[#2D3138] border border-slate-200 dark:border-[#2D3138] rounded-xl overflow-hidden">
                {selectedInvoice.items?.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white dark:bg-[#1E2126] flex justify-between items-center text-xs">
                    <div>
                      <p className="font-extrabold text-slate-900 dark:text-[#F1F1F1]">{item.product_name}</p>
                      <p className="text-slate-500">{item.quantity} x {formatCurrency(item.unit_price)} (GST: {item.gst_percent}%)</p>
                    </div>
                    <span className="font-extrabold text-slate-900 dark:text-[#F1F1F1]">{formatCurrency(item.total_price)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-3 bg-slate-50 dark:bg-[#121417] rounded-xl border border-slate-200 dark:border-[#2D3138] space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-[#9CA3AF]">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-[#9CA3AF]">
                <span>GST Tax:</span>
                <span>{formatCurrency(selectedInvoice.tax_amount)}</span>
              </div>
              {selectedInvoice.discount_amount > 0 && (
                <div className="flex justify-between text-rose-500">
                  <span>Discount Applied:</span>
                  <span>- {formatCurrency(selectedInvoice.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-[#F1F1F1] pt-2 border-t border-slate-200 dark:border-[#2D3138]">
                <span>Grand Total Paid:</span>
                <span className="text-[#C0392B] dark:text-[#E74C3C]">{formatCurrency(selectedInvoice.grand_total)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <div className="flex gap-2">
                <Button onClick={() => printInvoicePDF(selectedInvoice)} variant="secondary" icon={Printer}>
                  Print Receipt
                </Button>
                <Button onClick={() => generateInvoicePDF(selectedInvoice)} variant="primary" icon={Printer}>
                  Download PDF
                </Button>
              </div>
              <Button onClick={() => setIsModalOpen(false)} variant="ghost">
                Close
              </Button>
            </div>
          </div>
        </Modal>
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
