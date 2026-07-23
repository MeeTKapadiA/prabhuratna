import React, { useState, useEffect } from 'react';
import SearchBar from '../../components/ui/SearchBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import { apiRequest } from '../../services/api';
import { formatCurrency } from '../../services/calcService';
import { ShoppingBag, Plus, Trash2, Eye, CreditCard, Calendar, Filter, FileText } from 'lucide-react';

export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState('history'); // 'history' or 'new'
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Purchase Form State
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formPaymentStatus, setFormPaymentStatus] = useState('unpaid');
  const [formAmountPaid, setFormAmountPaid] = useState('0');
  const [formItems, setFormItems] = useState([
    { product_id: '', product_name: '', quantity: '1', purchase_price: '0', total_price: '0' }
  ]);

  // Detail Modal State
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Record Payment Modal State
  const [paymentPurchase, setPaymentPurchase] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch suppliers & products for form dropdowns
      const [supRes, prodRes] = await Promise.all([
        apiRequest('/suppliers'),
        apiRequest('/products')
      ]);

      if (supRes.success) setSuppliers(supRes.suppliers || []);
      if (prodRes.success) setProducts(prodRes.products || []);

      // Fetch Purchases with filters
      let pQuery = `/purchases?search=${encodeURIComponent(search)}`;
      if (supplierFilter) pQuery += `&supplier_id=${supplierFilter}`;
      if (statusFilter) pQuery += `&payment_status=${statusFilter}`;
      if (startDate) pQuery += `&startDate=${startDate}`;
      if (endDate) pQuery += `&endDate=${endDate}`;

      const pRes = await apiRequest(pQuery);
      if (pRes.success) setPurchases(pRes.purchases || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, supplierFilter, statusFilter, startDate, endDate]);

  // Item row calculation
  const updateItemRow = (index, field, value) => {
    const updated = [...formItems];
    updated[index][field] = value;

    if (field === 'product_id' && value) {
      const found = products.find(p => p.id === parseInt(value));
      if (found) {
        updated[index].product_name = found.name;
        updated[index].purchase_price = String(found.purchase_price || 0);
      }
    }

    const qty = parseFloat(updated[index].quantity) || 0;
    const price = parseFloat(updated[index].purchase_price) || 0;
    updated[index].total_price = (qty * price).toFixed(2);

    setFormItems(updated);
  };

  const addItemRow = () => {
    setFormItems([
      ...formItems,
      { product_id: '', product_name: '', quantity: '1', purchase_price: '0', total_price: '0' }
    ]);
  };

  const removeItemRow = (index) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  // Totals Calculation
  const subtotal = formItems.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
  const taxAmount = subtotal * 0.18; // 18% GST default
  const grandTotal = subtotal + taxAmount;

  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    if (!formSupplierId) {
      setToast({ isOpen: true, type: 'danger', message: 'Please select a supplier' });
      return;
    }

    const validItems = formItems.filter(i => i.product_name.trim());
    if (validItems.length === 0) {
      setToast({ isOpen: true, type: 'danger', message: 'Please add at least one product item' });
      return;
    }

    try {
      const payload = {
        supplier_id: parseInt(formSupplierId),
        subtotal,
        tax_amount: taxAmount,
        grand_total: grandTotal,
        payment_status: formPaymentStatus,
        amount_paid: parseFloat(formAmountPaid) || 0,
        notes: formNotes,
        items: validItems.map(i => ({
          product_id: i.product_id ? parseInt(i.product_id) : null,
          product_name: i.product_name,
          quantity: parseInt(i.quantity) || 1,
          purchase_price: parseFloat(i.purchase_price) || 0,
          total_price: parseFloat(i.total_price) || 0
        }))
      };

      const res = await apiRequest('/purchases', 'POST', payload);
      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: res.message });
        setActiveTab('history');
        // Reset Form
        setFormSupplierId('');
        setFormNotes('');
        setFormPaymentStatus('unpaid');
        setFormAmountPaid('0');
        setFormItems([{ product_id: '', product_name: '', quantity: '1', purchase_price: '0', total_price: '0' }]);
        fetchData();
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'danger', message: err.message || 'Failed to create purchase' });
    }
  };

  const handleOpenDetailModal = async (purchaseId) => {
    try {
      const res = await apiRequest(`/purchases/${purchaseId}`);
      if (res.success) {
        setSelectedPurchase(res.purchase);
        setIsDetailModalOpen(true);
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'danger', message: 'Failed to fetch purchase details' });
    }
  };

  const handleOpenPaymentModal = (purchase) => {
    setPaymentPurchase(purchase);
    setPayAmount(String(purchase.grand_total - purchase.amount_paid));
    setPayNotes('');
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentPurchase) return;

    try {
      const res = await apiRequest(`/purchases/${paymentPurchase.id}/payments`, 'POST', {
        amount_paid: parseFloat(payAmount),
        notes: payNotes
      });

      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: res.message });
        setIsPaymentModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'danger', message: err.message || 'Failed to record payment' });
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'paid') return <Badge variant="success">PAID</Badge>;
    if (status === 'partial') return <Badge variant="warning">PARTIAL</Badge>;
    return <Badge variant="danger">UNPAID</Badge>;
  };

  const columns = [
    {
      header: 'Purchase Number',
      render: (row) => (
        <div>
          <span className="font-extrabold text-[#C0392B] dark:text-[#E74C3C]">{row.purchase_number}</span>
          <p className="text-xs text-slate-500">{new Date(row.created_at).toLocaleDateString('en-IN')}</p>
        </div>
      )
    },
    { header: 'Supplier Name', accessor: 'supplier_name' },
    {
      header: 'Grand Total',
      render: (row) => <span className="font-bold">{formatCurrency(row.grand_total)}</span>
    },
    {
      header: 'Payment Status',
      render: (row) => getStatusBadge(row.payment_status)
    },
    {
      header: 'Amount Paid',
      render: (row) => (
        <div>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(row.amount_paid || 0)}</p>
          {row.grand_total - row.amount_paid > 0 && (
            <p className="text-[10px] text-rose-500">Due: {formatCurrency(row.grand_total - row.amount_paid)}</p>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => handleOpenDetailModal(row.id)} icon={Eye}>
            View
          </Button>
          {row.payment_status !== 'paid' && (
            <Button size="sm" variant="primary" onClick={() => handleOpenPaymentModal(row)} icon={CreditCard}>
              Pay
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#C0392B] dark:text-[#E74C3C]" /> Purchase Management & Stock Entry
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">Procure raw materials & products from suppliers with automatic inventory updating</p>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-[#121417] rounded-xl border border-slate-200 dark:border-[#2D3138]">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-[#1E2126] text-[#C0392B] dark:text-[#E74C3C] shadow-xs'
                : 'text-slate-500 dark:text-[#9CA3AF]'
            }`}
          >
            Purchase History
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'new'
                ? 'bg-white dark:bg-[#1E2126] text-[#C0392B] dark:text-[#E74C3C] shadow-xs'
                : 'text-slate-500 dark:text-[#9CA3AF]'
            }`}
          >
            + Create Purchase Order
          </button>
        </div>
      </div>

      {/* View Mode: Purchase History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] grid grid-cols-1 sm:grid-cols-5 gap-4 shadow-sm">
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by PUR # or supplier..."
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#9CA3AF] mb-1">Supplier</label>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1]"
              >
                <option value="">All Suppliers</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#9CA3AF] mb-1">Payment Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1]"
              >
                <option value="">All Payment Statuses</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
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

          {/* Purchases Table */}
          <DataTable
            columns={columns}
            data={purchases}
            isLoading={isLoading}
            emptyMessage="No purchases recorded yet"
          />
        </div>
      )}

      {/* View Mode: Create New Purchase Form */}
      {activeTab === 'new' && (
        <form onSubmit={handleSubmitPurchase} className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] space-y-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-[#F1F1F1] pb-2 border-b border-slate-200 dark:border-[#2D3138]">
            New Purchase Order Entry
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#9CA3AF] mb-1">Select Supplier *</label>
              <select
                value={formSupplierId}
                onChange={(e) => setFormSupplierId(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1]"
                required
              >
                <option value="">-- Choose Vendor / Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.phone || 'No phone'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#9CA3AF] mb-1">Payment Status</label>
              <select
                value={formPaymentStatus}
                onChange={(e) => setFormPaymentStatus(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1]"
              >
                <option value="unpaid">Unpaid (Add to Supplier Dues)</option>
                <option value="partial">Partial Payment</option>
                <option value="paid">Fully Paid</option>
              </select>
            </div>

            <Input
              label="Amount Paid Now (₹)"
              type="number"
              value={formAmountPaid}
              onChange={(e) => setFormAmountPaid(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF]">
                Purchase Line Items
              </h4>
              <Button type="button" size="sm" variant="secondary" onClick={addItemRow} icon={Plus}>
                Add Item Row
              </Button>
            </div>

            <div className="space-y-2">
              {formItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-slate-50 dark:bg-[#121417] rounded-xl border border-slate-200 dark:border-[#2D3138] items-end">
                  <div className="col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Product</label>
                    <select
                      value={item.product_id}
                      onChange={(e) => updateItemRow(index, 'product_id', e.target.value)}
                      className="w-full p-2 bg-white dark:bg-[#1E2126] border border-slate-300 dark:border-[#2D3138] rounded-lg text-xs text-slate-900 dark:text-[#F1F1F1]"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock_quantity})</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Item Name / Description</label>
                    <input
                      type="text"
                      value={item.product_name}
                      onChange={(e) => updateItemRow(index, 'product_name', e.target.value)}
                      className="w-full p-2 bg-white dark:bg-[#1E2126] border border-slate-300 dark:border-[#2D3138] rounded-lg text-xs text-slate-900 dark:text-[#F1F1F1]"
                      placeholder="Product Name"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItemRow(index, 'quantity', e.target.value)}
                      className="w-full p-2 bg-white dark:bg-[#1E2126] border border-slate-300 dark:border-[#2D3138] rounded-lg text-xs text-slate-900 dark:text-[#F1F1F1]"
                      min="1"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Unit Cost (₹)</label>
                    <input
                      type="number"
                      value={item.purchase_price}
                      onChange={(e) => updateItemRow(index, 'purchase_price', e.target.value)}
                      className="w-full p-2 bg-white dark:bg-[#1E2126] border border-slate-300 dark:border-[#2D3138] rounded-lg text-xs text-slate-900 dark:text-[#F1F1F1]"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes & Summary Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-[#2D3138]">
            <Input
              label="Purchase Order Notes / Remarks"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="e.g. Invoice #1092 from vendor. Stock delivered to shop."
            />

            <div className="p-4 bg-slate-50 dark:bg-[#121417] rounded-xl border border-slate-200 dark:border-[#2D3138] space-y-2 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-[#9CA3AF]">
                <span>Subtotal:</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-[#9CA3AF]">
                <span>Estimated GST Tax (18%):</span>
                <span className="font-semibold">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-[#F1F1F1] pt-2 border-t border-slate-200 dark:border-[#2D3138]">
                <span>Grand Total Payable:</span>
                <span className="text-[#C0392B] dark:text-[#E74C3C]">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setActiveTab('history')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={ShoppingBag}>
              Confirm Purchase & Receive Stock
            </Button>
          </div>
        </form>
      )}

      {/* Purchase Detail Modal */}
      {selectedPurchase && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Purchase Order: ${selectedPurchase.purchase_number}`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-[#121417] rounded-xl border border-slate-200 dark:border-[#2D3138] grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-slate-500">Supplier Name:</p>
                <p className="font-bold text-slate-900 dark:text-[#F1F1F1]">{selectedPurchase.supplier_name}</p>
                {selectedPurchase.supplier_phone && <p className="text-slate-500">Phone: {selectedPurchase.supplier_phone}</p>}
              </div>
              <div>
                <p className="text-slate-500">Purchase Date:</p>
                <p className="font-bold">{new Date(selectedPurchase.created_at).toLocaleDateString('en-IN')}</p>
                <p className="text-slate-500">Payment Status: {getStatusBadge(selectedPurchase.payment_status)}</p>
              </div>
            </div>

            {/* Item Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-[#9CA3AF]">Items Received</h4>
              <div className="divide-y divide-slate-200 dark:divide-[#2D3138] border border-slate-200 dark:border-[#2D3138] rounded-xl overflow-hidden">
                {selectedPurchase.items?.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-white dark:bg-[#1E2126] flex justify-between text-xs">
                    <div>
                      <p className="font-bold">{item.product_name}</p>
                      <p className="text-slate-500">{item.quantity} units @ {formatCurrency(item.purchase_price)}</p>
                    </div>
                    <span className="font-extrabold">{formatCurrency(item.total_price)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-[#121417] rounded-xl border border-slate-200 dark:border-[#2D3138] space-y-1 text-xs">
              <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(selectedPurchase.subtotal)}</span></div>
              <div className="flex justify-between"><span>Tax Amount:</span><span>{formatCurrency(selectedPurchase.tax_amount)}</span></div>
              <div className="flex justify-between font-bold text-sm text-[#C0392B] dark:text-[#E74C3C]"><span>Grand Total:</span><span>{formatCurrency(selectedPurchase.grand_total)}</span></div>
              <div className="flex justify-between text-emerald-600 font-semibold"><span>Amount Paid:</span><span>{formatCurrency(selectedPurchase.amount_paid)}</span></div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setIsDetailModalOpen(false)} variant="secondary">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Payment Modal */}
      {paymentPurchase && (
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title={`Pay Dues for ${paymentPurchase.purchase_number}`}
        >
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-[#121417] rounded-xl border border-slate-200 dark:border-[#2D3138] text-xs space-y-1">
              <p className="flex justify-between"><span>Grand Total:</span><span className="font-bold">{formatCurrency(paymentPurchase.grand_total)}</span></p>
              <p className="flex justify-between"><span>Already Paid:</span><span className="text-emerald-600 font-bold">{formatCurrency(paymentPurchase.amount_paid)}</span></p>
              <p className="flex justify-between font-bold text-[#C0392B] dark:text-[#E74C3C]"><span>Remaining Due:</span><span>{formatCurrency(paymentPurchase.grand_total - paymentPurchase.amount_paid)}</span></p>
            </div>

            <Input
              label="Payment Amount (₹) *"
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
            />

            <Input
              label="Payment Notes"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="e.g. Paid via UPI"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="success">
                Confirm Payment
              </Button>
            </div>
          </form>
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
