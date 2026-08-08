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
import { formatCurrency } from '../../services/calcService';
import { Users, Plus, Edit2, Wallet, Phone, Mail, HandCoins } from 'lucide-react';

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  gstin: '',
  opening_balance: '0',
  notes: ''
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest(`/customers?search=${encodeURIComponent(search)}`);
      if (res.success) setCustomers(res.customers || []);
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.message || 'Failed to fetch customers' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReceivables = async () => {
    try {
      const res = await apiRequest('/customers/receivables');
      if (res.success) setReceivables(res.receivables || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  useEffect(() => {
    fetchReceivables();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (row) => {
    setEditingId(row.id);
    setFormData({
      name: row.name || '',
      phone: row.phone || '',
      email: row.email || '',
      address: row.address || '',
      gstin: row.gstin || '',
      opening_balance: String(row.opening_balance || 0),
      notes: row.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setToast({ isOpen: true, type: 'danger', message: 'Customer name is required' });
      return;
    }
    try {
      const payload = editingId
        ? {
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            gstin: formData.gstin,
            notes: formData.notes
          }
        : formData;
      const res = editingId
        ? await apiRequest(`/customers/${editingId}`, 'PUT', payload)
        : await apiRequest('/customers', 'POST', payload);
      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: editingId ? 'Customer updated' : 'Customer created' });
        setIsModalOpen(false);
        fetchCustomers();
        fetchReceivables();
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'danger', message: err.message || 'Action failed' });
    }
  };

  const totalReceivable = receivables.reduce(
    (sum, r) => sum + (Number(r.total_due) || Number(r.current_balance) || 0),
    0
  );

  const columns = [
    {
      header: 'Actions',
      className: 'w-16 text-center',
      render: (row) => (
        <TableActionsMenu
          actions={[{ label: 'Edit Customer', icon: Edit2, onClick: () => handleOpenEdit(row) }]}
        />
      )
    },
    {
      header: 'Customer',
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-extrabold text-slate-900 dark:text-[#F1F1F1]">{row.name}</p>
          {row.gstin && <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">GSTIN: {row.gstin}</p>}
        </div>
      )
    },
    {
      header: 'Contact',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          {row.phone && (
            <p className="flex items-center gap-1 text-slate-700 dark:text-[#9CA3AF]">
              <Phone className="w-3 h-3" /> {row.phone}
            </p>
          )}
          {row.email && (
            <p className="flex items-center gap-1 text-slate-500 dark:text-[#9CA3AF]">
              <Mail className="w-3 h-3" /> {row.email}
            </p>
          )}
        </div>
      )
    },
    {
      header: 'Current Balance',
      accessor: 'current_balance',
      render: (row) => {
        const bal = Number(row.current_balance) || 0;
        return (
          <div className="flex items-center gap-2">
            <span className={`font-extrabold text-sm ${bal > 0 ? 'text-[#C0392B] dark:text-[#E74C3C]' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatCurrency(bal)}
            </span>
            <Badge variant={bal > 0 ? 'danger' : 'success'}>{bal > 0 ? 'Due' : 'Clear'}</Badge>
          </div>
        );
      }
    }
  ];

  const receivableColumns = [
    { header: 'Customer', accessor: 'name' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Open Invoices', accessor: 'open_invoices' },
    {
      header: 'Balance',
      render: (row) => (
        <span className="font-extrabold text-[#C0392B] dark:text-[#E74C3C]">
          {formatCurrency(row.total_due ?? row.current_balance ?? 0)}
        </span>
      )
    }
  ];

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#C0392B] dark:text-[#E74C3C]" /> Customers & Receivables
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">Manage customer accounts and outstanding credit balances</p>
        </div>
        <Button onClick={handleOpenAdd} variant="primary" icon={Plus}>Add Customer</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Total Customers" value={customers.length} icon={Users} subtitle="Registered accounts" color="sky" />
        <StatCard title="Total Receivables" value={formatCurrency(totalReceivable)} icon={Wallet} subtitle="Outstanding dues" color="rose" />
      </div>

      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <SearchBar
          value={search}
          onChange={setSearch}
          onClear={() => setSearch('')}
          placeholder="Search by name, phone, GSTIN or email..."
        />
      </div>

      <DataTable columns={columns} data={customers} isLoading={isLoading} emptyMessage="No customers found" />

      <div className="space-y-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-[#C0392B] dark:text-[#E74C3C]" /> Receivables
        </h3>
        <DataTable columns={receivableColumns} data={receivables} emptyMessage="No outstanding receivables" />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Customer' : 'Add Customer'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Customer Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="GSTIN" value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })} />
            {!editingId && (
              <Input
                label="Opening Balance (₹)"
                type="number"
                value={formData.opening_balance}
                onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
              />
            )}
          </div>
          <Input label="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
          <Input label="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#2D3138]">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">{editingId ? 'Save Changes' : 'Create Customer'}</Button>
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
