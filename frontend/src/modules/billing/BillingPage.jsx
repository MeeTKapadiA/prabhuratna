import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import { apiRequest } from '../../services/api';
import { calculateCartTotals, formatCurrency, formatDateTime } from '../../services/calcService';
import { generateInvoicePDF, printInvoicePDF } from '../../services/pdfService';
import { useShopSettings } from '../../context/ShopSettingsContext';
import { WhatsAppIcon, shareOnWhatsApp } from '../../utils/whatsappHelper';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle,
  CreditCard,
  QrCode,
  DollarSign,
  ShoppingBag,
  Landmark,
  Building2
} from 'lucide-react';
import { enqueueInvoice, flushQueue, getQueue, isOnline } from '../../services/offlineQueue';

export default function BillingPage() {
  const { settings: shopSettings, refreshSettings } = useShopSettings();
  const [cartItems, setCartItems] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isCustomItemOpen, setIsCustomItemOpen] = useState(false);
  const [customItem, setCustomItem] = useState({
    product_name: '', unit_price: '', quantity: 1, gst_percent: 18, hsn_sac: '', unit: 'pcs'
  });
  
  // Checkout & Customer State
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerPan, setCustomerPan] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [scrapValue, setScrapValue] = useState(0);
  const [transportAmount, setTransportAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [offlineCount, setOfflineCount] = useState(() => getQueue().length);

  // Post Checkout Invoice Modal
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({});
  const [apiDown, setApiDown] = useState(false);

  useEffect(() => {
    if (shopSettings && Object.keys(shopSettings).length) {
      setSettings(shopSettings);
      setApiDown(false);
    }
  }, [shopSettings]);

  useEffect(() => {
    refreshSettings().catch(() => setApiDown(true));

    if (isOnline()) {
      flushQueue(apiRequest).then((result) => {
        if (result.synced > 0) {
          setOfflineCount(getQueue().length);
          setToast({ isOpen: true, type: 'success', message: `Synced ${result.synced} offline invoice(s)` });
        }
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleCheckout();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, type, message });
  };

  useEffect(() => {
    if (catalogSearch.trim().length > 1) {
      const timer = setTimeout(async () => {
        try {
          const res = await apiRequest(`/products?search=${encodeURIComponent(catalogSearch)}&activeOnly=true`);
          if (res.success) {
            setSearchResults(res.products);
          }
        } catch (err) {
          console.error(err);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [catalogSearch]);

  const selectCatalogProduct = (prod) => {
    addToCart(prod);
    setCatalogSearch('');
    setSearchResults([]);
    showToast(`Added ${prod.name} to cart!`, 'success');
  };

  const addToCart = (product) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.product_id === product.id);
      if (existingIdx > -1) {
        const updated = [...prev];
        const currentQty = updated[existingIdx].quantity;
        if (currentQty + 1 > product.stock_quantity) {
          showToast(`Warning: Cannot exceed stock level (${product.stock_quantity})`, 'warning');
          return prev;
        }
        updated[existingIdx].quantity += 1;
        return updated;
      } else {
        if (product.stock_quantity < 1) {
          showToast(`Cannot add ${product.name}: Out of Stock`, 'error');
          return prev;
        }
        return [
          ...prev,
          {
            product_id: product.id,
            product_name: product.name,
            barcode: '',
            sku: product.sku,
            hsn_sac: product.hsn_code || product.hsn_sac || '',
            unit: product.unit || 'pcs',
            size_variant: product.size_variant || '',
            gauge: product.gauge || '',
            unit_price: product.selling_price,
            quantity: 1,
            discount_percent: product.discount_percent || 0,
            gst_percent: product.gst_percent || 18,
            max_stock: product.stock_quantity,
            is_custom: false
          }
        ];
      }
    });
  };

  const addCustomItem = () => {
    if (!customItem.product_name.trim() || !(Number(customItem.unit_price) > 0)) {
      showToast('Enter custom item name and price', 'error');
      return;
    }
    setCartItems((prev) => [
      ...prev,
      {
        product_id: null,
        product_name: customItem.product_name.trim(),
        barcode: '',
        sku: 'CUSTOM',
        hsn_sac: customItem.hsn_sac || '',
        unit: customItem.unit || 'pcs',
        unit_price: Number(customItem.unit_price) || 0,
        quantity: Number(customItem.quantity) || 1,
        discount_percent: 0,
        gst_percent: Number(customItem.gst_percent) || 18,
        max_stock: 999999,
        is_custom: true
      }
    ]);
    setCustomItem({ product_name: '', unit_price: '', quantity: 1, gst_percent: 18, hsn_sac: '', unit: 'pcs' });
    setIsCustomItemOpen(false);
    showToast('Custom item added to cart', 'success');
  };

  const updateQuantity = (idx, newQty) => {
    if (newQty < 1) return;
    setCartItems((prev) => {
      const updated = [...prev];
      if (newQty > updated[idx].max_stock) {
        showToast(`Stock limit reached (${updated[idx].max_stock})`, 'warning');
        return prev;
      }
      updated[idx].quantity = newQty;
      return updated;
    });
  };

  const updateDiscount = (idx, disc) => {
    const val = Math.max(0, Math.min(100, parseFloat(disc) || 0));
    setCartItems((prev) => {
      const updated = [...prev];
      updated[idx].discount_percent = val;
      return updated;
    });
  };

  const updateGst = (idx, gst) => {
    const val = Math.max(0, parseFloat(gst) || 0);
    setCartItems((prev) => {
      const updated = [...prev];
      updated[idx].gst_percent = val;
      return updated;
    });
  };

  const removeFromCart = (idx) => {
    setCartItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const cartTotals = calculateCartTotals(cartItems, overallDiscount, scrapValue);
  const transportVal = Math.max(0, parseFloat(transportAmount) || 0);
  const displayGrand = Math.max(0, Math.round((cartTotals.grandTotal + transportVal) * 100) / 100);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      showToast('Cart is empty. Search catalog to add items.', 'error');
      return;
    }

    if (isNaN(displayGrand) || displayGrand <= 0) {
      showToast('Checkout blocked: Invoice Grand Total is ₹0 or invalid. Please check cart items and pricing.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const paid = amountPaid === '' || amountPaid === null
        ? (paymentMode === 'CREDIT' ? 0 : displayGrand)
        : Math.max(0, parseFloat(amountPaid) || 0);

      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        customer_gstin: customerGstin,
        customer_pan: customerPan,
        customer_address: customerAddress,
        payment_mode: paymentMode,
        amount_paid: paid,
        discount_amount: cartTotals.billDiscountAmount,
        scrap_value: cartTotals.scrapValue,
        transport_amount: transportVal,
        notes,
        items: cartItems.map((item) => ({
          product_id: item.is_custom ? null : (item.product_id || item.id || null),
          product_name: item.product_name || item.name,
          barcode: item.barcode || '',
          hsn_sac: item.hsn_sac || '',
          unit: item.unit || 'pcs',
          size_variant: item.size_variant || '',
          gauge: item.gauge || '',
          unit_price: parseFloat(item.unit_price) || 0,
          quantity: parseFloat(item.quantity) || 1,
          discount_percent: parseFloat(item.discount_percent) || 0,
          gst_percent: parseFloat(item.gst_percent) || 0,
          is_custom: Boolean(item.is_custom)
        }))
      };

      if (!isOnline()) {
        enqueueInvoice(payload);
        setOfflineCount(getQueue().length);
        setCartItems([]);
        showToast('Offline — invoice queued. Will sync when internet returns.', 'warning');
        return;
      }

      const res = await apiRequest('/billing/invoices', 'POST', payload);
      if (res.success) {
        setCompletedInvoice(res.invoice);
        setIsInvoiceModalOpen(true);
        setCartItems([]);
        setCustomerName('Walk-in Customer');
        setCustomerPhone('');
        setCustomerEmail('');
        setCustomerGstin('');
        setCustomerPan('');
        setCustomerAddress('');
        setOverallDiscount(0);
        setScrapValue(0);
        setTransportAmount(0);
        setAmountPaid('');
        setNotes('');
        setApiDown(false);
        if (res.low_stock_alerts?.length) {
          showToast(`${res.low_stock_alerts.length} product(s) are low on stock`, 'warning');
        } else {
          showToast('GST invoice generated successfully!', 'success');
        }
      }
    } catch (err) {
      if (!isOnline() || /Network Error|Failed to fetch/i.test(err.message || '')) {
        const payload = {
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          customer_gstin: customerGstin,
          customer_pan: customerPan,
          customer_address: customerAddress,
          payment_mode: paymentMode,
          amount_paid: paymentMode === 'CREDIT' ? 0 : displayGrand,
          discount_amount: cartTotals.billDiscountAmount,
          scrap_value: cartTotals.scrapValue,
          transport_amount: transportVal,
          notes,
          items: cartItems.map((item) => ({
            product_id: item.is_custom ? null : (item.product_id || null),
            product_name: item.product_name,
            barcode: item.barcode || '',
            hsn_sac: item.hsn_sac || '',
            unit: item.unit || 'pcs',
            unit_price: parseFloat(item.unit_price) || 0,
            quantity: parseFloat(item.quantity) || 1,
            discount_percent: parseFloat(item.discount_percent) || 0,
            gst_percent: parseFloat(item.gst_percent) || 0,
            is_custom: Boolean(item.is_custom)
          }))
        };
        enqueueInvoice(payload);
        setOfflineCount(getQueue().length);
        setCartItems([]);
        setApiDown(true);
        showToast('API unreachable — invoice saved offline queue', 'warning');
      } else {
        showToast(err.message || 'Failed to complete transaction', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const pdfSettings = Object.keys(shopSettings || {}).length ? shopSettings : settings;
  const showCatalogDropdown = catalogSearch.trim().length > 1 && searchResults.length > 0;

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#C0392B] dark:text-[#E74C3C]" /> Express POS Counter Billing
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">
            Search catalog · F2 checkout · Custom item if not in catalog
            {offlineCount > 0 ? ` · ${offlineCount} offline queued` : ''}
          </p>
          {apiDown && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-semibold">
              API connection issue — billing will queue offline until sync.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setIsCustomItemOpen(true)} variant="secondary" icon={Plus}>
            Custom Item
          </Button>
        </div>
      </div>

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Cart Table & Catalog Search */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live Catalog Search */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-5 h-5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchResults.length === 1) {
                    selectCatalogProduct(searchResults[0]);
                  }
                }}
                placeholder="Search products by name, SKU, or HSN..."
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-sm text-slate-900 dark:text-[#F1F1F1] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#C0392B] dark:focus:border-[#E74C3C]"
                autoFocus
              />
              {showCatalogDropdown && (
                <div className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-lg">
                  {searchResults.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => selectCatalogProduct(prod)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 dark:hover:bg-[#121417] border-b border-slate-100 dark:border-[#2D3138] last:border-b-0 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-[#F1F1F1] truncate">{prod.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-[#9CA3AF]">
                          SKU: {prod.sku} | HSN: {prod.hsn_code || prod.hsn_sac || '–'} | Stock: {prod.stock_quantity}
                        </p>
                      </div>
                      <p className="text-xs font-extrabold text-[#C0392B] dark:text-[#E74C3C] shrink-0 ml-3">
                        {formatCurrency(prod.selling_price)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart Items Table */}
          <div className="glass-panel rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 bg-[#FAFAF8] dark:bg-[#121417] border-b border-slate-200 dark:border-[#2D3138] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-[#F1F1F1]">
                Billing Cart ({cartItems.length} items)
              </span>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCartItems([])}
                  className="text-xs text-rose-500 hover:underline font-semibold cursor-pointer"
                >
                  Clear Cart
                </button>
              )}
            </div>

            <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
              {/* Desktop Table View (>= md) */}
              <table className="hidden md:table w-full text-left text-xs text-slate-900 dark:text-[#F1F1F1]">
                <thead className="bg-[#FAFAF8] dark:bg-[#121417] text-slate-500 dark:text-[#9CA3AF] border-b border-slate-200 dark:border-[#2D3138]">
                  <tr>
                    <th className="px-4 py-3">Product Name & SKU</th>
                    <th className="px-3 py-3">Rate</th>
                    <th className="px-3 py-3 text-center">Qty</th>
                    <th className="px-3 py-3 text-center">Disc %</th>
                    <th className="px-3 py-3 text-center">GST %</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                    <th className="px-3 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#2D3138]">
                  {cartItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-slate-500 dark:text-[#9CA3AF]">
                        <Search className="w-10 h-10 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
                        <p className="font-semibold text-slate-700 dark:text-[#F1F1F1]">Search catalog above to add items</p>
                        <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">Type product name, SKU, or HSN to find and add items</p>
                      </td>
                    </tr>
                  ) : (
                    cartItems.map((item, idx) => {
                      const itemTotal = (item.unit_price * item.quantity);
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#121417]/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-[#F1F1F1]">
                            <div>{item.product_name}</div>
                            <div className="text-[10px] font-mono text-slate-500 dark:text-[#9CA3AF]">SKU: {item.sku} | HSN: {item.hsn_sac || item.hsn_code || '–'}</div>
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-900 dark:text-[#F1F1F1]">
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="inline-flex items-center gap-1.5 border border-slate-300 dark:border-[#2D3138] rounded-xl p-1 bg-white dark:bg-[#121417]">
                              <button
                                type="button"
                                onClick={() => updateQuantity(idx, item.quantity - 1)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-[#1E2126] rounded text-slate-600 dark:text-[#9CA3AF] cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 font-bold text-center text-slate-900 dark:text-[#F1F1F1]">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(idx, item.quantity + 1)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-[#1E2126] rounded text-slate-600 dark:text-[#9CA3AF] cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              value={item.discount_percent}
                              onChange={(e) => updateDiscount(idx, e.target.value)}
                              className="w-12 p-1 text-center bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-lg text-slate-900 dark:text-[#F1F1F1]"
                            />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              value={item.gst_percent}
                              onChange={(e) => updateGst(idx, e.target.value)}
                              className="w-12 p-1 text-center bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-lg text-slate-900 dark:text-[#F1F1F1]"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-[#C0392B] dark:text-[#E74C3C]">
                            {formatCurrency(itemTotal)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeFromCart(idx)}
                              className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Mobile Card Touch View (< md) */}
              <div className="block md:hidden divide-y divide-slate-200 dark:divide-[#2D3138]">
                {cartItems.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 dark:text-[#9CA3AF]">
                    <Search className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                    <p className="font-bold text-slate-800 dark:text-[#F1F1F1] text-sm">Search catalog above to add items</p>
                    <p className="text-xs text-slate-500 mt-1">Type product name, SKU, or HSN to find and add items</p>
                  </div>
                ) : (
                  cartItems.map((item, idx) => (
                    <div key={idx} className="p-3.5 space-y-3 bg-white dark:bg-[#1E2126]">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-[#F1F1F1]">{item.product_name}</h4>
                          <p className="text-[10px] font-mono text-slate-500 dark:text-[#9CA3AF]">SKU: {item.sku} | HSN: {item.hsn_sac || item.hsn_code || '–'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#121417] border border-slate-200 dark:border-[#2D3138]">
                          <span className="text-[10px] text-slate-500 block">Unit Rate</span>
                          <span className="font-bold text-slate-900 dark:text-[#F1F1F1]">{formatCurrency(item.unit_price)}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#121417] border border-slate-200 dark:border-[#2D3138]">
                          <span className="text-[10px] text-slate-500 block">Item Total</span>
                          <span className="font-extrabold text-[#C0392B] dark:text-[#E74C3C]">{formatCurrency(item.unit_price * item.quantity)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Qty:</span>
                          <div className="inline-flex items-center border border-slate-300 dark:border-[#2D3138] rounded-xl p-1 bg-white dark:bg-[#121417]">
                            <button
                              type="button"
                              onClick={() => updateQuantity(idx, item.quantity - 1)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#1E2126] rounded text-slate-700 dark:text-[#F1F1F1]"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-7 font-bold text-center text-sm text-slate-900 dark:text-[#F1F1F1]">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(idx, item.quantity + 1)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#1E2126] rounded text-slate-700 dark:text-[#F1F1F1]"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <input
                            type="number"
                            value={item.discount_percent}
                            onChange={(e) => updateDiscount(idx, e.target.value)}
                            className="w-12 p-1 text-center bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-lg text-slate-900 dark:text-[#F1F1F1]"
                            placeholder="Disc %"
                          />
                          <input
                            type="number"
                            value={item.gst_percent}
                            onChange={(e) => updateGst(idx, e.target.value)}
                            className="w-12 p-1 text-center bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-lg text-slate-900 dark:text-[#F1F1F1]"
                            placeholder="GST %"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Checkout & Calculations */}
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] space-y-4 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2 border-b border-slate-200 dark:border-[#2D3138] pb-3">
              <CreditCard className="w-4 h-4 text-[#C0392B] dark:text-[#E74C3C]" /> Checkout Summary
            </h3>

            {/* Customer & Billing Inputs */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                  className="min-w-0"
                />
                <Input
                  label="Phone Number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="10-digit Mobile"
                  className="min-w-0"
                />
              </div>

              <Input
                label="Customer GSTIN (B2B)"
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                placeholder="Optional 15-char GSTIN"
                className="min-w-0"
              />

              <Input
                label="Customer PAN"
                value={customerPan}
                onChange={(e) => setCustomerPan(e.target.value.toUpperCase())}
                placeholder="Optional 10-char PAN"
                className="min-w-0"
              />

              <Input
                label="Billing Address"
                type="textarea"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Billing address"
                className="min-w-0"
                rows={2}
              />

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="min-w-0">
                  <Input
                    label="Disc %"
                    type="number"
                    value={overallDiscount}
                    onChange={(e) => setOverallDiscount(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="min-w-0 [&_input]:min-w-0 [&_input]:appearance-none"
                  />
                </div>
                <div className="min-w-0">
                  <Input
                    label="Scrap ₹"
                    type="number"
                    value={scrapValue}
                    onChange={(e) => setScrapValue(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="min-w-0 [&_input]:min-w-0"
                  />
                </div>
                <div className="min-w-0">
                  <Input
                    label="Transport ₹"
                    type="number"
                    value={transportAmount}
                    onChange={(e) => setTransportAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="min-w-0 [&_input]:min-w-0"
                  />
                </div>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF]">
                Payment Mode
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
                {[
                  { id: 'CASH', label: 'Cash', icon: DollarSign },
                  { id: 'UPI', label: 'UPI', icon: QrCode },
                  { id: 'CARD', label: 'Card', icon: CreditCard },
                  { id: 'NEFT', label: 'NEFT', icon: Landmark },
                  { id: 'RTGS', label: 'RTGS', icon: Building2 },
                  { id: 'MIXED', label: 'Split', icon: Plus },
                  { id: 'CREDIT', label: 'Udhaar', icon: CreditCard }
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = paymentMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setPaymentMode(mode.id)}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-bold border transition-all min-w-0 ${
                        isSelected
                          ? 'bg-[#C0392B]/10 dark:bg-[#E74C3C]/10 border-[#C0392B] dark:border-[#E74C3C] text-[#C0392B] dark:text-[#E74C3C]'
                          : 'bg-white dark:bg-[#121417] border-slate-200 dark:border-[#2D3138] text-slate-600 dark:text-[#9CA3AF] hover:bg-slate-100 dark:hover:bg-[#1E2126]'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1 shrink-0" />
                      <span className="truncate w-full text-center">{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Calculations */}
            <div className="p-3.5 rounded-xl bg-[#FAFAF8] dark:bg-[#121417] border border-slate-200 dark:border-[#2D3138] space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-[#9CA3AF]">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-slate-900 dark:text-[#F1F1F1]">{formatCurrency(cartTotals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-[#9CA3AF]">
                <span>Item Level Discounts:</span>
                <span className="font-semibold text-rose-500">-{formatCurrency(cartTotals.itemDiscountsTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-[#9CA3AF]">
                <span>GST (CGST/SGST or IGST):</span>
                <span className="font-semibold text-slate-900 dark:text-[#F1F1F1]">+{formatCurrency(cartTotals.taxAmount)}</span>
              </div>
              {transportVal > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-[#9CA3AF]">
                  <span>Transport:</span>
                  <span className="font-semibold text-slate-900 dark:text-[#F1F1F1]">+{formatCurrency(transportVal)}</span>
                </div>
              )}
              {cartTotals.billDiscountAmount > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-[#9CA3AF]">
                  <span>Flat Cash Discount:</span>
                  <span className="font-semibold text-rose-500">-{formatCurrency(cartTotals.billDiscountAmount)}</span>
                </div>
              )}
              {cartTotals.scrapValue > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-[#9CA3AF]">
                  <span>Less: Exchange/Scrap Value:</span>
                  <span className="font-semibold text-rose-500">-{formatCurrency(cartTotals.scrapValue)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 dark:border-[#2D3138] flex justify-between items-center text-sm">
                <span className="font-extrabold text-slate-900 dark:text-[#F1F1F1]">Grand Total:</span>
                <span className="text-xl font-extrabold text-[#C0392B] dark:text-[#E74C3C]">
                  {formatCurrency(displayGrand)}
                </span>
              </div>
            </div>

            <Input
              label={paymentMode === 'CREDIT' ? 'Amount Paid Now (Udhaar)' : 'Amount Paid (partial OK)'}
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder={String(displayGrand)}
            />

            <Button
              onClick={handleCheckout}
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isLoading}
              disabled={cartItems.length === 0}
              icon={CheckCircle}
            >
              Complete Sale (F2)
            </Button>
          </div>
        </div>
      </div>

      {/* Post Checkout Completed Invoice Modal */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Invoice Generated Successfully"
        subtitle={`Invoice No: ${completedInvoice?.invoice_number}`}
        footer={
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={() => shareOnWhatsApp('invoice', completedInvoice, pdfSettings, (msg) => showToast(msg, 'info'))}
              className="bg-[#25D366] hover:bg-[#20BD5A] text-white flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4" /> Share on WhatsApp
            </button>
            <Button
              onClick={() => printInvoicePDF(completedInvoice, pdfSettings)}
              variant="secondary"
              icon={Printer}
            >
              Print Invoice
            </Button>
            <Button
              onClick={() => generateInvoicePDF(completedInvoice, { settings: pdfSettings })}
              variant="primary"
              icon={Printer}
            >
              Download PDF Invoice
            </Button>
            <Button onClick={() => setIsInvoiceModalOpen(false)} variant="secondary">
              Close & New Bill
            </Button>
          </div>
        }
      >
        {completedInvoice && (
          <div className="space-y-4 py-2 text-xs text-slate-900 dark:text-[#F1F1F1]">
            <div className="p-4 rounded-xl bg-[#FAFAF8] dark:bg-[#121417] border border-slate-200 dark:border-[#2D3138] space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#9CA3AF]">Customer Name:</span>
                <span className="font-bold">{completedInvoice.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#9CA3AF]">Payment Method:</span>
                <Badge variant="info">{completedInvoice.payment_mode}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#9CA3AF]">Date & Time:</span>
                <span>{formatDateTime(completedInvoice.created_at)}</span>
              </div>
              {parseFloat(completedInvoice.scrap_value) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#9CA3AF]">Less: Exchange/Scrap Value:</span>
                  <span className="font-bold text-rose-500">-{formatCurrency(completedInvoice.scrap_value)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold pt-2 border-t border-slate-200 dark:border-[#2D3138]">
                <span>Total Paid Amount:</span>
                <span className="text-[#C0392B] dark:text-[#E74C3C]">{formatCurrency(completedInvoice.grand_total)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isCustomItemOpen}
        onClose={() => setIsCustomItemOpen(false)}
        title="Add Custom / Unlisted Item"
        subtitle="Use when the product is not in the catalog"
      >
        <div className="space-y-3">
          <Input
            label="Item Name *"
            value={customItem.product_name}
            onChange={(e) => setCustomItem({ ...customItem, product_name: e.target.value })}
            placeholder="e.g. Brass Fitting 1 inch"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Rate *"
              type="number"
              value={customItem.unit_price}
              onChange={(e) => setCustomItem({ ...customItem, unit_price: e.target.value })}
            />
            <Input
              label="Qty"
              type="number"
              value={customItem.quantity}
              onChange={(e) => setCustomItem({ ...customItem, quantity: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input
              label="GST %"
              type="number"
              value={customItem.gst_percent}
              onChange={(e) => setCustomItem({ ...customItem, gst_percent: e.target.value })}
            />
            <Input
              label="HSN"
              value={customItem.hsn_sac}
              onChange={(e) => setCustomItem({ ...customItem, hsn_sac: e.target.value })}
            />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF] mb-1">Unit</label>
              <select
                value={customItem.unit}
                onChange={(e) => setCustomItem({ ...customItem, unit: e.target.value })}
                className="w-full px-3 py-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-xs"
              >
                {['pcs', 'kg', 'set', 'box', 'meter', 'pair'].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          <Button onClick={addCustomItem} variant="primary" fullWidth icon={Plus}>Add to Cart</Button>
        </div>
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
