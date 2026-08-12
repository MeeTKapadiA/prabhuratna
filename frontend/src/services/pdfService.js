import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatDate } from './calcService';

const BRAND_COLOR = [192, 57, 43]; // #C0392B (Prabhuratna Red/Maroon)

function resolveLogoFormat(logoSrc = '') {
  const src = String(logoSrc).toLowerCase();
  if (src.includes('image/jpeg') || src.includes('image/jpg') || src.endsWith('.jpg') || src.endsWith('.jpeg')) {
    return 'JPEG';
  }
  if (src.includes('image/webp') || src.endsWith('.webp')) {
    return 'WEBP';
  }
  return 'PNG';
}

function drawShopLogo(doc, settings = {}) {
  const logoSrc = settings.logo_base64 || '';
  if (!logoSrc) return false;
  try {
    doc.addImage(logoSrc, resolveLogoFormat(logoSrc), 14, 4, 20, 20);
    return true;
  } catch (e) {
    console.error('Failed to render logo in PDF:', e);
    return false;
  }
}

/** Invoice numbers like INV/2026-27/0001 break browser downloads — replace / and other unsafe chars. */
export function sanitizePdfFilename(name, fallback = 'document') {
  const cleaned = String(name || fallback)
    .replace(/[\/\\?%*:|"<>]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || fallback;
}

function itemHsn(item = {}) {
  return item.hsn_sac || item.hsn_code || '–';
}

function hasBankDetails(settings = {}) {
  return Boolean(
    settings.bank_name ||
    settings.bank_branch ||
    settings.bank_account_number ||
    settings.bank_ifsc
  );
}

/** Draw shop name + wrapped address on the left; meta block stays clear on the right. */
function drawShopHeaderBlock(doc, {
  shopName,
  shopAddress,
  shopGstin,
  shopPhone,
  shopEmail,
  metaRows = [],
  startY = 36
}) {
  const leftX = 14;
  const leftMaxWidth = 128; // leave gap before meta column at x=150
  const metaLabelX = 150;
  const metaValueX = 196;
  const lineH = 4.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const nameLines = doc.splitTextToSize(String(shopName || ''), leftMaxWidth);
  let y = startY;
  nameLines.forEach((line) => {
    doc.text(line, leftX, y);
    y += lineH;
  });

  doc.setFont('helvetica', 'normal');
  const addressLines = doc.splitTextToSize(String(shopAddress || ''), leftMaxWidth);
  addressLines.forEach((line) => {
    doc.text(line, leftX, y);
    y += lineH;
  });

  const contactLines = doc.splitTextToSize(
    `GSTIN: ${shopGstin || 'N/A'} | Ph: ${shopPhone || ''}`,
    leftMaxWidth
  );
  contactLines.forEach((line) => {
    doc.text(line, leftX, y);
    y += lineH;
  });
  const emailLines = doc.splitTextToSize(`Email: ${shopEmail || ''}`, leftMaxWidth);
  emailLines.forEach((line) => {
    doc.text(line, leftX, y);
    y += lineH;
  });
  const leftBottom = y;

  // Right meta — fixed top alignment, never overlaps wrapped address
  let metaY = startY;
  metaRows.forEach((row, idx) => {
    if (idx === 0) doc.setFont('helvetica', 'bold');
    else doc.setFont('helvetica', 'normal');
    doc.text(row.label, metaLabelX, metaY);
    doc.text(String(row.value || ''), metaValueX, metaY, { align: 'right' });
    metaY += lineH + 0.5;
  });

  return Math.max(leftBottom, metaY) + 6;
}

function drawBankDetails(doc, settings, startY) {
  if (!hasBankDetails(settings)) return startY;

  let y = startY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Bank Details for NEFT/RTGS', 14, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  if (settings.bank_name) {
    doc.text(`Bank: ${settings.bank_name}`, 14, y);
    y += 3.5;
  }
  if (settings.bank_branch) {
    doc.text(`Branch: ${settings.bank_branch}`, 14, y);
    y += 3.5;
  }
  if (settings.bank_account_number) {
    doc.text(`A/C No: ${settings.bank_account_number}`, 14, y);
    y += 3.5;
  }
  if (settings.bank_ifsc) {
    doc.text(`IFSC: ${settings.bank_ifsc}`, 14, y);
    y += 3.5;
  }
  return y + 2;
}

/**
 * PDF-specific currency formatter using 'Rs. ' prefix instead of '₹'
 * to avoid broken character glyphs in jsPDF default Helvetica font.
 */
export function formatCurrencyPDF(amount = 0, showDecimals = false) {
  const num = parseFloat(amount) || 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: num % 1 === 0 ? 0 : 2
  }).format(num);

  return `Rs. ${formatted}`;
}

