import React, { useState, useEffect } from 'react';
import SearchBar from '../../components/ui/SearchBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import { apiRequest } from '../../services/api';
import { calculateCartTotals, formatCurrency } from '../../services/calcService';
import { generateQuotationPDF } from '../../services/pdfService';
import { FileText, Plus, Download, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Quotation Form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');

  // Selected Products in Quotation
  const [qtnItems, setQtnItems] = useState([]);
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState([]);

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

  // Search Products for adding to quotation
  useEffect(() => {
    if (prodSearch.trim().length > 1) {
      const timer = setTimeout(async () => {
        try {
          const res = await apiRequest(`/products?search=${encodeURIComponent(prodSearch)}`);
          if (res.success) setProdResults(res.products);
        } catch (e) {
          console.error(e);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setProdResults([]);
    }
  }, [prodSearch]);

  const addProductToQuotation = (prod) => {
    setQtnItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.product_id === prod.id);
      if (existingIdx > -1) {
        const copy = [...prev];
        copy[existingIdx].quantity += 1;
        return copy;
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
          gst_percent: prod.gst_percent || 18,
          total_price: prod.selling_price
        }
      ];
    });
    setProdSearch('');
    setProdResults([]);
  };

  const handleCreateQuotation = async (e) => {
    e.preventDefault();
    if (qtnItems.length === 0) {
      setToast({ isOpen: true, type: 'error', message: 'Add at least one product to the quotation' });
      return;
    }

    const totals = calculateCartTotals(qtnItems, 0);

    try {
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        customer_address: customerAddress,
        valid_until: validUntil,
        notes: notes,
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        discount_amount: totals.totalDiscount,
        grand_total: totals.grandTotal,
        items: qtnItems
      };

      const res = await apiRequest('/quotations', 'POST', payload);
      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: 'Quotation generated!' });
        setIsModalOpen(false);
        // Auto Download PDF
        generateQuotationPDF(res.quotation);
        fetchQuotations();
        // Reset
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setCustomerAddress('');
        setQtnItems([]);
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.message || 'Failed to create quotation' });
    }
  };

  const handleDownloadPDF = async (qtnId) => {
    try {
      const res = await apiRequest(`/quotations/${qtnId}`);
      if (res.success) {
        generateQuotationPDF(res.quotation);
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: 'Failed to download PDF' });
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
      header: 'Quotation Details',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-slate-100">{row.quotation_number}</p>
            <p className="text-xs text-slate-400">Date: {new Date(row.created_at).toLocaleDateString('en-IN')}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Client / Company',
      render: (row) => (
        <div className="text-xs">
          <p className="font-semibold text-slate-200">{row.customer_name}</p>
          <p className="text-slate-400">{row.customer_phone || row.customer_email || 'N/A'}</p>
        </div>
      )
    },
    {
      header: 'Quotation Total',
      render: (row) => (
        <span className="font-extrabold text-amber-400 text-sm">{formatCurrency(row.grand_total)}</span>
      )
    },
    {
      header: 'Status',
      render: (row) => {
        const variants = { PENDING: 'warning', ACCEPTED: 'success', REJECTED: 'danger' };
        return <Badge variant={variants[row.status] || 'info'}>{row.status}</Badge>;
      }
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownloadPDF(row.id)}
            title="Download PDF"
            className="p-1.5 rounded-lg hover:bg-slate-700 text-amber-400"
          >
            <Download className="w-4 h-4" />
          </button>
          {row.status === 'PENDING' && (
            <>
              <button
                onClick={() => handleStatusChange(row.id, 'ACCEPTED')}
                title="Mark Accepted"
                className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleStatusChange(row.id, 'REJECTED')}
                title="Mark Rejected"
                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  const qtnTotals = calculateCartTotals(qtnItems, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" /> B2B Quotation Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Create commercial price estimates, download PDFs, and manage status</p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} variant="primary" icon={Plus}>
          Create New Quotation
        </Button>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        onClear={() => setSearch('')}
        placeholder="Filter quotations by number, customer name, phone..."
      />

      <DataTable
        columns={columns}
        data={quotations}
        isLoading={isLoading}
        emptyMessage="No quotations generated yet"
      />

      {/* New Quotation Builder Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create B2B Quotation Estimate"
        subtitle="Add client information and selected products"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleCreateQuotation} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company / Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Acme Enterprises Ltd"
              required
            />
            <Input
              label="Phone Number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="9876543210"
            />
            <Input
              label="Email Address"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="corporate@acme.com"
            />
            <Input
              label="Quotation Valid Until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>

          <Input
            label="Company Billing Address"
            type="textarea"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            placeholder="Complete address details..."
          />

          {/* Add Product Search for Quotation */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Add Products to Quotation
            </label>
            <SearchBar
              value={prodSearch}
              onChange={setProdSearch}
              onClear={() => setProdSearch('')}
              placeholder="Search product by name or barcode to append..."
            />

            {prodResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl p-2 space-y-1">
                {prodResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => addProductToQuotation(p)}
                    className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-800 cursor-pointer text-xs"
                  >
                    <span>{p.name}</span>
                    <span className="font-bold text-amber-400">{formatCurrency(p.selling_price)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quotation Items Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="p-3">Product Description</th>
                  <th className="p-3 text-center">Unit Price</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Total Amount</th>
                  <th className="p-3 text-center">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {qtnItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No products added to this quotation yet
                    </td>
                  </tr>
                ) : (
                  qtnItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-semibold text-slate-100">{item.product_name}</td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => {
                            const copy = [...qtnItems];
                            copy[idx].unit_price = parseFloat(e.target.value) || 0;
                            setQtnItems(copy);
                          }}
                          className="w-20 p-1 bg-slate-900 border border-slate-700 rounded text-center"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const copy = [...qtnItems];
                            copy[idx].quantity = parseInt(e.target.value) || 1;
                            setQtnItems(copy);
                          }}
                          className="w-16 p-1 bg-slate-900 border border-slate-700 rounded text-center"
                        />
                      </td>
                      <td className="p-3 text-right font-bold text-amber-400">
                        {formatCurrency(item.unit_price * item.quantity)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setQtnItems(qtnItems.filter((_, i) => i !== idx))}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">Estimated Total:</span>
            <span className="text-xl font-extrabold text-amber-400">{formatCurrency(qtnTotals.grandTotal)}</span>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button onClick={() => setIsModalOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={Download}>
              Generate & Export PDF
            </Button>
          </div>
        </form>
      </Modal>

      <Toast {...toast} onClose={() => setToast((t) => ({ ...t, isOpen: false }))} />
    </div>
  );
}
