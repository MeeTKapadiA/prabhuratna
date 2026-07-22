import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import SearchBar from '../../components/ui/SearchBar';
import { apiRequest } from '../../services/api';
import { formatCurrency } from '../../services/calcService';
import { Boxes, TrendingUp, AlertTriangle, History, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock', 'fast', 'slow', 'logs'
  const [products, setProducts] = useState([]);
  const [fastMoving, setFastMoving] = useState([]);
  const [slowMoving, setSlowMoving] = useState([]);
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Stock Adjustment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [changeType, setChangeType] = useState('PURCHASE'); // 'PURCHASE', 'MANUAL_ADJUSTMENT'
  const [quantityChange, setQuantityChange] = useState('10');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');

  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'stock') {
        const res = await apiRequest(`/products?search=${encodeURIComponent(search)}`);
        if (res.success) setProducts(res.products);
      } else if (activeTab === 'fast') {
        const res = await apiRequest('/inventory/fast-moving?days=30');
        if (res.success) setFastMoving(res.products);
      } else if (activeTab === 'slow') {
        const res = await apiRequest('/inventory/slow-moving?days=30');
        if (res.success) setSlowMoving(res.products);
      } else if (activeTab === 'logs') {
        const res = await apiRequest('/inventory/logs?limit=50');
        if (res.success) setLogs(res.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, search]);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const payload = {
        product_id: selectedProduct.id,
        quantity_change: changeType === 'PURCHASE' ? Math.abs(parseInt(quantityChange)) : parseInt(quantityChange),
        change_type: changeType,
        notes: adjustmentNotes
      };

      const res = await apiRequest('/inventory/adjust', 'POST', payload);
      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: 'Inventory updated successfully' });
        setIsModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.message || 'Failed to update stock' });
    }
  };

  const stockColumns = [
    {
      header: 'Product Name',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-100">{row.name}</p>
          <p className="text-xs text-slate-400 font-mono">Barcode: {row.barcode} | SKU: {row.sku}</p>
        </div>
      )
    },
    {
      header: 'Category & Brand',
      render: (row) => (
        <span className="text-xs text-slate-300">{row.category} / {row.brand}</span>
      )
    },
    {
      header: 'Current Stock',
      render: (row) => (
        <span className="font-extrabold text-sm text-sky-400">{row.stock_quantity} units</span>
      )
    },
    {
      header: 'Min Threshold',
      render: (row) => (
        <span className="text-xs text-slate-400">{row.min_stock_level} units</span>
      )
    },
    {
      header: 'Stock Valuation',
      render: (row) => (
        <span className="text-xs font-semibold text-emerald-400">
          {formatCurrency(row.stock_quantity * row.purchase_price)}
        </span>
      )
    },
    {
      header: 'Action',
      render: (row) => (
        <Button
          onClick={() => {
            setSelectedProduct(row);
            setQuantityChange('10');
            setAdjustmentNotes('');
            setIsModalOpen(true);
          }}
          variant="secondary"
          size="sm"
          icon={Plus}
        >
          Stock In / Adjust
        </Button>
      )
    }
  ];

  const fastColumns = [
    { header: 'Product Name', accessor: 'product_name' },
    { header: 'Barcode', accessor: 'barcode' },
    {
      header: 'Units Sold (30 Days)',
      render: (row) => (
        <span className="font-extrabold text-emerald-400 text-sm flex items-center gap-1">
          <ArrowUpRight className="w-4 h-4" /> {row.total_quantity_sold} units
        </span>
      )
    },
    {
      header: 'Total Revenue Generated',
      render: (row) => (
        <span className="font-bold text-sky-400">{formatCurrency(row.total_revenue)}</span>
      )
    }
  ];

  const slowColumns = [
    { header: 'Product Name', accessor: 'name' },
    { header: 'Category', accessor: 'category' },
    {
      header: 'Current Stock',
      render: (row) => <span className="font-bold text-amber-400">{row.stock_quantity} units</span>
    },
    {
      header: 'Overstock Value',
      render: (row) => <span className="text-xs text-rose-400 font-semibold">{formatCurrency(row.inventory_value)}</span>
    },
    {
      header: 'Recommendation',
      render: (row) => (
        <Badge variant="warning">
          {row.sales_in_period === 0 ? 'Zero Sales - Avoid Purchase' : 'Slow Velocity'}
        </Badge>
      )
    }
  ];

  const logColumns = [
    {
      header: 'Date & Time',
      render: (row) => new Date(row.created_at).toLocaleString('en-IN')
    },
    { header: 'Product', accessor: 'product_name' },
    {
      header: 'Change Type',
      render: (row) => (
        <Badge variant={row.change_type === 'SALE' ? 'danger' : row.change_type === 'PURCHASE' ? 'success' : 'info'}>
          {row.change_type}
        </Badge>
      )
    },
    {
      header: 'Stock Change',
      render: (row) => (
        <span className={`font-bold ${row.quantity_change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {row.quantity_change > 0 ? `+${row.quantity_change}` : row.quantity_change}
        </span>
      )
    },
    {
      header: 'New Balance',
      render: (row) => `${row.previous_stock} → ${row.new_stock}`
    },
    { header: 'Notes', accessor: 'notes' }
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-sky-400" /> Inventory & Analytics Tracking
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Real-time stock audit, purchase entries, and fast/slow-moving intelligence</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          {[
            { id: 'stock', label: 'Stock Master', icon: Boxes },
            { id: 'fast', label: 'Fast Moving', icon: TrendingUp },
            { id: 'slow', label: 'Slow Moving', icon: AlertTriangle },
            { id: 'logs', label: 'Audit Logs', icon: History }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isSelected ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'stock' && (
        <div className="space-y-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Search stock by product name, barcode, SKU..."
          />
          <DataTable columns={stockColumns} data={products} isLoading={isLoading} />
        </div>
      )}

      {activeTab === 'fast' && (
        <DataTable columns={fastColumns} data={fastMoving} isLoading={isLoading} emptyMessage="No fast moving product data available" />
      )}

      {activeTab === 'slow' && (
        <DataTable columns={slowColumns} data={slowMoving} isLoading={isLoading} emptyMessage="No slow moving product alerts" />
      )}

      {activeTab === 'logs' && (
        <DataTable columns={logColumns} data={logs} isLoading={isLoading} />
      )}

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Stock Entry: ${selectedProduct?.name}`}
        subtitle={`Current Stock Balance: ${selectedProduct?.stock_quantity} units`}
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <Input
            label="Entry Type"
            type="select"
            value={changeType}
            onChange={(e) => setChangeType(e.target.value)}
            options={[
              { label: 'Purchase Stock Entry (Add Stock)', value: 'PURCHASE' },
              { label: 'Manual Stock Adjustment', value: 'MANUAL_ADJUSTMENT' }
            ]}
          />

          <Input
            label="Quantity (Positive to add, Negative to reduce)"
            type="number"
            value={quantityChange}
            onChange={(e) => setQuantityChange(e.target.value)}
            required
          />

          <Input
            label="Remarks / Supplier Notes"
            type="textarea"
            value={adjustmentNotes}
            onChange={(e) => setAdjustmentNotes(e.target.value)}
            placeholder="e.g. Received shipment from manufacturer batch #402"
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <Button onClick={() => setIsModalOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm & Save Stock Entry
            </Button>
          </div>
        </form>
      </Modal>

      <Toast {...toast} onClose={() => setToast((t) => ({ ...t, isOpen: false }))} />
    </div>
  );
}
