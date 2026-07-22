import React, { useState, useEffect } from 'react';
import SearchBar from '../../components/ui/SearchBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import BarcodeGenerator from '../../components/ui/BarcodeGenerator';
import { apiRequest } from '../../services/api';
import { formatCurrency } from '../../services/calcService';
import { Plus, Edit2, Trash2, Package, ScanBarcode, RefreshCw, QrCode, Globe, Eye, EyeOff } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Barcode Viewer Modal State
  const [selectedBarcodeProd, setSelectedBarcodeProd] = useState(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    sku: '',
    category: 'Cookware',
    brand: 'Prabhuratna',
    purchase_price: '',
    selling_price: '',
    discount_percent: '0',
    gst_percent: '18',
    stock_quantity: '10',
    min_stock_level: '5',
    show_on_website: true
  });

  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      let query = `/products?search=${encodeURIComponent(search)}`;
      if (stockFilter) query += `&stockStatus=${stockFilter}`;
      const res = await apiRequest(query);
      if (res.success) {
        setProducts(res.products);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, stockFilter]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      barcode: `890${Date.now().toString().slice(-9)}`,
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      category: 'Cookware',
      brand: 'Prabhuratna',
      purchase_price: '',
      selling_price: '',
      discount_percent: '0',
      gst_percent: '18',
      stock_quantity: '10',
      min_stock_level: '5',
      show_on_website: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod) => {
    setEditingId(prod.id);
    setFormData({
      name: prod.name,
      barcode: prod.barcode || '',
      sku: prod.sku || '',
      category: prod.category || 'General',
      brand: prod.brand || 'Generic',
      purchase_price: prod.purchase_price,
      selling_price: prod.selling_price,
      discount_percent: prod.discount_percent,
      gst_percent: prod.gst_percent,
      stock_quantity: prod.stock_quantity,
      min_stock_level: prod.min_stock_level,
      show_on_website: prod.show_on_website === 1
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiRequest(`/products/${editingId}`, 'PUT', formData);
        setToast({ isOpen: true, type: 'success', message: 'Product updated successfully' });
      } else {
        await apiRequest('/products', 'POST', formData);
        setToast({ isOpen: true, type: 'success', message: 'Product created with generated barcode' });
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.message || 'Operation failed' });
    }
  };

  const handleToggleWebsiteVisibility = async (prod) => {
    try {
      const res = await apiRequest(`/products/${prod.id}/toggle-website`, 'PATCH');
      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: res.message });
        fetchProducts();
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: 'Failed to update website display' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await apiRequest(`/products/${id}`, 'DELETE');
        setToast({ isOpen: true, type: 'success', message: 'Product deleted' });
        fetchProducts();
      } catch (err) {
        setToast({ isOpen: true, type: 'error', message: err.message || 'Failed to delete' });
      }
    }
  };

  const columns = [
    {
      header: 'Product Details',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">{row.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Category: {row.category} | Brand: {row.brand}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Visual Barcode',
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          {row.barcode ? (
            <div
              onClick={() => {
                setSelectedBarcodeProd(row);
                setIsBarcodeModalOpen(true);
              }}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              title="Click to download or print barcode"
            >
              <BarcodeGenerator value={row.barcode} width={1.2} height={28} displayValue={true} />
            </div>
          ) : (
            <span className="text-xs text-slate-500">No Barcode</span>
          )}
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">SKU: {row.sku}</span>
        </div>
      )
    },
    {
      header: 'Purchase / Selling',
      render: (row) => (
        <div className="text-xs">
          <p className="text-slate-500 dark:text-slate-400">Cost: {formatCurrency(row.purchase_price)}</p>
          <p className="font-bold text-emerald-600 dark:text-emerald-400">Price: {formatCurrency(row.selling_price)}</p>
        </div>
      )
    },
    {
      header: 'Stock Level',
      render: (row) => {
        let badgeVariant = 'success';
        let text = `${row.stock_quantity} in stock`;
        if (row.stock_quantity <= 0) {
          badgeVariant = 'danger';
          text = 'Out of Stock';
        } else if (row.stock_quantity <= row.min_stock_level) {
          badgeVariant = 'warning';
          text = `Low Stock (${row.stock_quantity})`;
        }
        return <Badge variant={badgeVariant}>{text}</Badge>;
      }
    },
    {
      header: 'Website Display',
      render: (row) => (
        <button
          onClick={() => handleToggleWebsiteVisibility(row)}
          title="Click to toggle display on customer website catalog"
          className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
            row.show_on_website === 1
              ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 opacity-60 hover:opacity-100'
          }`}
        >
          {row.show_on_website === 1 ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{row.show_on_website === 1 ? 'Displayed' : 'Hidden'}</span>
        </button>
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setSelectedBarcodeProd(row);
              setIsBarcodeModalOpen(true);
            }}
            title="Download / Print Barcode"
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-sky-500"
          >
            <ScanBarcode className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenEditModal(row)}
            title="Edit Product"
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-amber-500"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            title="Delete Product"
            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-500 dark:text-rose-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-sky-500" /> Product Inventory & Barcode Catalog
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage products, visual barcodes, pricing, stock levels, and front website selection</p>
        </div>

        <Button onClick={handleOpenAddModal} variant="primary" icon={Plus}>
          Add New Product
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Filter by barcode, name, category, or SKU..."
          />
        </div>

        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="px-3 py-2.5 bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-sky-500"
        >
          <option value="">All Stock Statuses</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock Alerts</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      {/* Products Table */}
      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
        emptyMessage="No products match your search criteria"
      />

      {/* Barcode Viewer & Download Modal */}
      <Modal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        title={`Barcode Label: ${selectedBarcodeProd?.name}`}
        subtitle={`Barcode: ${selectedBarcodeProd?.barcode} | SKU: ${selectedBarcodeProd?.sku}`}
        maxWidth="max-w-md"
      >
        {selectedBarcodeProd && (
          <div className="space-y-4 py-2 text-center">
            <BarcodeGenerator
              value={selectedBarcodeProd.barcode}
              productName={selectedBarcodeProd.name}
              price={selectedBarcodeProd.selling_price}
              width={2}
              height={60}
              displayValue={true}
              showActions={true}
            />
          </div>
        )}
      </Modal>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Product' : 'Add New Product'}
        subtitle={editingId ? 'Modify product details and inventory' : 'Create new product with auto-generated barcode'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Product Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Heavy Steel Kadhai 3L"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="SKU Code *"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="e.g. SKU-KADAI-3L"
              required
            />
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                1D Barcode Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="e.g. 890123456789"
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, barcode: `890${Date.now().toString().slice(-9)}` })}
                  className="px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 text-xs flex items-center gap-1"
                  title="Generate New Barcode"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="Cookware">Cookware & Utensils</option>
                <option value="Dinnerware">Dinner Thali Sets</option>
                <option value="Appliances">Kitchen & Home Appliances</option>
                <option value="Drinkware">Copper & Brassware</option>
                <option value="Gift Sets">Gift & Marriage Sets</option>
                <option value="General">General</option>
              </select>
            </div>

            <Input
              label="Brand"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="e.g. Hawkins / Prestige / Prabhuratna"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="Cost Price (₹)"
              type="number"
              step="0.01"
              value={formData.purchase_price}
              onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
              placeholder="0.00"
              required
            />
            <Input
              label="Selling Price (₹)"
              type="number"
              step="0.01"
              value={formData.selling_price}
              onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
              placeholder="0.00"
              required
            />
            <Input
              label="Discount %"
              type="number"
              value={formData.discount_percent}
              onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
              placeholder="0"
            />
            <Input
              label="GST %"
              type="number"
              value={formData.gst_percent}
              onChange={(e) => setFormData({ ...formData, gst_percent: e.target.value })}
              placeholder="18"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Current Stock Quantity"
              type="number"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              placeholder="10"
              required
            />
            <Input
              label="Min Alert Level"
              type="number"
              value={formData.min_stock_level}
              onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
              placeholder="5"
            />
          </div>

          {/* Website Display Checkbox */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-500" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Show in Customer Website Catalog</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Display this product on the public homepage catalog</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.show_on_website}
              onChange={(e) => setFormData({ ...formData, show_on_website: e.target.checked })}
              className="w-4 h-4 text-sky-500 rounded border-slate-300 dark:border-slate-700 focus:ring-sky-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingId ? 'Update Product' : 'Create Product'}
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
