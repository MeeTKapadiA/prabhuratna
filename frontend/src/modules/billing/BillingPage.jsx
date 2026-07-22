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
      }, (error) => {});
    }
    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error(e));
      }
    };
  }, [isCameraScannerOpen]);

  const addToCart = (product) => {
    if (product.stock_quantity <= 0) {
      showToast(`Warning: ${product.name} is Out of Stock!`, 'warning');
    }

    setCartItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.product_id === product.id);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        updated[existingIdx].total_price = (updated[existingIdx].unit_price * updated[existingIdx].quantity);
        return updated;
      } else {
        const unitPrice = product.selling_price;
        return [
          ...prev,
          {
            product_id: product.id,
            product_name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            unit_price: unitPrice,
            quantity: 1, // default 1
            discount_percent: product.discount_percent || 0,
            gst_percent: product.gst_percent || 18,
            total_price: unitPrice,
            max_stock: product.stock_quantity
          }
        ];
      }
    });
  };

  const updateQuantity = (index, delta) => {
    setCartItems((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, idx) => idx !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const updateItemField = (index, field, val) => {
    setCartItems((prev) => {
      const updated = [...prev];
      updated[index][field] = parseFloat(val) || 0;
      return updated;
    });
  };

  const removeItem = (index) => {
    setCartItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const totals = calculateCartTotals(cartItems, overallDiscount);

  // Complete Billing Checkout
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      showToast('Cart is empty! Scan barcodes to start billing.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        discount_amount: totals.billDiscountAmount,
        grand_total: totals.grandTotal,
        payment_mode: paymentMode,
        notes: notes,
        items: cartItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          barcode: item.barcode,
          unit_price: item.unit_price,
          quantity: item.quantity,
          discount_percent: item.discount_percent,
          gst_percent: item.gst_percent,
          total_price: (item.unit_price * item.quantity)
        }))
      };

      const res = await apiRequest('/billing/invoices', 'POST', payload);
      if (res.success) {
        setCompletedInvoice(res.invoice);
        setIsInvoiceModalOpen(true);
        // Reset Cart
        setCartItems([]);
        setCustomerName('Walk-in Customer');
        setCustomerPhone('');
        setCustomerEmail('');
        setNotes('');
        setOverallDiscount(0);
        showToast('Invoice created & stock updated!', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Checkout failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      {/* Top POS Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 dark:text-slate-100 light:text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-sky-500" /> POS Barcode Billing Terminal
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Scan barcode for instant auto-fill or search manually</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsSearchModalOpen(true)}
            variant="secondary"
            icon={Search}
          >
            Manual Search
          </Button>

          <Button
            onClick={() => setIsCameraScannerOpen(true)}
            variant="outline"
            icon={Camera}
          >
            Camera Scanner
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cart Table & Barcode Input */}
        <div className="lg:col-span-2 space-y-4">
          {/* Barcode Gun Input Field */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800">
            <div className="relative">
              <ScanBarcode className="absolute left-3.5 top-3 w-5 h-5 text-sky-500 animate-pulse" />
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
                className="w-full pl-11 pr-4 py-2.5 bg-slate-900/90 dark:bg-slate-900/90 light:bg-white border border-sky-500/40 rounded-xl text-sm font-mono text-sky-300 dark:text-sky-300 light:text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30"
                autoFocus
              />
            </div>
          </div>

          {/* Cart Items Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900/80 dark:bg-slate-900/80 light:bg-slate-100 border-b border-slate-800 dark:border-slate-800 light:border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700">
                Billing Cart ({cartItems.length} items)
              </span>
              {cartItems.length > 0 && (
                <button
                  onClick={() => setCartItems([])}
                  className="text-xs text-rose-400 hover:underline font-medium"
                >
                  Clear Cart
                </button>
              )}
            </div>

            <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-200 dark:text-slate-200 light:text-slate-800">
                <thead className="bg-slate-900/50 dark:bg-slate-900/50 light:bg-slate-100 text-slate-400 border-b border-slate-800">
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
                <tbody className="divide-y divide-slate-800/60 dark:divide-slate-800/60 light:divide-slate-200">
                  {cartItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                        <ScanBarcode className="w-10 h-10 mx-auto mb-2 text-slate-600 animate-bounce" />
                        <p className="font-semibold text-slate-400">Scan Barcode to Add Item</p>
                        <p className="text-xs text-slate-500">Scanning automatically fills Product, SKU, Price, GST, and Disc %</p>
                      </td>
                    </tr>
                  ) : (
                    cartItems.map((item, idx) => {
                      const itemTotal = (item.unit_price * item.quantity);
                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 dark:hover:bg-slate-800/40 light:hover:bg-slate-100">
                          <td className="px-4 py-3 font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900">
                            <div>{item.product_name}</div>
                            <div className="text-[10px] font-mono text-slate-400">SKU: {item.sku} | Barcode: {item.barcode}</div>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => updateItemField(idx, 'unit_price', e.target.value)}
                              className="w-20 px-2 py-1 bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-700 rounded text-right text-xs"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => updateQuantity(idx, -1)}
                                className="p-1 rounded bg-slate-800 dark:bg-slate-800 light:bg-slate-200 hover:bg-slate-700 text-slate-300"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-bold">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(idx, 1)}
                                className="p-1 rounded bg-slate-800 dark:bg-slate-800 light:bg-slate-200 hover:bg-slate-700 text-slate-300"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              value={item.discount_percent}
                              onChange={(e) => updateItemField(idx, 'discount_percent', e.target.value)}
                              className="w-12 px-1 py-1 bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-700 rounded text-center text-xs"
                            />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              value={item.gst_percent}
                              onChange={(e) => updateItemField(idx, 'gst_percent', e.target.value)}
                              className="w-12 px-1 py-1 bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-700 rounded text-center text-xs"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-sky-500">
                            {formatCurrency(itemTotal)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => removeItem(idx)}
                              className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
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

        {/* Right 1 Col: Customer Details, Payment & Checkout */}
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700 border-b border-slate-800 pb-2">
              Customer Information
            </h3>

            <Input
              label="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in Customer"
            />

            <Input
              label="Phone Number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="9876543210"
            />
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 dark:text-slate-300 light:text-slate-700 border-b border-slate-800 pb-2">
              Payment Mode
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'CASH', label: 'Cash', icon: DollarSign },
                { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                { id: 'CARD', label: 'Card', icon: CreditCard },
                { id: 'MIXED', label: 'Mixed Mode', icon: ShoppingBag }
              ].map((mode) => {
                const Icon = mode.icon;
                const isSelected = paymentMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMode(mode.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                        : 'bg-slate-900 dark:bg-slate-900 light:bg-slate-100 border-slate-800 dark:border-slate-800 light:border-slate-300 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>

            <Input
              label="Overall Bill Discount (%)"
              type="number"
              value={overallDiscount}
              onChange={(e) => setOverallDiscount(e.target.value)}
              placeholder="0"
            />
          </div>

          {/* Grand Total Summary Box */}
          <div className="glass-panel p-5 rounded-2xl border border-sky-500/30 bg-gradient-to-b from-sky-950/20 to-slate-900 space-y-3">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800">{formatCurrency(totals.subtotal)}</span>
            </div>

            <div className="flex justify-between text-xs text-slate-400">
              <span>GST Tax Amount:</span>
              <span className="font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800">{formatCurrency(totals.taxAmount)}</span>
            </div>

            {totals.billDiscountAmount > 0 && (
              <div className="flex justify-between text-xs text-emerald-400">
                <span>Bill Discount:</span>
                <span>- {formatCurrency(totals.billDiscountAmount)}</span>
              </div>
            )}

            <div className="border-t border-slate-800 pt-3 flex justify-between items-baseline">
              <span className="text-sm font-bold text-slate-100 dark:text-slate-100 light:text-slate-900">Grand Total:</span>
              <span className="text-2xl font-extrabold text-sky-400">{formatCurrency(totals.grandTotal)}</span>
            </div>

            <Button
              onClick={handleCheckout}
              variant="success"
              size="lg"
              fullWidth
              isLoading={isLoading}
              isDisabled={cartItems.length === 0}
              icon={CheckCircle}
            >
              Complete Bill & Generate Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* Manual Search Modal */}
      <Modal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        title="Search & Add Product"
        subtitle="Lookup products by Name, Barcode, or SKU"
      >
        <div className="space-y-4">
          <SearchBar
            value={manualSearch}
            onChange={setManualSearch}
            onClear={() => setManualSearch('')}
            placeholder="Type product name, barcode..."
            autoFocus
          />

          <div className="max-h-60 overflow-y-auto space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-6">Type at least 2 characters to search products</p>
            ) : (
              searchResults.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => {
                    addToCart(prod);
                    setIsSearchModalOpen(false);
                    showToast(`Added ${prod.name}`, 'success');
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500 cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{prod.name}</p>
                    <p className="text-xs text-slate-400 font-mono">Barcode: {prod.barcode} | Stock: {prod.stock_quantity}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-sky-400">{formatCurrency(prod.selling_price)}</span>
                    <Badge variant={prod.stock_quantity > 0 ? 'success' : 'danger'} size="sm" className="block mt-1">
                      {prod.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Camera Scanner Modal */}
      <Modal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        title="Mobile Camera Barcode Scanner"
        subtitle="Point camera at product barcode"
      >
        <div className="flex flex-col items-center">
          <div id="reader" className="w-full max-w-sm border border-slate-700 rounded-xl overflow-hidden" />
        </div>
      </Modal>

      {/* Post Checkout Invoice Modal */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Invoice Generated Successfully"
        subtitle={`Invoice No: ${completedInvoice?.invoice_number}`}
        footer={
          <div className="flex gap-2">
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
          <div className="space-y-4 text-xs">
            <div className="flex justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
              <div>
                <p className="text-slate-400">Customer Name:</p>
                <p className="font-bold text-slate-100">{completedInvoice.customer_name}</p>
              </div>
              <div>
                <p className="text-slate-400">Payment Mode:</p>
                <Badge variant="info">{completedInvoice.payment_mode}</Badge>
              </div>
              <div>
                <p className="text-slate-400">Grand Total:</p>
                <p className="font-extrabold text-sky-400 text-sm">{formatCurrency(completedInvoice.grand_total)}</p>
              </div>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2">Qty</th>
                    <th className="p-2 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {completedInvoice.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-medium">{it.product_name}</td>
                      <td className="p-2">{it.quantity}</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(it.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <Toast {...toast} onClose={() => setToast((t) => ({ ...t, isOpen: false }))} />
    </div>
  );
}
