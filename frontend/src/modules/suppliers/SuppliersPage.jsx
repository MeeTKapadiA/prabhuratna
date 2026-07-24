import React, { useState, useEffect } from 'react';
import SearchBar from '../../components/ui/SearchBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import StatCard from '../../components/ui/StatCard';
import TableActionsMenu from '../../components/ui/TableActionsMenu';
import { apiRequest } from '../../services/api';
import { formatCurrency, formatDate } from '../../services/calcService';
import { Plus, Edit2, Trash2, Truck, Phone, Mail, MapPin, DollarSign, History, Receipt } from 'lucide-react';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
    opening_balance: '0'
  });

  // Payment Record Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [supplierPurchases, setSupplierPurchases] = useState([]);

  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest(`/suppliers?search=${encodeURIComponent(search)}`);
      if (res.success) {
        setSuppliers(res.suppliers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      gst_number: '',
      opening_balance: '0'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (supplier) => {
    setEditingId(supplier.id);
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      gst_number: supplier.gst_number || '',
      opening_balance: String(supplier.opening_balance || 0)
    });
    setIsModalOpen(true);
  };

  const handleSubmitSupplier = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setToast({ isOpen: true, type: 'danger', message: 'Supplier name is required' });
      return;
    }

    try {
      let res;
      if (editingId) {
        res = await apiRequest(`/suppliers/${editingId}`, 'PUT', formData);
      } else {
        res = await apiRequest('/suppliers', 'POST', formData);
      }

      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: res.message });
        setIsModalOpen(false);
        fetchSuppliers();
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'danger', message: err.message || 'Action failed' });
    }
  };

  const handleOpenPaymentModal = async (supplier) => {
    setSelectedSupplier(supplier);
    setPaymentAmount('');
    setPaymentNotes('');
    setIsPaymentModalOpen(true);

    try {
      const res = await apiRequest(`/suppliers/${supplier.id}`);
      if (res.success) {
        setSupplierPurchases(res.supplier.purchases || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit payment against oldest unpaid purchase
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setToast({ isOpen: true, type: 'danger', message: 'Enter a valid payment amount' });
      return;
    }

    // Find unpaid purchase or record against first pending purchase
    const pendingPurchase = supplierPurchases.find(p => p.payment_status !== 'paid');
    if (!pendingPurchase) {
      setToast({ isOpen: true, type: 'warning', message: 'No pending unpaid purchases for this supplier' });
      return;
    }

    try {
      const res = await apiRequest(`/purchases/${pendingPurchase.id}/payments`, 'POST', {
        amount_paid: amt,
        notes: paymentNotes
      });

      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: res.message });
        setIsPaymentModalOpen(false);
        fetchSuppliers();
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'danger', message: err.message || 'Payment recording failed' });
    }
  };

  // Calculate totals
  const totalSuppliers = suppliers.length;
  const totalDues = suppliers.reduce((acc, s) => acc + (s.current_balance > 0 ? s.current_balance : 0), 0);

  const columns = [
    {
      header: 'Actions',
      className: 'w-16 text-center',
      render: (row) => (
        <TableActionsMenu
          actions={[
            {
              label: 'Record Payment / History',
              icon: DollarSign,
              onClick: () => handleOpenPaymentModal(row)
            },
            {
              label: 'Edit Supplier Details',
              icon: Edit2,
              onClick: () => handleOpenEditModal(row)
            }
          ]}
        />
      )
    },
    {
      header: 'Supplier Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-extrabold text-slate-900 dark:text-[#F1F1F1]">{row.name}</p>
          {row.gst_number && <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">GST: {row.gst_number}</p>}
        </div>
      )
    },
    {
      header: 'Contact Info',
      accessor: 'phone',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          {row.phone && <p className="flex items-center gap-1 text-slate-700 dark:text-[#9CA3AF]"><Phone className="w-3 h-3" /> {row.phone}</p>}
          {row.email && <p className="flex items-center gap-1 text-slate-500 dark:text-[#9CA3AF]"><Mail className="w-3 h-3" /> {row.email}</p>}
        </div>
      )
    },
    {
      header: 'Opening Balance',
      accessor: 'opening_balance',
      render: (row) => formatCurrency(row.opening_balance || 0)
    },
    {
      header: 'Current Running Dues',
      accessor: 'current_balance',
      render: (row) => {
        const bal = row.current_balance || 0;
        return (
          <div>
            <span className={`font-extrabold text-sm ${bal > 0 ? 'text-[#C0392B] dark:text-[#E74C3C]' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatCurrency(bal)}
            </span>
            {bal > 0 ? (
              <Badge variant="danger" className="ml-2">Dues Pending</Badge>
            ) : (
              <Badge variant="success" className="ml-2">Clear</Badge>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#C0392B] dark:text-[#E74C3C]" /> Supplier Directory & Dues Tracking
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">Manage raw material vendors, purchase accounts, and running ledger balances</p>
        </div>

        <Button onClick={handleOpenAddModal} variant="primary" icon={Plus}>
          Add New Supplier
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Registered Suppliers"
          value={totalSuppliers}
          icon={Building2}
          subtitle="Active Vendor Accounts"
        />
        <StatCard
          title="Total Outstanding Dues"
          value={formatCurrency(totalDues)}
          icon={Wallet}
          trend={totalDues > 0 ? "Payable Dues" : "All Clear"}
          trendType={totalDues > 0 ? "down" : "up"}
          subtitle="Unpaid Vendor Balances"
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by supplier name, phone, email or GST..."
        />
      </div>

      {/* Suppliers Table */}
      <DataTable
        columns={columns}
        data={suppliers}
        isLoading={isLoading}
        emptyMessage="No suppliers registered yet"
      />

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Supplier Account" : "Register New Supplier"}
      >
        <form onSubmit={handleSubmitSupplier} className="space-y-4">
          <Input
            label="Supplier / Business Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Apex Metals Pvt Ltd"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="supplier@apexmetals.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="GST Registration Number"
              value={formData.gst_number}
              onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
              placeholder="24ABCDE1234F1Z5"
            />
            <Input
              label="Opening Balance (₹)"
              type="number"
              value={formData.opening_balance}
              onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <Input
            label="Office / Warehouse Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="GIDC Industrial Estate, Phase 2, Ahmedabad"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingId ? "Save Changes" : "Create Supplier"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment for ${selectedSupplier?.name || 'Supplier'}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-[#121417] rounded-xl border border-slate-200 dark:border-[#2D3138] space-y-1 text-xs">
            <p className="flex justify-between">
              <span className="text-slate-500">Current Outstanding Dues:</span>
              <span className="font-extrabold text-[#C0392B] dark:text-[#E74C3C]">{formatCurrency(selectedSupplier?.current_balance || 0)}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-slate-500">Pending Purchases:</span>
              <span className="font-bold">{supplierPurchases.filter(p => p.payment_status !== 'paid').length} Orders</span>
            </p>
          </div>

          <Input
            label="Payment Amount (₹) *"
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="e.g. 5000"
            required
          />

          <Input
            label="Payment Reference / Notes"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            placeholder="UPI / Cheque / Bank Transfer Txn Ref #..."
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="success" icon={CreditCard}>
              Submit Payment
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
