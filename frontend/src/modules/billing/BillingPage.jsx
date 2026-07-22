import React, { useState, useEffect } from 'react';
import SearchBar from '../../components/ui/SearchBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Toast from '../../components/ui/Toast';
import { apiRequest } from '../../services/api';
import { setupBarcodeScanner } from '../../services/barcodeScanner';
import { calculateCartTotals, formatCurrency } from '../../services/calcService';
import { generateInvoicePDF } from '../../services/pdfService';
import {
  ScanBarcode,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle,
  CreditCard,
  QrCode,
  DollarSign,
  Camera,
  ShoppingBag
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function BillingPage() {
  const [cartItems, setCartItems] = useState([]);
  const [manualSearch, setManualSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  
  // Checkout & Customer State
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH'); // CASH, UPI, CARD, MIXED
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  // Post Checkout Invoice Modal
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const [toast, setToast] = useState({ isOpen: false, type: 'info', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, type, message });
  };

  // Hardware Barcode Gun Listener - Instant Auto Add
  useEffect(() => {
    const cleanup = setupBarcodeScanner((scannedBarcode) => {
      fetchProductByBarcode(scannedBarcode);
    });
    return cleanup;
  }, [cartItems]);

  const fetchProductByBarcode = async (barcode) => {
    try {
      const res = await apiRequest(`/products/barcode/${barcode}`);
      if (res.success && res.product) {
        addToCart(res.product);
        showToast(`Barcode Scanned: ${res.product.name} auto-filled!`, 'success');
      }
    } catch (err) {
      showToast(`Product not found for barcode: ${barcode}`, 'error');
    }
  };

  // Search Products for Manual Add
  useEffect(() => {
    if (manualSearch.trim().length > 1) {
      const timer = setTimeout(async () => {
        try {
          const res = await apiRequest(`/products?search=${encodeURIComponent(manualSearch)}&activeOnly=true`);
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
  }, [manualSearch]);

  // Camera Scanner Setup
  useEffect(() => {
    let scanner = null;
    if (isCameraScannerOpen) {
      scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render((decodedText) => {
        fetchProductByBarcode(decodedText);
        setIsCameraScannerOpen(false);
        scanner.clear();
      }, (error) => {
        // ignore scan errors
      });
    }
    return () => {
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [isCameraScannerOpen]);

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
            barcode: product.barcode,
            sku: product.sku,
            unit_price: product.selling_price,
            quantity: 1,
            discount_percent: product.discount_percent || 0,
            gst_percent: product.gst_percent || 18,
            max_stock: product.stock_quantity
          }
        ];
      }
    });
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

  const cartTotals = calculateCartTotals(cartItems, overallDiscount);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      showToast('Cart is empty. Scan items or search to add.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        payment_mode: paymentMode,
        overall_discount: parseFloat(overallDiscount) || 0,
        notes,
        items: cartItems.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          barcode: item.barcode,
          unit_price: item.unit_price,
          quantity: item.quantity,
          discount_percent: item.discount_percent,
          gst_percent: item.gst_percent
        }))
      };

      const res = await apiRequest('/invoices', 'POST', payload);
      if (res.success) {
        setCompletedInvoice(res.invoice);
        setIsInvoiceModalOpen(true);
        // Reset Cart
        setCartItems([]);
        setCustomerName('Walk-in Customer');
        setCustomerPhone('');
        setCustomerEmail('');
        setOverallDiscount(0);
        setNotes('');
        showToast('Invoice generated successfully!', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to complete transaction', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#C0392B] dark:text-[#E74C3C]" /> Express POS Counter Billing
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF] mt-0.5">High-speed barcode scanner billing, automated GST calculation, and instant invoices</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsCameraScannerOpen(true)}
            variant="secondary"
            icon={Camera}
          >
            Camera Scanner
          </Button>

          <Button
            onClick={() => setIsSearchModalOpen(true)}
            variant="primary"
            icon={Search}
          >
            Search Catalog
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cart Table & Barcode Input */}
        <div className="lg:col-span-2 space-y-4">
          {/* Barcode Gun Input Field */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] shadow-sm">
            <div className="relative">
              <ScanBarcode className="absolute left-3.5 top-3 w-5 h-5 text-[#C0392B] dark:text-[#E74C3C] animate-pulse" />
              <input
                id="barcode-scanner-input"
                type="text"
                placeholder="Ready for USB/Bluetooth Barcode Scan... (Hit Enter)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    fetchProductByBarcode(e.target.value.trim());
                    e.target.value = '';
                  }
                }}
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-[#121417] border border-slate-300 dark:border-[#2D3138] rounded-xl text-sm font-mono text-slate-900 dark:text-[#F1F1F1] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#C0392B] dark:focus:border-[#E74C3C]"
                autoFocus
              />
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
                  onClick={() => setCartItems([])}
                  className="text-xs text-rose-500 hover:underline font-semibold"
                >
                  Clear Cart
                </button>
              )}
            </div>

            <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-900 dark:text-[#F1F1F1]">
                <thead className="bg-[#FAFAF8] dark:bg-[#121417] text-slate-500 dark:text-[#9CA3AF] border-b border-slate-200 dark:border-[#2D3138]">
                  <tr>
                    <th className="px-4 py-3">Product Name & SKU</th>
                    <th className="px-3 py-3">Rate</th>
                    <th className="px-3 py-3 text-center">Qty</th>
                    <th className="px-3 py-3 text-center">Disc %</th>
                    <th className="px-3 py-3 text-center">GST %</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                    <th className="px-3 py-3 text-center">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#2D3138]">
                  {cartItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-slate-500 dark:text-[#9CA3AF]">
                        <ScanBarcode className="w-10 h-10 mx-auto mb-2 text-slate-400 dark:text-slate-600 animate-bounce" />
                        <p className="font-semibold text-slate-700 dark:text-[#F1F1F1]">Scan Barcode to Add Item</p>
                        <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">Scanning automatically fills Product, SKU, Price, GST, and Disc %</p>
                      </td>
                    </tr>
                  ) : (
                    cartItems.map((item, idx) => {
                      const itemTotal = (item.unit_price * item.quantity);
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#121417]/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-[#F1F1F1]">
                            <div>{item.product_name}</div>
                            <div className="text-[10px] font-mono text-slate-500 dark:text-[#9CA3AF]">SKU: {item.sku} | Barcode: {item.barcode}</div>
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-900 dark:text-[#F1F1F1]">
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="inline-flex items-center gap-1.5 border border-slate-300 dark:border-[#2D3138] rounded-xl p-1 bg-white dark:bg-[#121417]">
                              <button
                                onClick={() => updateQuantity(idx, item.quantity - 1)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-[#1E2126] rounded text-slate-600 dark:text-[#9CA3AF]"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 font-bold text-center text-slate-900 dark:text-[#F1F1F1]">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(idx, item.quantity + 1)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-[#1E2126] rounded text-slate-600 dark:text-[#9CA3AF]"
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
                              onClick={() => removeFromCart(idx)}
                              className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg"
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
            </div>
          </div>
        </div>

        {/* Right Col: Checkout & Calculations */}
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-[#2D3138] bg-white dark:bg-[#1E2126] space-y-4 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-[#F1F1F1] flex items-center gap-2 border-b border-slate-200 dark:border-[#2D3138] pb-3">
              <CreditCard className="w-4 h-4 text-[#C0392B] dark:text-[#E74C3C]" /> Checkout Summary
            </h3>

            {/* Customer Details */}
            <div className="space-y-3">
              <Input
                label="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Phone Number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="10-digit Mobile"
                />
                <Input
                  label="Overall Disc (₹)"
                  type="number"
                  value={overallDiscount}
                  onChange={(e) => setOverallDiscount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#9CA3AF]">
                Payment Mode
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'CASH', label: 'Cash', icon: DollarSign },
                  { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                  { id: 'CARD', label: 'Card', icon: CreditCard },
                  { id: 'MIXED', label: 'Split', icon: Plus }
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = paymentMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setPaymentMode(mode.id)}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                        isSelected
                          ? 'bg-[#C0392B]/10 dark:bg-[#E74C3C]/10 border-[#C0392B] dark:border-[#E74C3C] text-[#C0392B] dark:text-[#E74C3C]'
                          : 'bg-white dark:bg-[#121417] border-slate-200 dark:border-[#2D3138] text-slate-600 dark:text-[#9CA3AF] hover:bg-slate-100 dark:hover:bg-[#1E2126]'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span>{mode.label}</span>
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
                <span className="font-semibold text-rose-500">-{formatCurrency(cartTotals.totalItemDiscount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-[#9CA3AF]">
                <span>Estimated Tax (GST):</span>
                <span className="font-semibold text-slate-900 dark:text-[#F1F1F1]">+{formatCurrency(cartTotals.totalGst)}</span>
              </div>
              {cartTotals.overallDiscount > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-[#9CA3AF]">
                  <span>Flat Cash Discount:</span>
                  <span className="font-semibold text-rose-500">-{formatCurrency(cartTotals.overallDiscount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 dark:border-[#2D3138] flex justify-between items-center text-sm">
                <span className="font-extrabold text-slate-900 dark:text-[#F1F1F1]">Grand Total:</span>
                <span className="text-xl font-extrabold text-[#C0392B] dark:text-[#E74C3C]">
                  {formatCurrency(cartTotals.grandTotal)}
                </span>
              </div>
            </div>

            {/* Complete Checkout CTA Button */}
            <Button
              onClick={handleCheckout}
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isLoading}
              disabled={cartItems.length === 0}
              icon={CheckCircle}
            >
              Complete Sale & Print Receipt
            </Button>
          </div>
        </div>
      </div>

      {/* Manual Search Product Modal */}
      <Modal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        title="Search Product Catalog"
        subtitle="Search products by name, SKU or barcode to add to current bill"
      >
        <div className="space-y-4">
          <SearchBar
            value={manualSearch}
            onChange={setManualSearch}
            onClear={() => setManualSearch('')}
            placeholder="Type product name, brand, SKU..."
            autoFocus
          />

          <div className="max-h-60 overflow-y-auto space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-xs text-center py-6 text-slate-500 dark:text-[#9CA3AF]">
                {manualSearch ? 'No products match search query' : 'Type at least 2 characters to search'}
              </p>
            ) : (
              searchResults.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => {
                    addToCart(prod);
                    setIsSearchModalOpen(false);
                    setManualSearch('');
                    showToast(`Added ${prod.name} to cart!`, 'success');
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#121417] border border-slate-200 dark:border-[#2D3138] hover:border-[#C0392B] dark:hover:border-[#E74C3C] cursor-pointer transition-all"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-[#F1F1F1]">{prod.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-[#9CA3AF]">SKU: {prod.sku} | Barcode: {prod.barcode} | Stock: {prod.stock_quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-[#C0392B] dark:text-[#E74C3C]">{formatCurrency(prod.selling_price)}</p>
                    <Badge variant={prod.stock_quantity > 0 ? 'success' : 'danger'}>
                      {prod.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Camera Barcode Scanner Modal */}
      <Modal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        title="Webcam Barcode Scanner"
        subtitle="Point device camera at 1D Barcode label to scan item into bill"
      >
        <div className="space-y-4 text-center">
          <div id="reader" className="w-full max-w-sm mx-auto overflow-hidden rounded-xl border border-slate-200 dark:border-[#2D3138]"></div>
          <p className="text-xs text-slate-500 dark:text-[#9CA3AF]">Position barcode clearly within box frame</p>
        </div>
      </Modal>

      {/* Post Checkout Completed Invoice Modal */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Invoice Generated Successfully"
        subtitle={`Invoice No: ${completedInvoice?.invoice_number}`}
        footer={
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              onClick={() => window.print()}
              variant="secondary"
              icon={Printer}
            >
              Print Invoice
            </Button>
            <Button
              onClick={() => generateInvoicePDF(completedInvoice)}
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
                <span>{new Date(completedInvoice.created_at).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold pt-2 border-t border-slate-200 dark:border-[#2D3138]">
                <span>Total Paid Amount:</span>
                <span className="text-[#C0392B] dark:text-[#E74C3C]">{formatCurrency(completedInvoice.grand_total)}</span>
              </div>
            </div>
          </div>
        )}
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
