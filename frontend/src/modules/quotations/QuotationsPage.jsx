import React, { useState, useEffect } from 'react';
import SearchBar from '../../components/ui/SearchBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import { apiRequest } from '../../services/api';
import { calculateCartTotals, formatCurrency, formatDate } from '../../services/calcService';
import { generateQuotationPDF, printQuotationPDF } from '../../services/pdfService';
import { WhatsAppIcon, shareOnWhatsApp } from '../../utils/whatsappHelper';
import TableActionsMenu from '../../components/ui/TableActionsMenu';
import { FileText, Plus, Download, Printer, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const [settings, setSettings] = useState({});
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Quotation Form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [validDays, setValidDays] = useState('15');
  const [notes, setNotes] = useState('');

  // Item Selector State
  const [qtnItems, setQtnItems] = useState([]);
  const [prodSearch, setProdSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  const fetchQuotations = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest(`/quotations?search=${encodeURIComponent(search)}`);
      if (res.success) {
        setQuotations(res.quotations);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [search]);

  // Search Products for Adding to Quotation
  useEffect(() => {
    if (prodSearch.trim().length > 1) {
      const timer = setTimeout(async () => {
        try {
          const res = await apiRequest(`/products?search=${encodeURIComponent(prodSearch)}`);
          if (res.success) {
            setSearchResults(res.products);
          }
        } catch (err) {
          console.error(err);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [prodSearch]);

  const addItemToQuotation = (prod) => {
    setQtnItems((prev) => {
      const exists = prev.find((item) => item.product_id === prod.id);
      if (exists) {
        return prev.map((item) =>
          item.product_id === prod.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          product_id: prod.id,
          product_name: prod.name,
          barcode: prod.barcode,
          unit_price: prod.selling_price,
          quantity: 1,
          discount_percent: prod.discount_percent || 0,
          gst_percent: prod.gst_percent || 18
        }
      ];
    });
    setProdSearch('');
    setSearchResults([]);
  };

  const handleCreateQuotation = async (e) => {
    e.preventDefault();
    if (qtnItems.length === 0) {
      setToast({ isOpen: true, type: 'error', message: 'Add at least one product to quotation' });
      return;
    }

    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + (parseInt(validDays) || 15));

      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        customer_address: customerAddress,
        notes,
        valid_until: validUntil.toISOString().split('T')[0],
        items: qtnItems
      };

      const res = await apiRequest('/quotations', 'POST', payload);
      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: 'Quotation generated successfully!' });
        setIsModalOpen(false);
        setQtnItems([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setCustomerAddress('');
        fetchQuotations();
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.message || 'Failed to create quotation' });
    }
  };

  const handleDownloadPDF = async (id) => {
    try {
      const res = await apiRequest(`/quotations/${id}`);
      if (res.success && res.quotation) {
        generateQuotationPDF(res.quotation, { settings });
        setToast({ isOpen: true, type: 'success', message: 'Quotation PDF Downloaded' });
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: 'Failed to generate PDF' });
    }
  };

  const handlePrintPDF = async (id) => {
    try {
      const res = await apiRequest(`/quotations/${id}`);
      if (res.success && res.quotation) {
        printQuotationPDF(res.quotation, settings);
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: 'Failed to print quotation' });
    }
  };

  const handleShareWhatsAppQuotation = async (id) => {
    try {
      const res = await apiRequest(`/quotations/${id}`);
      if (res.success && res.quotation) {
        shareOnWhatsApp('quotation', res.quotation, settings, (msg) => setToast({ isOpen: true, type: 'info', message: msg }));
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: 'Failed to share quotation' });
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await apiRequest(`/quotations/${id}/status`, 'PUT', { status });
      setToast({ isOpen: true, type: 'success', message: `Status updated to ${status}` });
      fetchQuotations();
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: 'Failed to update status' });
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
              label: 'Share on WhatsApp',
              icon: WhatsAppIcon,
              onClick: () => handleShareWhatsAppQuotation(row.id)
            },
            {
              label: 'Download PDF',
              icon: Download,
              onClick: () => handleDownloadPDF(row.id)
            },
            {
              label: 'Print Quotation',
              icon: Printer,
              onClick: () => handlePrintPDF(row.id)
            },
            {
              label: 'Mark as ACCEPTED',
              icon: CheckCircle,
              onClick: () => handleStatusChange(row.id, 'ACCEPTED')
            },
            {
              label: 'Mark as REJECTED',
              icon: XCircle,
              variant: 'danger',
              onClick: () => handleStatusChange(row.id, 'REJECTED')
            }
          ]}
        />
      )
    },
    {
      header: 'Quotation Number',
      accessor: 'quotation_number',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400 flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900 dark:text-[#F1F1F1]">{row.quotation_number}</span>
        </div>
      )
    },
    {
      header: 'Date & Time',
      accessor: 'created_at',
      render: (row) => (
        <span className="text-xs text-slate-500 font-medium">{formatDate(row.created_at, true)}</span>
      )
    },
    {
      header: 'Client / Company',
      accessor: 'customer_name',
      render: (row) => (
        <div className="text-xs">
          <p className="font-semibold text-slate-900 dark:text-[#F1F1F1]">{row.customer_name}</p>
          <p className="text-slate-500 dark:text-[#9CA3AF]">{row.customer_phone || row.customer_email || 'N/A'}</p>
        </div>
      )
    },
    {
      header: 'Quotation Total',
      accessor: 'grand_total',
      render: (row) => (
        <span className="font-extrabold text-[#C0392B] dark:text-[#E74C3C] text-sm">{formatCurrency(row.grand_total)}</span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        const variants = { PENDING: 'warning', ACCEPTED: 'success', REJECTED: 'danger' };
        return <Badge variant={variants[row.status] || 'info'}>{row.status}</Badge>;
      }
    }
  ];

  const qtnTotals = calculateCartTotals(qtnItems, 0);

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#C0392B] dark:text-[#E74C3C]" /> B2B Commercial Quotation Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">Create commercial price estimates, download PDFs, and manage status</p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} variant="primary" icon={Plus}>
          Create New Quotation
        </Button>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        onClear={() => setSearch('')}
        placeholder="Filter by quotation number, client name, or phone..."
      />

      <DataTable columns={columns} data={quotations} isLoading={isLoading} emptyMessage="No quotations recorded yet" />

      {/* Create New Quotation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New B2B Price Quotation"
        subtitle="Prepare official commercial price estimate for clients"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateQuotation} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Client / Company Name *"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Hotel Grand Inn / Rajesh Patel"
              required
            />
            <Input
              label="Phone Number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="10-digit mobile"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="client@company.com"
            />
            <Input
              label="Quotation Validity (Days)"
              type="number"
              value={validDays}
              onChange={(e) => setValidDays(e.target.value)}
              placeholder="15"
            />
          </div>

          {/* Product Search and Select */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-[#2D3138]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF]">
              Add Products to Estimate
            </label>
            <div className="relative">
              <input
                type="text"
                value={prodSearch}
                onChange={(e) => setProdSearch(e.target.value)}
                placeholder="Search catalog by product name or SKU..."
                className="w-full p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1]"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-[#1E2126] border border-slate-200 dark:border-[#2D3138] rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {searchResults.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => addItemToQuotation(p)}
                      className="p-2.5 hover:bg-slate-100 dark:hover:bg-[#121417] cursor-pointer text-xs flex justify-between border-b border-slate-100 dark:border-[#2D3138] last:border-0"
                    >
                      <span className="font-semibold text-slate-900 dark:text-[#F1F1F1]">{p.name}</span>
                      <span className="text-[#C0392B] dark:text-[#E74C3C] font-extrabold">{formatCurrency(p.selling_price)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          {qtnItems.length > 0 && (
            <div className="border border-slate-200 dark:border-[#2D3138] rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#FAFAF8] dark:bg-[#121417] border-b border-slate-200 dark:border-[#2D3138] text-slate-500 dark:text-[#9CA3AF]">
                  <tr>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5">Rate</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                    <th className="p-2.5 text-center">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#2D3138] text-slate-900 dark:text-[#F1F1F1]">
                  {qtnItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-semibold">{item.product_name}</td>
                      <td className="p-2.5">{formatCurrency(item.unit_price)}</td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const q = parseInt(e.target.value) || 1;
                            setQtnItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, quantity: q } : it))
                            );
                          }}
                          className="w-14 p-1 text-center bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded"
                        />
                      </td>
                      <td className="p-2.5 text-right font-extrabold text-[#C0392B] dark:text-[#E74C3C]">
                        {formatCurrency(item.unit_price * item.quantity)}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setQtnItems((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:bg-rose-500/10 p-1 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-3 bg-[#FAFAF8] dark:bg-[#121417] text-right font-bold text-slate-900 dark:text-[#F1F1F1]">
                Estimated Grand Total: <span className="text-[#C0392B] dark:text-[#E74C3C] text-sm">{formatCurrency(qtnTotals.grandTotal)}</span>
              </div>
            </div>
          )}

          <Input
            label="Additional Terms / Notes"
            type="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment terms, delivery schedule, guarantee details..."
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#2D3138]">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Generate Commercial Quotation
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