export function generateInvoicePDF(invoice, options = {}) {
  const settings = options.settings || invoice.settings || {};
  const shopName = settings.shop_name || 'Prabhuratna Metals Pvt. Ltd.';
  const shopAddress = settings.shop_address || 'Main Market Road, Commercial Complex, Ahmedabad, GJ';
  const shopGstin = settings.shop_gstin || 'N/A';
  const shopPhone = settings.shop_phone || '+91 98765 43210';
  const shopEmail = settings.shop_email || 'info@prabhuratna.com';
  const footerNote = settings.invoice_footer_note || 'Thank you for shopping with us! Visit again.';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // 1. Company Header Banner
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, 210, 28, 'F');

  const hasLogo = drawShopLogo(doc, settings);
  const titleX = hasLogo ? 38 : 14;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(shopName.toUpperCase(), titleX, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('TAX INVOICE', 196, 16, { align: 'right' });

  // 2. Company Details & Invoice Metadata (address wraps; no overlap with right meta)
  const afterHeaderY = drawShopHeaderBlock(doc, {
    shopName,
    shopAddress,
    shopGstin,
    shopPhone,
    shopEmail,
    metaRows: [
      { label: 'Invoice No:', value: invoice.invoice_number || '' },
      { label: 'Date:', value: formatDate(invoice.created_at || new Date()) },
      { label: 'Payment Mode:', value: invoice.payment_mode || 'Cash' }
    ]
  });

  // 3. Customer Info Box (GSTIN / PAN only when filled)
  const customerGstin = (invoice.customer_gstin || '').trim();
  const customerPan = (invoice.customer_pan || '').trim();
  const billedLines = [
    `Customer: ${invoice.customer_name || 'Walk-in Customer'}`,
    `Phone: ${invoice.customer_phone || 'N/A'}`
  ];
  if (customerGstin) billedLines.push(`GSTIN: ${customerGstin}`);
  if (customerPan) billedLines.push(`PAN: ${customerPan}`);

  const boxHeight = 14 + billedLines.length * 5;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, afterHeaderY, 182, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('Billed To:', 18, afterHeaderY + 7);
  doc.setFont('helvetica', 'normal');
  billedLines.forEach((line, i) => {
    doc.text(line, 18, afterHeaderY + 13 + i * 5);
  });

  const tableStartY = afterHeaderY + boxHeight + 6;

  // 4. Items Table
  const tableData = (invoice.items || []).map((item, idx) => {
    const discVal = parseFloat(item.discount_percent);
    const gstVal = parseFloat(item.gst_percent);

    return [
      idx + 1,
      item.product_name || 'N/A',
      itemHsn(item),
      formatCurrencyPDF(item.unit_price),
      `${item.quantity || 1}${item.unit ? ` ${item.unit}` : ''}`,
      discVal > 0 ? `${discVal}%` : '–',
      gstVal > 0 ? `${gstVal}%` : '–',
      formatCurrencyPDF(item.total_price)
    ];
  });

  doc.autoTable({
    startY: tableStartY,
    margin: { left: 14, right: 14 },
    head: [['#', 'Description', 'HSN', 'Rate', 'Qty', 'Disc', 'GST', 'Amount']],
    body: tableData,
    headStyles: {
      fillColor: BRAND_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 16, halign: 'right' },
      6: { cellWidth: 16, halign: 'right' },
      7: { cellWidth: 28, halign: 'right' }
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak'
    },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  // 5. Totals Breakdown
  let currentY = doc.lastAutoTable.finalY + 8;
  const rightX = 196;
  const labelX = 135;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', labelX, currentY);
  doc.text(formatCurrencyPDF(invoice.subtotal), rightX, currentY, { align: 'right' });
  currentY += 5;

  doc.text('Tax (GST Total):', labelX, currentY);
  doc.text(formatCurrencyPDF(invoice.tax_amount), rightX, currentY, { align: 'right' });
  currentY += 5;

  if (parseFloat(invoice.discount_amount) > 0) {
    doc.text('Overall Bill Discount:', labelX, currentY);
    doc.text(`- ${formatCurrencyPDF(invoice.discount_amount)}`, rightX, currentY, { align: 'right' });
    currentY += 5;
  }

  const scrapVal = parseFloat(invoice.scrap_value) || 0;
  if (scrapVal > 0) {
    doc.text('Less: Exchange/Scrap Value:', labelX, currentY);
    doc.text(`- ${formatCurrencyPDF(scrapVal)}`, rightX, currentY, { align: 'right' });
    currentY += 5;
  }

  doc.setLineWidth(0.4);
  doc.setDrawColor(203, 213, 225);
  doc.line(labelX, currentY - 1, rightX, currentY - 1);

  const grandTotalY = currentY + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Grand Total:', labelX, grandTotalY);
  doc.text(formatCurrencyPDF(invoice.grand_total), rightX, grandTotalY, { align: 'right' });

  // 6. Terms & Conditions & Signatures
  const footerY = grandTotalY + 16;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions:', 14, footerY);
  doc.setFont('helvetica', 'normal');
  doc.text('1. Goods once sold will not be taken back or exchanged after 7 days.', 14, footerY + 4);
  doc.text('2. All disputes are subject to local jurisdiction.', 14, footerY + 8);
  doc.text('3. Computer Generated Tax Invoice.', 14, footerY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text(`For ${shopName}`, 196, footerY + 4, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', 196, footerY + 16, { align: 'right' });

  let afterTermsY = footerY + 22;
  afterTermsY = drawBankDetails(doc, settings, afterTermsY);

  if (footerNote) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(footerNote, 105, afterTermsY + 4, { align: 'center' });
  }

  if (options.save !== false) {
    doc.save(`${sanitizePdfFilename(invoice.invoice_number, 'invoice')}.pdf`);
  }

  return doc;
}

export function printInvoicePDF(invoice, settings = null) {
  const doc = generateInvoicePDF(invoice, { settings, save: false });
  const blobUrl = doc.output('bloburl');
  const printWindow = window.open(blobUrl, '_blank');
  if (printWindow) {
    printWindow.focus();
  }
}

export function generateQuotationPDF(quotation, options = {}) {
  const settings = options.settings || quotation.settings || {};
  const shopName = settings.shop_name || 'Prabhuratna Metals Pvt. Ltd.';
  const shopAddress = settings.shop_address || 'Main Market Road, Commercial Complex, Ahmedabad, GJ';
  const shopGstin = settings.shop_gstin || 'N/A';
  const shopPhone = settings.shop_phone || '+91 98765 43210';
  const shopEmail = settings.shop_email || 'info@prabhuratna.com';
  const footerNote = settings.invoice_footer_note || 'Thank you for shopping with us! Visit again.';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, 210, 28, 'F');

  const hasLogo = drawShopLogo(doc, settings);
  const titleX = hasLogo ? 38 : 14;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(shopName.toUpperCase(), titleX, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('COMMERCIAL QUOTATION', 196, 16, { align: 'right' });

  const metaRows = [
    { label: 'Quotation No:', value: quotation.quotation_number || '' },
    { label: 'Date:', value: formatDate(quotation.created_at || new Date()) }
  ];
  if (quotation.valid_until) {
    metaRows.push({ label: 'Valid Until:', value: formatDate(quotation.valid_until) });
  }

  const afterHeaderY = drawShopHeaderBlock(doc, {
    shopName,
    shopAddress,
    shopGstin,
    shopPhone,
    shopEmail,
    metaRows
  });

  const customerGstin = (quotation.customer_gstin || '').trim();
  const customerPan = (quotation.customer_pan || '').trim();
  const quoteLines = [
    `Company / Client: ${quotation.customer_name}`,
    `Phone: ${quotation.customer_phone || 'N/A'}  |  Email: ${quotation.customer_email || 'N/A'}`
  ];
  if (customerGstin) quoteLines.push(`GSTIN: ${customerGstin}`);
  if (customerPan) quoteLines.push(`PAN: ${customerPan}`);

  const boxHeight = 14 + quoteLines.length * 5;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, afterHeaderY, 182, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('Quotation Prepared For:', 18, afterHeaderY + 7);
  doc.setFont('helvetica', 'normal');
  quoteLines.forEach((line, i) => {
    doc.text(line, 18, afterHeaderY + 13 + i * 5);
  });

  const tableStartY = afterHeaderY + boxHeight + 6;

  const tableData = (quotation.items || []).map((item, idx) => {
    const discVal = parseFloat(item.discount_percent);
    const gstVal = parseFloat(item.gst_percent);

    return [
      idx + 1,
      item.product_name || 'N/A',
      itemHsn(item),
      formatCurrencyPDF(item.unit_price),
      item.quantity || 1,
      discVal > 0 ? `${discVal}%` : '–',
      gstVal > 0 ? `${gstVal}%` : '–',
      formatCurrencyPDF(item.total_price)
    ];
  });

  doc.autoTable({
    startY: tableStartY,
    margin: { left: 14, right: 14 },
    head: [['#', 'Product Description', 'HSN', 'Rate', 'Qty', 'Disc %', 'GST %', 'Total Amount']],
    body: tableData,
    headStyles: {
      fillColor: BRAND_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 16, halign: 'right' },
      6: { cellWidth: 16, halign: 'right' },
      7: { cellWidth: 28, halign: 'right' }
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak'
    },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  const finalY = doc.lastAutoTable.finalY + 8;
  const rightX = 196;
  const labelX = 135;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', labelX, finalY);
  doc.text(formatCurrencyPDF(quotation.subtotal), rightX, finalY, { align: 'right' });

  doc.text('Estimated GST:', labelX, finalY + 5);
  doc.text(formatCurrencyPDF(quotation.tax_amount), rightX, finalY + 5, { align: 'right' });

  doc.setLineWidth(0.4);
  doc.setDrawColor(203, 213, 225);
  doc.line(labelX, finalY + 9, rightX, finalY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Quotation Total:', labelX, finalY + 15);
  doc.text(formatCurrencyPDF(quotation.grand_total), rightX, finalY + 15, { align: 'right' });

  const footerY = finalY + 24;

  if (quotation.notes) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Special Notes: ${quotation.notes}`, 14, footerY);
  }

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Quotation Terms & Conditions:', 14, footerY + 8);
  doc.setFont('helvetica', 'normal');
  doc.text('1. Prices are valid for 30 days from the date of quotation.', 14, footerY + 12);
  doc.text('2. Delivery timelines will be confirmed upon purchase order receipt.', 14, footerY + 16);

  doc.setFont('helvetica', 'bold');
  doc.text(`For ${shopName}`, 196, footerY + 8, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Commercial Representative', 196, footerY + 20, { align: 'right' });

  let afterTermsY = footerY + 24;
  afterTermsY = drawBankDetails(doc, settings, afterTermsY);

  if (footerNote) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(footerNote, 105, afterTermsY + 4, { align: 'center' });
  }

  if (options.save !== false) {
    doc.save(`${sanitizePdfFilename(quotation.quotation_number, 'quotation')}.pdf`);
  }

  return doc;
}

export function printQuotationPDF(quotation, settings = null) {
  const doc = generateQuotationPDF(quotation, { settings, save: false });
  const blobUrl = doc.output('bloburl');
  const printWindow = window.open(blobUrl, '_blank');
  if (printWindow) {
    printWindow.focus();
  }
}
