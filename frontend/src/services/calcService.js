/**
 * Reusable Calculation & Indian Currency Utilities for POS Billing, Invoices, Quotations & Reports
 */

export function calculateItemTotal(unitPrice = 0, quantity = 1, discountPercent = 0, gstPercent = 0) {
  const price = parseFloat(unitPrice) || 0;
  const qty = parseInt(quantity) || 1;
  const disc = parseFloat(discountPercent) || 0;
  const gst = parseFloat(gstPercent) || 0;

  const basePrice = price * qty;
  const discountAmount = basePrice * (disc / 100);
  const priceAfterDiscount = basePrice - discountAmount;
  const gstAmount = priceAfterDiscount * (gst / 100);
  const total = priceAfterDiscount + gstAmount;

  return {
    basePrice,
    discountAmount,
    priceAfterDiscount,
    gstAmount,
    total: Math.round(total * 100) / 100
  };
}

export function calculateCartTotals(items = [], overallDiscountPercent = 0) {
  let subtotal = 0;
  let itemDiscountsTotal = 0;
  let taxAmount = 0;

  items.forEach((item) => {
    const calc = calculateItemTotal(
      item.unit_price || item.selling_price,
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
  const grandTotal = Math.round((finalSubtotal + taxAmount) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    itemDiscountsTotal: Math.round(itemDiscountsTotal * 100) / 100,
    billDiscountAmount: Math.round(billDiscountAmount * 100) / 100,
    totalDiscount: Math.round((itemDiscountsTotal + billDiscountAmount) * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    grandTotal
  };
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
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    
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
