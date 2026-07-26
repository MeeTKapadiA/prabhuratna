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
import { Boxes, ArrowUpDown, AlertTriangle, TrendingUp, TrendingDown, Plus, Minus, History, QrCode, RefreshCw, Printer } from 'lucide-react';

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
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto w-full overflow-x-hidden">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
            <Boxes className="w-5 h-5 text-[#C0392B] dark:text-[#E74C3C]" /> Inventory & Analytics Tracking
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">Real-time stock audit, purchase entries, and fast/slow-moving intelligence</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
          <Button onClick={() => window.print()} variant="secondary" icon={Printer} className="justify-center">
            Print Report
          </Button>

          {/* Scrollable Segmented Tab Control */}
          <div className="flex items-center gap-1 bg-[#FAFAF8] dark:bg-[#121417] p-1 rounded-xl border border-slate-200 dark:border-[#2D3138] text-xs font-semibold overflow-x-auto max-w-full scrollbar-none">
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
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

      {/* Stock Master View */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Search stock by product name, barcode, SKU..."
          />

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <DataTable columns={stockColumns} data={products} isLoading={isLoading} />
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-3">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading stock data...</div>
            ) : products.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 glass-panel rounded-2xl">No products match search criteria</div>
            ) : (
              products.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl glass-panel border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-[#F1F1F1]">{item.name}</h4>
                      <p className="text-[10px] font-mono text-slate-500 dark:text-[#9CA3AF]">Barcode: {item.barcode || 'N/A'} | SKU: {item.sku}</p>
                      <p className="text-xs text-slate-600 dark:text-[#9CA3AF] mt-0.5">{item.category} / {item.brand}</p>
                    </div>
                    <TableActionsMenu
                      actions={[
                        {
                          label: 'Adjust Stock Quantity',
                          icon: RefreshCw,
                          onClick: () => {
                            setSelectedProduct(item);
                            setQuantityChange('10');
                            setAdjustmentNotes('');
                            setIsModalOpen(true);
                          }
                        }
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121417] border border-slate-200 dark:border-[#2D3138]">
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Current Stock</span>
                      <span className="font-extrabold text-sm text-[#C0392B] dark:text-[#E74C3C]">{item.stock_quantity} units</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121417] border border-slate-200 dark:border-[#2D3138]">
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Stock Status</span>
                      <Badge variant={item.stock_quantity === 0 ? 'danger' : item.stock_quantity <= item.min_stock_level ? 'warning' : 'success'}>
                        {item.stock_quantity === 0 ? 'Out of Stock' : item.stock_quantity <= item.min_stock_level ? 'Low Stock Alert' : 'Healthy Stock'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs pt-1 border-t border-slate-100 dark:border-[#2D3138]/60">
                    <span className="text-slate-500">Cost: <strong className="text-slate-900 dark:text-[#F1F1F1]">{formatCurrency(item.purchase_price * item.stock_quantity)}</strong></span>
                    <span className="text-slate-500">Retail: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(item.selling_price * item.stock_quantity)}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Fast Moving View */}
      {activeTab === 'fast' && (
        <div>
          <div className="hidden md:block">
            <DataTable columns={fastColumns} data={fastMoving} isLoading={isLoading} emptyMessage="No fast moving product data available" />
          </div>

          <div className="block md:hidden space-y-3">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading fast-moving analytics...</div>
            ) : fastMoving.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 glass-panel rounded-2xl">No fast moving product data available</div>
            ) : (
              fastMoving.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl glass-panel border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] space-y-2 shadow-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-[#F1F1F1]">{item.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">{item.category}</p>
                    </div>
                    <Badge variant="success">{item.total_units_sold} Sold</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-[#2D3138]">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Total Revenue</span>
                      <span className="font-bold text-slate-900 dark:text-[#F1F1F1]">{formatCurrency(item.total_revenue)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Current Stock</span>
                      <span className="font-semibold">{item.stock_quantity} in stock</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Slow Moving View */}
      {activeTab === 'slow' && (
        <div>
          <div className="hidden md:block">
            <DataTable columns={slowColumns} data={slowMoving} isLoading={isLoading} emptyMessage="No slow moving product alerts" />
          </div>

          <div className="block md:hidden space-y-3">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading slow-moving analytics...</div>
            ) : slowMoving.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 glass-panel rounded-2xl">No slow moving product alerts</div>
            ) : (
              slowMoving.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl glass-panel border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] space-y-2 shadow-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-[#F1F1F1]">{item.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">{item.category}</p>
                    </div>
                    <Badge variant="warning">Slow Moving</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-[#2D3138]">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Stock Sitting</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{item.stock_quantity} units</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Tied Capital</span>
                      <span className="font-semibold text-[#C0392B] dark:text-[#E74C3C]">{formatCurrency(item.purchase_price * item.stock_quantity)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Audit Logs View */}
      {activeTab === 'logs' && (
        <div>
          <div className="hidden md:block">
            <DataTable columns={logColumns} data={logs} isLoading={isLoading} emptyMessage="No inventory audit logs recorded" />
          </div>

          <div className="block md:hidden space-y-3">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading audit logs...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 glass-panel rounded-2xl">No inventory audit logs recorded</div>
            ) : (
              logs.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl glass-panel border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] space-y-2 shadow-xs">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-[#F1F1F1]">{item.product_name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{new Date(item.created_at).toLocaleString('en-IN')}</p>
                    </div>
                    <Badge variant={item.quantity_change > 0 ? 'success' : 'danger'}>
                      {item.change_type}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-[#2D3138]">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Qty Change</span>
                      <span className={`font-extrabold ${item.quantity_change > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {item.quantity_change > 0 ? `+${item.quantity_change}` : item.quantity_change}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Balance Transition</span>
                      <span className="font-semibold text-slate-800 dark:text-[#F1F1F1]">{item.previous_stock} → {item.new_stock}</span>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-[11px] text-slate-500 dark:text-[#9CA3AF] bg-slate-50 dark:bg-[#121417] p-2 rounded-lg border border-slate-200 dark:border-[#2D3138]/60">
                      Note: {item.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
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
