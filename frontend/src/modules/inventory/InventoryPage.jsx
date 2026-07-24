import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import SearchBar from '../../components/ui/SearchBar';
import TableActionsMenu from '../../components/ui/TableActionsMenu';
import { apiRequest } from '../../services/api';
import { formatCurrency } from '../../services/calcService';
import { Boxes, ArrowUpDown, AlertTriangle, TrendingUp, TrendingDown, Plus, Minus, History, QrCode, RefreshCw } from 'lucide-react';

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
      header: 'Actions',
      className: 'w-16 text-center',
      render: (row) => (
        <TableActionsMenu
          actions={[
            {
              label: 'Adjust Stock Quantity',
              icon: RefreshCw,
              onClick: () => {
                setSelectedProduct(row);
                setQuantityChange('10');
                setAdjustmentNotes('');
                setIsModalOpen(true);
              }
            }
          ]}
        />
      )
    },
    {
      header: 'Product Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-[#F1F1F1]">{row.name}</p>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] font-mono">Barcode: {row.barcode} | SKU: {row.sku}</p>
        </div>
      )
    },
    {
      header: 'Category & Brand',
      accessor: 'category',
      render: (row) => (
        <span className="text-xs text-slate-700 dark:text-[#9CA3AF]">{row.category} / {row.brand}</span>
      )
    },
    {
      header: 'Current Stock',
      accessor: 'stock_quantity',
      render: (row) => (
        <span className="font-extrabold text-sm text-[#C0392B] dark:text-[#E74C3C]">{row.stock_quantity} units</span>
      )
    },
    {
      header: 'Valuation (₹)',
      accessor: 'purchase_price',
      render: (row) => (
        <div className="text-xs">
          <p className="font-semibold text-slate-900 dark:text-[#F1F1F1]">Cost: {formatCurrency(row.purchase_price * row.stock_quantity)}</p>
          <p className="text-slate-500 dark:text-[#9CA3AF]">Retail: {formatCurrency(row.selling_price * row.stock_quantity)}</p>
        </div>
      )
    },
    {
      header: 'Stock Status',
      accessor: 'min_stock_level',
      render: (row) => {
        let variant = 'success';
        let label = 'Healthy Stock';
        if (row.stock_quantity === 0) {
          variant = 'danger';
          label = 'Out of Stock';
        } else if (row.stock_quantity <= row.min_stock_level) {
          variant = 'warning';
          label = 'Low Stock Alert';
        }
        return <Badge variant={variant}>{label}</Badge>;
      }
    }
  ];

  const fastColumns = [
    { header: 'Product Name', accessor: 'name' },
    { header: 'Category', accessor: 'category' },
    {
      header: 'Units Sold (30 Days)',
      render: (row) => <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{row.total_units_sold} units sold</span>
    },
    {
      header: 'Total Revenue',
      render: (row) => <span className="font-bold text-slate-900 dark:text-[#F1F1F1]">{formatCurrency(row.total_revenue)}</span>
    },
    {
      header: 'Stock Status',
      render: (row) => <span className="text-xs font-semibold">{row.stock_quantity} in stock</span>
    }
  ];

  const slowColumns = [
    { header: 'Product Name', accessor: 'name' },
    { header: 'Category', accessor: 'category' },
    {
      header: 'Current Stock',
      render: (row) => <span className="font-bold text-amber-600 dark:text-amber-400">{row.stock_quantity} units sitting</span>
    },
    {
      header: 'Tied Capital',
      render: (row) => <span className="font-semibold text-[#C0392B] dark:text-[#E74C3C]">{formatCurrency(row.purchase_price * row.stock_quantity)}</span>
    },
    {
      header: 'Recommendation',
      render: () => <Badge variant="warning">Apply Discount / Bundle</Badge>
    }
  ];

  const logColumns = [
    {
      header: 'Date & Time',
      render: (row) => new Date(row.created_at).toLocaleString('en-IN')
    },
    { header: 'Product', accessor: 'product_name' },
    {
      header: 'Type',
      render: (row) => (
        <Badge variant={row.quantity_change > 0 ? 'success' : 'danger'}>
          {row.change_type}
        </Badge>
      )
    },
    {
      header: 'Qty Change',
      render: (row) => (
        <span className={`font-bold ${row.quantity_change > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
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
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
            <Boxes className="w-5 h-5 text-[#C0392B] dark:text-[#E74C3C]" /> Inventory & Analytics Tracking
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">Real-time stock audit, purchase entries, and fast/slow-moving intelligence</p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => window.print()} variant="secondary" icon={Printer}>
            Print Report
          </Button>

          {/* Tab Buttons */}
          <div className="flex items-center gap-1 bg-[#FAFAF8] dark:bg-[#121417] p-1 rounded-xl border border-slate-200 dark:border-[#2D3138] text-xs font-semibold">
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
                    isSelected ? 'bg-[#C0392B] dark:bg-[#E74C3C] text-white shadow-xs font-bold' : 'text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-[#F1F1F1]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
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
        <DataTable columns={logColumns} data={logs} isLoading={isLoading} emptyMessage="No inventory audit logs recorded" />
      )}

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Adjust Stock: ${selectedProduct?.name}`}
        subtitle={`Current Stock: ${selectedProduct?.stock_quantity} units | SKU: ${selectedProduct?.sku}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF] mb-1">
              Adjustment Type
            </label>
            <select
              value={changeType}
              onChange={(e) => setChangeType(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs text-slate-900 dark:text-[#F1F1F1]"
            >
              <option value="PURCHASE">Add New Purchase Stock (+)</option>
              <option value="MANUAL_ADJUSTMENT">Manual Stock Correction (+/-)</option>
              <option value="DAMAGE_LOSS">Damaged / Broken / Lost (-)</option>
              <option value="RETURN">Customer Return (+)</option>
            </select>
          </div>

          <Input
            label="Quantity Difference"
            type="number"
            value={quantityChange}
            onChange={(e) => setQuantityChange(e.target.value)}
            placeholder="e.g. 10 or -2"
            required
          />

          <Input
            label="Audit Notes / Invoice Reference"
            type="textarea"
            value={adjustmentNotes}
            onChange={(e) => setAdjustmentNotes(e.target.value)}
            placeholder="Supplier bill no, audit reason..."
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#2D3138]">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Inventory Update
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
