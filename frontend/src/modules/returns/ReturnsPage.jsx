import React, { useState, useEffect } from 'react';
import SearchBar from '../../components/ui/SearchBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import TableActionsMenu from '../../components/ui/TableActionsMenu';
import { apiRequest } from '../../services/api';
import { formatCurrency, formatDate } from '../../services/calcService';
import { RotateCcw, Search, Eye, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

export default function ReturnsPage() {
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'history'
  const [returnsList, setReturnsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search invoice state
  const [searchInvoiceNo, setSearchInvoiceNo] = useState('');
  const [foundInvoice, setFoundInvoice] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Return Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [reason, setReason] = useState('Customer exchange');
  const [refundMode, setRefundMode] = useState('cash'); // 'cash', 'store_credit', 'exchange'
  const [selectedReturnItems, setSelectedReturnItems] = useState([]);

  // Detail Modal State
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Filters for History
  const [historySearch, setHistorySearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  const fetchReturns = async () => {
    setIsLoading(true);
    try {
      let query = `/returns?search=${encodeURIComponent(historySearch)}`;
      if (startDate) query += `&startDate=${startDate}`;
      if (endDate) query += `&endDate=${endDate}`;

      const res = await apiRequest(query);
      if (res.success) {
        setReturnsList(res.returns || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [historySearch, startDate, endDate]);

  const handleLookupInvoice = async (e) => {
    e.preventDefault();
    if (!searchInvoiceNo.trim()) return;

    setIsSearching(true);
    try {
      const res = await apiRequest(`/returns/lookup/${encodeURIComponent(searchInvoiceNo.trim())}`);
      if (res.success && res.invoice) {
        setFoundInvoice(res.invoice);
        setCustomerName(res.invoice.customer_name || 'Walk-in Customer');
        setCustomerPhone(res.invoice.customer_phone || '');

        // Pre-fill return items with 0 quantity initially for user selection
        const initialItems = res.invoice.items?.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          max_qty: item.quantity,
          quantity: 1, // default 1 to return
          unit_price: item.unit_price,
          total_price: item.unit_price,
          is_damaged: false,
          selected: true
        })) || [];

        setSelectedReturnItems(initialItems);
        setToast({ isOpen: true, type: 'success', message: `Found invoice ${res.invoice.invoice_number}` });
      }
    } catch (err) {
      setFoundInvoice(null);
      setSelectedReturnItems([]);
      setToast({ isOpen: true, type: 'danger', message: err.message || 'Invoice not found' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleToggleItemSelect = (index) => {
    const updated = [...selectedReturnItems];
    updated[index].selected = !updated[index].selected;
    setSelectedReturnItems(updated);
  };

  const handleUpdateItemField = (index, field, value) => {
    const updated = [...selectedReturnItems];
    updated[index][field] = value;

    if (field === 'quantity' || field === 'unit_price') {
      const qty = parseFloat(updated[index].quantity) || 0;
      const price = parseFloat(updated[index].unit_price) || 0;
      updated[index].total_price = (qty * price).toFixed(2);
    }

    setSelectedReturnItems(updated);
  };

  // Calculate Total Refund
  const totalRefundAmount = selectedReturnItems
    .filter(item => item.selected)
    .reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    const itemsToReturn = selectedReturnItems.filter(item => item.selected && parseFloat(item.quantity) > 0);

    if (itemsToReturn.length === 0) {
      setToast({ isOpen: true, type: 'danger', message: 'Please select at least one item to return' });
      return;
    }

    try {
      const payload = {
        invoice_id: foundInvoice ? foundInvoice.id : null,
        customer_name: customerName,
        customer_phone: customerPhone,
        reason,
        refund_mode: refundMode,
        refund_amount: totalRefundAmount,
        status: 'completed',
        items: itemsToReturn.map(i => ({
          product_id: i.product_id || null,
          product_name: i.product_name,
          quantity: parseInt(i.quantity) || 1,
          unit_price: parseFloat(i.unit_price) || 0,
          total_price: parseFloat(i.total_price) || 0,
          is_damaged: i.is_damaged ? 1 : 0
        }))
      };

      const res = await apiRequest('/returns', 'POST', payload);
      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: res.message });
        // Reset form
        setFoundInvoice(null);
        setSearchInvoiceNo('');
        setSelectedReturnItems([]);
        setActiveTab('history');
        fetchReturns();
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'danger', message: err.message || 'Failed to process return' });
    }
  };

  const handleOpenDetailModal = async (returnId) => {
    try {
      const res = await apiRequest(`/returns/${returnId}`);
      if (res.success) {
        setSelectedReturn(res.return);
        setIsDetailModalOpen(true);
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'danger', message: 'Failed to fetch return details' });
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
              label: 'View Return Details',
              icon: Eye,
              onClick: () => handleOpenDetailModal(row.id)
            }
          ]}
        />
      )
    },
    {
      header: 'Return Number',
      accessor: 'return_number',
      render: (row) => (
        <span className="font-extrabold text-[#C0392B] dark:text-[#E74C3C]">{row.return_number}</span>
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
      header: 'Original Invoice',
      accessor: 'invoice_number',
      render: (row) => row.invoice_number ? <span className="font-bold">{row.invoice_number}</span> : <span className="text-slate-400">Direct Return</span>
    },
    { header: 'Customer', accessor: 'customer_name' },
    {
      header: 'Refund Mode',
      accessor: 'refund_mode',
      render: (row) => (
        <Badge variant={row.refund_mode === 'cash' ? 'info' : row.refund_mode === 'store_credit' ? 'warning' : 'success'}>
          {row.refund_mode?.toUpperCase() || 'N/A'}
        </Badge>
      )
    },
    {
      header: 'Refund Amount',
      accessor: 'refund_amount',
      render: (row) => <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(row.refund_amount)}</span>
    }
  ];

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-[#C0392B] dark:text-[#E74C3C]" /> Returns, Refunds & Product Exchanges
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">Lookup original invoices, restore inventory or flag damaged goods with automated refund logging</p>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-[#121417] rounded-xl border border-slate-200 dark:border-[#2D3138]">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'new'
                ? 'bg-white dark:bg-[#1E2126] text-[#C0392B] dark:text-[#E74C3C] shadow-xs'
                : 'text-slate-500 dark:text-[#9CA3AF]'
            }`}
          >
            + Process New Return
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-[#1E2126] text-[#C0392B] dark:text-[#E74C3C] shadow-xs'
                : 'text-slate-500 dark:text-[#9CA3AF]'
            }`}
          >
            Return History Logs
          </button>
        </div>
      </div>

      {/* Mode: Process New Return */}
      {activeTab === 'new' && (
        <div className="space-y-6">
          {/* Invoice Lookup Bar */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF]">
              Step 1: Lookup Original Sales Invoice
            </h3>
            <form onSubmit={handleLookupInvoice} className="flex gap-3">
              <input
                type="text"
                value={searchInvoiceNo}
                onChange={(e) => setSearchInvoiceNo(e.target.value)}
                placeholder="Enter Invoice Number (e.g. INV-20260722-1092)..."
                className="flex-1 p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1] focus:outline-none focus:border-[#C0392B]"
              />
              <Button type="submit" variant="primary" icon={Search} isLoading={isSearching}>
                Lookup Invoice
              </Button>
            </form>
          </div>

          {/* Return Form */}
          {foundInvoice && (
            <form onSubmit={handleSubmitReturn} className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#2D3138]">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-[#F1F1F1]">
                    Step 2: Select Items & Refund Mode for {foundInvoice.invoice_number}
                  </h3>
                  <p className="text-xs text-slate-500">Original Sale Date: {new Date(foundInvoice.created_at).toLocaleDateString('en-IN')}</p>
                </div>
                <Badge variant="info">Invoice Total: {formatCurrency(foundInvoice.grand_total)}</Badge>
              </div>

              {/* Customer & Return Reason Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Input
                  label="Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <Input
                  label="Customer Phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#9CA3AF] mb-1">Reason for Return</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1]"
                  >
                    <option value="Customer exchange">Customer Exchange</option>
                    <option value="Defective / Damaged product">Defective / Damaged Product</option>
                    <option value="Wrong size / Specification">Wrong Size / Specification</option>
                    <option value="Changed mind / Order cancellation">Changed Mind</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#9CA3AF] mb-1">Refund Method</label>
                  <select
                    value={refundMode}
                    onChange={(e) => setRefundMode(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1]"
                  >
                    <option value="cash">Cash Refund</option>
                    <option value="store_credit">Store Credit Voucher</option>
                    <option value="exchange">Immediate Exchange</option>
                  </select>
                </div>
              </div>

              {/* Items Selection Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF]">
                  Select Products to Return
                </h4>

                <div className="space-y-2">
                  {selectedReturnItems.map((item, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-xl border transition-all ${
                        item.selected
                          ? 'bg-white dark:bg-[#121417] border-[#C0392B] dark:border-[#E74C3C] shadow-xs'
                          : 'bg-slate-50 dark:bg-[#121417]/50 border-slate-200 dark:border-[#2D3138] opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => handleToggleItemSelect(index)}
                            className="w-4 h-4 text-[#C0392B] rounded focus:ring-[#C0392B]"
                          />
                          <div>
                            <p className="font-extrabold text-xs text-slate-900 dark:text-[#F1F1F1]">{item.product_name}</p>
                            <p className="text-[11px] text-slate-500">Original Sale Qty: {item.max_qty} @ {formatCurrency(item.unit_price)}</p>
                          </div>
                        </div>

                        {item.selected && (
                          <div className="flex items-center gap-4 text-xs">
                            <div>
                              <label className="block text-[10px] text-slate-500">Return Qty</label>
                              <input
                                type="number"
                                value={item.quantity}
                                min="1"
                                max={item.max_qty}
                                onChange={(e) => handleUpdateItemField(index, 'quantity', e.target.value)}
                                className="w-16 p-1.5 bg-white dark:bg-[#1E2126] border border-slate-300 dark:border-[#2D3138] rounded-lg text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-slate-500">Refund Unit Price (₹)</label>
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => handleUpdateItemField(index, 'unit_price', e.target.value)}
                                className="w-24 p-1.5 bg-white dark:bg-[#1E2126] border border-slate-300 dark:border-[#2D3138] rounded-lg text-xs"
                              />
                            </div>

                            <label className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold cursor-pointer pt-3">
                              <input
                                type="checkbox"
                                checked={item.is_damaged}
                                onChange={(e) => handleUpdateItemField(index, 'is_damaged', e.target.checked)}
                                className="w-4 h-4 text-amber-600 rounded"
                              />
                              Damaged (do not restock)
                            </label>

                            <div className="text-right pt-3">
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.total_price)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Refund Banner */}
              <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl">
                <div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 font-bold uppercase">Total Calculated Refund</p>
                  <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalRefundAmount)}</p>
                </div>

                <Button type="submit" variant="success" icon={CheckCircle}>
                  Process Return & Issue Refund
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Mode: Return History Logs */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm">
            <SearchBar
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search return # or customer..."
            />
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

          <DataTable
            columns={columns}
            data={returnsList}
            isLoading={isLoading}
            emptyMessage="No return records logged yet"
          />
        </div>
      )}

      {/* Return Detail Receipt Modal */}
      {selectedReturn && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Return Receipt: ${selectedReturn.return_number}`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-[#121417] rounded-xl border border-slate-200 dark:border-[#2D3138] grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-slate-500">Customer Name:</p>
                <p className="font-bold text-slate-900 dark:text-[#F1F1F1]">{selectedReturn.customer_name}</p>
                <p className="text-slate-500">Reason: {selectedReturn.reason}</p>
              </div>
              <div>
                <p className="text-slate-500">Return Date:</p>
                <p className="font-bold">{new Date(selectedReturn.created_at).toLocaleDateString('en-IN')}</p>
                <p className="text-slate-500">Refund Mode: <Badge variant="success">{selectedReturn.refund_mode.toUpperCase()}</Badge></p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-[#9CA3AF]">Returned Line Items</h4>
              <div className="divide-y divide-slate-200 dark:divide-[#2D3138] border border-slate-200 dark:border-[#2D3138] rounded-xl overflow-hidden">
                {selectedReturn.items?.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-white dark:bg-[#1E2126] flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold">{item.product_name}</p>
                      <p className="text-slate-500">{item.quantity} units @ {formatCurrency(item.unit_price)}</p>
                      {item.is_damaged === 1 && (
                        <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Flagged Damaged (Not Restocked)</span>
                      )}
                    </div>
                    <span className="font-extrabold text-emerald-600">{formatCurrency(item.total_price)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex justify-between font-bold text-sm">
              <span>Total Refund Amount:</span>
              <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedReturn.refund_amount)}</span>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setIsDetailModalOpen(false)} variant="secondary">
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
