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
import { Plus, Edit2, Trash2, Package, Globe, Eye, EyeOff, Upload, X, Image as ImageIcon, Tag } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  
  // Category Management Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    hsn_code: '',
    sku: '',
    category: 'Cookware',
    brand: 'Prabhuratna',
    purchase_price: '',
    selling_price: '',
    discount_percent: '0',
    gst_percent: '18',
    stock_quantity: '10',
    min_stock_level: '5',
    image_url: '',
    show_on_website: false,
    unit: 'pcs',
    size_variant: '',
    gauge: '',
    damaged_stock: '0',
    display_stock: '0',
    scrap_stock: '0'
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

  const fetchCategories = async () => {
    try {
      const res = await apiRequest('/categories');
      if (res.success && res.categories) {
        setCategories(res.categories);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [search, stockFilter]);

  const handleAddCategorySubmit = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await apiRequest('/categories', 'POST', { name: newCategoryName.trim() });
      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: 'Category created successfully!' });
        setNewCategoryName('');
        fetchCategories();
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.message || 'Failed to create category' });
    }
  };

  const handleStartEditCategory = (cat) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
  };

  const handleUpdateCategorySubmit = async (catId) => {
    if (!editingCategoryName.trim()) return;
    try {
      const res = await apiRequest(`/categories/${catId}`, 'PUT', { name: editingCategoryName.trim() });
      if (res.success) {
        setToast({ isOpen: true, type: 'success', message: 'Category updated successfully!' });
        setEditingCategoryId(null);
        setEditingCategoryName('');
        fetchCategories();
        fetchProducts();
      }
    } catch (err) {
      setToast({ isOpen: true, type: 'error', message: err.message || 'Failed to update category' });
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (!cat.id) return;
    if (window.confirm(`Delete category "${cat.name}"? Products using this category will be reassigned to "General".`)) {
      try {
        const res = await apiRequest(`/categories/${cat.id}`, 'DELETE');
        if (res.success) {
          setToast({ isOpen: true, type: 'success', message: 'Category deleted' });
          fetchCategories();
          fetchProducts();
        }
      } catch (err) {
        setToast({ isOpen: true, type: 'error', message: err.message || 'Failed to delete category' });
      }
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setIsCustomCategory(false);
    setFormData({
      name: '',
      hsn_code: '',
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      category: 'Cookware',
      brand: 'Prabhuratna',
      purchase_price: '',
      selling_price: '',
      discount_percent: '0',
      gst_percent: '18',
      stock_quantity: '10',
      min_stock_level: '5',
      image_url: '',
      show_on_website: false,
      unit: 'pcs',
      size_variant: '',
      gauge: '',
      damaged_stock: '0',
      display_stock: '0',
      scrap_stock: '0'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod) => {
    setEditingId(prod.id);
    const standardCategories = ['Cookware', 'Dinnerware', 'Appliances', 'Drinkware', 'Gift Sets', 'Cutlery', 'General'];
    const isCustom = !standardCategories.includes(prod.category);
    setIsCustomCategory(isCustom);

    setFormData({
      name: prod.name,
      hsn_code: prod.hsn_code || prod.hsn_sac || '',
      sku: prod.sku || '',
      category: prod.category || 'General',
      brand: prod.brand || 'Generic',
      purchase_price: prod.purchase_price,
      selling_price: prod.selling_price,
      discount_percent: prod.discount_percent,
      gst_percent: prod.gst_percent,
      stock_quantity: prod.stock_quantity,
      min_stock_level: prod.min_stock_level,
      image_url: prod.image_url || '',
      show_on_website: prod.show_on_website === 1,
      unit: prod.unit || 'pcs',
      size_variant: prod.size_variant || '',
      gauge: prod.gauge || '',
      damaged_stock: prod.damaged_stock ?? '0',
      display_stock: prod.display_stock ?? '0',
      scrap_stock: prod.scrap_stock ?? '0'
    });
    setIsModalOpen(true);
  };

  const handleImageFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setToast({ isOpen: true, type: 'error', message: 'Product image file size must be less than 5MB' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, image_url: reader.result }));
        setToast({ isOpen: true, type: 'success', message: 'Product image attached successfully!' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      hsn_sac: formData.hsn_code || '',
    };
    try {
      if (editingId) {
        await apiRequest(`/products/${editingId}`, 'PUT', payload);
        setToast({ isOpen: true, type: 'success', message: 'Product updated successfully' });
      } else {
        await apiRequest('/products', 'POST', payload);
        setToast({ isOpen: true, type: 'success', message: 'Product created' });
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
      header: 'Actions',
      className: 'w-16 text-center',
      render: (row) => (
        <TableActionsMenu
          actions={[
            {
              label: 'Edit Product',
              icon: Edit2,
              onClick: () => handleOpenEditModal(row)
            },
            {
              label: row.show_on_website === 1 ? 'Hide on Website' : 'Show on Website',
              icon: row.show_on_website === 1 ? EyeOff : Eye,
              onClick: () => handleToggleWebsiteVisibility(row)
            },
            {
              label: 'Delete Product',
              icon: Trash2,
              variant: 'danger',
              onClick: () => handleDelete(row.id)
            }
          ]}
        />
      )
    },
    {
      header: 'Product Details',
      accessor: 'name',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.image_url ? (
            <img src={row.image_url} alt={row.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-[#2D3138] flex-shrink-0" />
          ) : (
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 flex-shrink-0">
              <Package className="w-5 h-5" />
            </div>
          )}
          <div>
            <p className="font-bold text-slate-900 dark:text-[#F1F1F1]">{row.name}</p>
            <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">Brand: {row.brand}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (row) => (
        <span className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200">
          {row.category || 'General'}
        </span>
      )
    },
    {
      header: 'HSN Code / SKU',
      accessor: 'sku',
      render: (row) => (
        <div className="flex flex-col items-start gap-0.5 font-mono text-[11px] text-slate-500 dark:text-[#9CA3AF]">
          <span>SKU: {row.sku || '—'}</span>
          <span>HSN: {row.hsn_code || row.hsn_sac || '—'}</span>
        </div>
      )
    },
    {
      header: 'Purchase / Selling',
      accessor: 'selling_price',
      render: (row) => (
        <div className="text-xs">
          <p className="text-slate-500 dark:text-[#9CA3AF]">Cost: {formatCurrency(row.purchase_price)}</p>
          <p className="font-bold text-emerald-600 dark:text-emerald-400">Price: {formatCurrency(row.selling_price)}</p>
        </div>
      )
    },
    {
      header: 'Stock Level',
      accessor: 'stock_quantity',
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
      accessor: 'show_on_website',
      render: (row) => (
        <button
          onClick={() => handleToggleWebsiteVisibility(row)}
          title="Click to toggle display on customer website catalog"
          className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
            row.show_on_website === 1
              ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
              : 'bg-slate-200 dark:bg-[#121417] text-slate-500 dark:text-[#9CA3AF] border-slate-300 dark:border-[#2D3138] opacity-60 hover:opacity-100'
          }`}
        >
          {row.show_on_website === 1 ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{row.show_on_website === 1 ? 'Displayed' : 'Hidden'}</span>
        </button>
      )
    }
  ];

  const handleOpenCategoryModal = () => {
    fetchCategories();
    setIsCategoryModalOpen(true);
  };

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-sky-500" /> Product Inventory & Catalog
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage products, HSN codes, pricing, stock levels, and front website selection</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleOpenCategoryModal} variant="secondary" icon={Tag}>
            Manage Categories
          </Button>
          <Button onClick={handleOpenAddModal} variant="primary" icon={Plus}>
            Add New Product
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Filter by name, HSN, category, or SKU..."
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

      {/* Manage Categories Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Manage Product Categories"
        subtitle="Create new categories to organize products across store & website"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <form onSubmit={handleAddCategorySubmit} className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Enter new category name (e.g. Pressure Cookers)..."
              className="flex-1 p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
              required
            />
            <Button type="submit" variant="primary" icon={Plus}>
              Add
            </Button>
          </form>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Available Categories ({categories.length})</h4>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {categories.map((cat, idx) => (
                <div key={cat.id || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  {editingCategoryId === cat.id ? (
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        className="flex-1 p-1.5 bg-white dark:bg-slate-800 border border-sky-500 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateCategorySubmit(cat.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCategoryId(null)}
                        className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-semibold hover:bg-slate-300 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-sky-500" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEditCategory(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950 transition-colors cursor-pointer"
                          title="Rename Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Product' : 'Add New Product'}
        subtitle={editingId ? 'Modify product details and inventory' : 'Create a new product entry'}
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
            <Input
              label="HSN Code"
              value={formData.hsn_code}
              onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value.replace(/\D/g, '').slice(0, 8) })}
              placeholder="e.g. 7323"
              maxLength={8}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Category *</label>
              <select
                value={isCustomCategory ? 'CUSTOM' : formData.category}
                onChange={(e) => {
                  if (e.target.value === 'CUSTOM') {
                    setIsCustomCategory(true);
                  } else {
                    setIsCustomCategory(false);
                    setFormData({ ...formData, category: e.target.value });
                  }
                }}
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
              >
                {categories.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
                <option value="CUSTOM">+ Add Custom Category...</option>
              </select>
              {isCustomCategory && (
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Type custom category name..."
                  className="mt-1.5 w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                  required
                />
              )}
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
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF] mb-1">Unit</label>
              <select
                value={formData.unit || 'pcs'}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs"
              >
                {['pcs', 'kg', 'set', 'box', 'meter', 'pair'].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <Input label="Size / Variant" value={formData.size_variant || ''} onChange={(e) => setFormData({ ...formData, size_variant: e.target.value })} placeholder="5L / 24cm" />
            <Input label="Gauge" value={formData.gauge || ''} onChange={(e) => setFormData({ ...formData, gauge: e.target.value })} placeholder="18 gauge" />
            <Input label="Damaged Stock" type="number" value={formData.damaged_stock || '0'} onChange={(e) => setFormData({ ...formData, damaged_stock: e.target.value })} />
            <Input label="Display Stock" type="number" value={formData.display_stock || '0'} onChange={(e) => setFormData({ ...formData, display_stock: e.target.value })} />
            <Input label="Scrap Stock" type="number" value={formData.scrap_stock || '0'} onChange={(e) => setFormData({ ...formData, scrap_stock: e.target.value })} />
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
              className="w-4 h-4 text-sky-500 rounded border-slate-300 dark:border-slate-700 focus:ring-sky-500 cursor-pointer"
            />
          </div>

          {/* Image Upload Box - Appears ONLY when Show on Website is Enabled */}
          {formData.show_on_website && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-sky-500" /> Landing Page Product Image *
                </label>
                <span className="text-[10px] text-slate-500">Displayed on Public Showcase Catalog</span>
              </div>

              {formData.image_url ? (
                <div className="relative w-full h-36 rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center group">
                  <img src={formData.image_url} alt="Product Preview" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: '' })}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-md cursor-pointer"
                    title="Remove Image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:border-sky-500 dark:hover:border-sky-500 bg-white dark:bg-slate-900 transition-colors">
                    <div className="flex flex-col items-center justify-center py-2 text-center">
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Click to upload product image file</p>
                      <p className="text-[10px] text-slate-500">PNG, JPG, WebP up to 5MB</p>
                    </div>
                    <input type="file" accept="image/*" onChange={handleImageFileUpload} className="hidden" />
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Or Image Link:</span>
                    <input
                      type="url"
                      value={formData.image_url || ''}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="Paste image URL (https://...)"
                      className="flex-1 p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

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
