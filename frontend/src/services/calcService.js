/**
 * Reusable Calculation & Indian Currency Utilities for POS Billing, Invoices, Quotations & Reports
 */

/** Local calendar date YYYY-MM-DD from the browser/system clock (not UTC). */
export function todayLocalDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Parse app timestamps as local wall-clock.
 * SQLite stores "YYYY-MM-DD HH:MM:SS" without timezone — treat as system local time.
 */
export function parseAppDate(dateStr) {
  if (!dateStr && dateStr !== 0) return null;
  if (dateStr instanceof Date) {
    return Number.isNaN(dateStr.getTime()) ? null : dateStr;
  }

  const raw = String(dateStr).trim();
  if (!raw) return null;

  // Already has explicit timezone (Z or ±HH:MM)
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // YYYY-MM-DD or YYYY-MM-DD[ T]HH:MM[:SS]
  const m = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (m) {
    const d = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4] || 0),
      Number(m[5] || 0),
      Number(m[6] || 0)
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function calculateItemTotal(unitPrice = 0, quantity = 1, discountPercent = 0, gstPercent = 0) {
  const price = parseFloat(unitPrice);
  const validPrice = isNaN(price) ? 0 : price;
  const qty = parseInt(quantity);
  const validQty = isNaN(qty) ? 0 : qty;
  const disc = parseFloat(discountPercent);
  const validDisc = isNaN(disc) ? 0 : disc;
  const gst = parseFloat(gstPercent);
  const validGst = isNaN(gst) ? 0 : gst;

  const basePrice = validPrice * validQty;
  const discountAmount = basePrice * (validDisc / 100);
  const priceAfterDiscount = basePrice - discountAmount;
  const gstAmount = priceAfterDiscount * (validGst / 100);
  const total = priceAfterDiscount + gstAmount;

  return {
    basePrice,
    discountAmount,
    priceAfterDiscount,
    gstAmount,
    total: isNaN(total) ? 0 : Math.round(total * 100) / 100
  };
}

export function calculateCartTotals(items = [], overallDiscountPercent = 0, scrapValue = 0) {
  let subtotal = 0;
  let itemDiscountsTotal = 0;
  let taxAmount = 0;

  items.forEach((item) => {
    const rawPrice = item.unit_price !== undefined && item.unit_price !== null ? item.unit_price : item.selling_price;
    const calc = calculateItemTotal(
      rawPrice,
      item.quantity,
      item.discount_percent,
      item.gst_percent
    );
    subtotal += calc.priceAfterDiscount;
    itemDiscountsTotal += calc.discountAmount;
    taxAmount += calc.gstAmount;
  });

  const overallDiscount = parseFloat(overallDiscountPercent) || 0;
  const billDiscountAmount = subtotal * (overallDiscount / 100);
  const finalSubtotal = subtotal - billDiscountAmount;
  const scrap = Math.max(0, parseFloat(scrapValue) || 0);

  const rawGrandTotal = finalSubtotal + taxAmount - scrap;
  const grandTotal = Math.max(0, Math.round(rawGrandTotal * 100) / 100);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    itemDiscountsTotal: Math.round(itemDiscountsTotal * 100) / 100,
    billDiscountAmount: Math.round(billDiscountAmount * 100) / 100,
    totalDiscount: Math.round((itemDiscountsTotal + billDiscountAmount) * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    scrapValue: Math.round(scrap * 100) / 100,
    grandTotal: isNaN(grandTotal) ? 0 : grandTotal
  };
}

/** Suggest IGST when shop & customer GSTIN state codes differ. */
export function suggestInterStateTax(shopGstin = '', customerGstin = '') {
  const shop = String(shopGstin || '').trim().slice(0, 2);
  const cust = String(customerGstin || '').trim().slice(0, 2);
  if (/^\d{2}$/.test(shop) && /^\d{2}$/.test(cust) && shop !== cust) return true;
  return false;
}

/** Split total GST into CGST/SGST halves or full IGST. */
export function splitTaxAmount(taxAmount = 0, mode = 'CGST_SGST') {
  const tax = Math.max(0, Math.round((parseFloat(taxAmount) || 0) * 100) / 100);
  if (mode === 'IGST') {
    return { cgst: 0, sgst: 0, igst: tax };
  }
  const half = Math.round((tax / 2) * 100) / 100;
  const other = Math.round((tax - half) * 100) / 100;
  return { cgst: half, sgst: other, igst: 0 };
}

/**
 * Strict Indian Currency Formatter (en-IN Locale)
 * Examples:
 * 850 -> ₹850
 * 2500 -> ₹2,500
 * 125000 -> ₹1,25,000
 * 1250000 -> ₹12,50,000
 */
export function formatCurrency(amount = 0, showDecimals = false) {
  const num = parseFloat(amount) || 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: showDecimals ? 2 : 2,
    minimumFractionDigits: num % 1 === 0 ? 0 : 2
  }).format(num);

  return `₹${formatted}`;
}

export function formatDate(dateStr, includeTime = false) {
  if (!dateStr) return 'N/A';
  try {
    const d = parseAppDate(dateStr);
    if (!d) return String(dateStr);

    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();

    if (!includeTime) {
      return `${day} ${month} ${year}`;
    }

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');

    return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
  } catch (e) {
    return String(dateStr);
  }
}

/** Date + time for UI that previously used toLocaleString('en-IN'). */
export function formatDateTime(dateStr) {
  return formatDate(dateStr, true);
}
