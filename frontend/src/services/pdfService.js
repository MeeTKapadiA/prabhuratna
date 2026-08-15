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
  const leftMaxWidth = 118; // leave room for meta labels + values
  const metaLabelRightX = 158; // labels right-aligned here
  const metaValueX = 196; // values right-aligned at page edge
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

  // Right meta: label column | value column (no overlap)
  let metaY = startY;
  metaRows.forEach((row, idx) => {
    if (idx === 0) doc.setFont('helvetica', 'bold');
    else doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(String(row.label || ''), metaLabelRightX, metaY, { align: 'right' });
    const value = String(row.value || '');
    // Keep long values inside the value column
    const maxValueWidth = metaValueX - metaLabelRightX - 4;
    const valueLines = doc.splitTextToSize(value, maxValueWidth);
    valueLines.forEach((line, lineIdx) => {
      doc.text(line, metaValueX, metaY + lineIdx * lineH, { align: 'right' });
    });
    metaY += Math.max(1, valueLines.length) * (lineH + 0.5);
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
 * Always shows 2 decimal places (paise) to match physical tax invoices.
 */
export function formatCurrencyPDF(amount = 0) {
  const num = parseFloat(amount) || 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);

  return `Rs. ${formatted}`;
}

/** Draw CGST/SGST or IGST rows; returns next Y. */
function drawGstBreakdown(doc, { cgst = 0, sgst = 0, igst = 0, taxAmount = 0 }, labelX, rightX, startY) {
  let y = startY;
  const igstVal = parseFloat(igst) || 0;
  const cgstVal = parseFloat(cgst) || 0;
  const sgstVal = parseFloat(sgst) || 0;
  const taxVal = parseFloat(taxAmount) || 0;

  if (igstVal > 0) {
    return drawSummaryRow(doc, {
      label: 'IGST:',
      value: formatCurrencyPDF(igstVal),
      y,
      labelX,
      rightX
    });
  }

  if (cgstVal > 0 || sgstVal > 0) {
    y = drawSummaryRow(doc, {
      label: 'CGST:',
      value: formatCurrencyPDF(cgstVal),
      y,
      labelX,
      rightX
    });
    return drawSummaryRow(doc, {
      label: 'SGST:',
      value: formatCurrencyPDF(sgstVal),
      y,
      labelX,
      rightX
    });
  }

  if (taxVal > 0) {
    const half = Math.round((taxVal / 2) * 100) / 100;
    const other = Math.round((taxVal - half) * 100) / 100;
    y = drawSummaryRow(doc, {
      label: 'CGST:',
      value: formatCurrencyPDF(half),
      y,
      labelX,
      rightX
    });
    return drawSummaryRow(doc, {
      label: 'SGST:',
      value: formatCurrencyPDF(other),
      y,
      labelX,
      rightX
    });
  }

  return y;
}

/**
 * Draw a totals-block label/value pair without overlap.
 * Shrinks/shortens label or shifts labelX left so labelWidth + valueWidth + 5mm gap fits.
 */
function drawSummaryRow(doc, {
  label,
  value,
  y,
  labelX = 120,
  rightX = 196,
  fontSize = 8.5,
  boldLabel = false,
  boldValue = false,
  valueFontSize = null
}) {
  const minGap = 5;
  const shortAliases = {
    'Total Amount After Tax:': 'Total (After Tax):',
    'Total Amount Before Tax:': 'Total (Before Tax):',
    'Less: Exchange/Scrap Value:': 'Less: Scrap Value:',
    'Overall Bill Discount:': 'Bill Discount:',
    'Transport / Freight:': 'Transport:'
  };

  let labelText = String(label || '');
  const valueText = String(value || '');
  const vSize = valueFontSize || (boldValue ? Math.max(fontSize, 10) : fontSize);

  const measure = (text, size, bold) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    return doc.getTextWidth(text);
  };

  let labelW = measure(labelText, fontSize, boldLabel);
  let valueW = measure(valueText, vSize, boldValue);
  let lx = labelX;

  if (labelW + valueW + minGap > rightX - lx && shortAliases[labelText]) {
    labelText = shortAliases[labelText];
    labelW = measure(labelText, fontSize, boldLabel);
  }

  if (labelW + valueW + minGap > rightX - lx) {
    lx = Math.max(14, rightX - valueW - minGap - labelW);
  }

  // Final safety: if still impossible, truncate label with ellipsis
  if (labelW + valueW + minGap > rightX - lx) {
    const maxLabelW = Math.max(20, rightX - lx - valueW - minGap);
    while (labelText.length > 4 && measure(labelText, fontSize, boldLabel) > maxLabelW) {
      labelText = `${labelText.slice(0, -2)}…`;
    }
    labelW = measure(labelText, fontSize, boldLabel);
    if (labelW + valueW + minGap > rightX - lx) {
      lx = Math.max(14, rightX - valueW - minGap - labelW);
    }
  }

  doc.setFont('helvetica', boldLabel ? 'bold' : 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(30, 41, 59);
  doc.text(labelText, lx, y);

  doc.setFont('helvetica', boldValue ? 'bold' : 'normal');
  doc.setFontSize(vSize);
  doc.text(valueText, rightX, y, { align: 'right' });

  return y + (boldValue ? 6 : 5);
}

/** Build billed-to lines with wrapped address; returns { lines, height }. */
function buildCustomerBoxLines(doc, {
  titlePrefix = 'Customer',
  name,
  phone,
  email,
  address,
  gstin,
  pan
}) {
  const maxWidth = 174;
  const lines = [`${titlePrefix}: ${name || 'Walk-in Customer'}`];
  if (phone || email) {
    lines.push(`Phone: ${phone || 'N/A'}${email ? `  |  Email: ${email}` : ''}`);
  } else {
    lines.push(`Phone: ${phone || 'N/A'}`);
  }
  const addr = String(address || '').trim();
  if (addr) {
    const wrapped = doc.splitTextToSize(`Address: ${addr}`, maxWidth);
    wrapped.forEach((w) => lines.push(w));
  }
  if (gstin) lines.push(`GSTIN: ${gstin}`);
  if (pan) lines.push(`PAN: ${pan}`);
  return lines;
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
  const metaRows = [
    { label: 'Invoice No:', value: invoice.invoice_number || '' },
    { label: 'Date:', value: formatDate(invoice.created_at || new Date()) }
  ];
  if (String(invoice.po_number || '').trim()) {
    metaRows.push({ label: 'PO Number:', value: String(invoice.po_number).trim() });
  }
  metaRows.push({ label: 'Payment Mode:', value: invoice.payment_mode || 'Cash' });

  const afterHeaderY = drawShopHeaderBlock(doc, {
    shopName,
    shopAddress,
    shopGstin,
    shopPhone,
    shopEmail,
    metaRows
  });

  // 3. Customer Info Box (address + GSTIN / PAN when filled)
  const customerGstin = (invoice.customer_gstin || '').trim();
  const customerPan = (invoice.customer_pan || '').trim();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const billedLines = buildCustomerBoxLines(doc, {
    titlePrefix: 'Customer',
    name: invoice.customer_name,
    phone: invoice.customer_phone,
    email: invoice.customer_email,
    address: invoice.customer_address,
    gstin: customerGstin,
    pan: customerPan
  });

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
  const isCommercial = String(invoice.bill_type || '').toLowerCase() === 'commercial';

  const tableData = (invoice.items || []).map((item, idx) => {
    const discVal = parseFloat(item.discount_percent);
    const gstVal = parseFloat(item.gst_percent);

    if (isCommercial) {
      return [
        idx + 1,
        item.product_name || 'N/A',
        itemHsn(item),
        formatCurrencyPDF(item.unit_price),
        item.quantity || 1,
        item.unit || 'pcs',
        gstVal > 0 ? `${gstVal}%` : '–',
        formatCurrencyPDF(item.total_price)
      ];
    }

    return [
      idx + 1,
      item.product_name || 'N/A',
      itemHsn(item),
      formatCurrencyPDF(item.unit_price),
      item.quantity || 1,
      item.unit || 'pcs',
      discVal > 0 ? `${discVal}%` : '–',
      gstVal > 0 ? `${gstVal}%` : '–',
      formatCurrencyPDF(item.total_price)
    ];
  });

  const tableHead = isCommercial
    ? [['Sr No.', 'Description', 'HSN', 'Rate', 'Qty', 'Unit', 'GST', 'Amount']]
    : [['Sr No.', 'Description', 'HSN', 'Rate', 'Qty', 'Unit', 'Disc', 'GST', 'Amount']];

  const columnStyles = isCommercial
    ? {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 24, halign: 'center' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 16, halign: 'center' },
        6: { cellWidth: 16, halign: 'right' },
        7: { cellWidth: 28, halign: 'right' }
      }
    : {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 24, halign: 'right' },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 14, halign: 'center' },
        6: { cellWidth: 14, halign: 'right' },
        7: { cellWidth: 14, halign: 'right' },
        8: { cellWidth: 26, halign: 'right' }
      };

  doc.autoTable({
    startY: tableStartY,
    margin: { left: 14, right: 14 },
    head: tableHead,
    body: tableData,
    headStyles: {
      fillColor: BRAND_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    columnStyles,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak'
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      if (data.section === 'head') {
        const colStyle = columnStyles[data.column.index];
        if (colStyle && colStyle.halign) {
          data.cell.styles.halign = colStyle.halign;
        }
      }
    }
  });

  // 5. Totals Breakdown — width-safe label/value pairs (no overlap)
  let currentY = doc.lastAutoTable.finalY + 8;
  const rightX = 196;
  const labelX = 120;

  currentY = drawSummaryRow(doc, {
    label: 'Total Amount Before Tax:',
    value: formatCurrencyPDF(invoice.subtotal),
    y: currentY,
    labelX,
    rightX
  });

  if (invoice.bill_type !== 'commercial' && parseFloat(invoice.discount_amount) > 0) {
    currentY = drawSummaryRow(doc, {
      label: 'Overall Bill Discount:',
      value: `- ${formatCurrencyPDF(invoice.discount_amount)}`,
      y: currentY,
      labelX,
      rightX
    });
  }

  const scrapVal = parseFloat(invoice.scrap_value) || 0;
  if (scrapVal > 0) {
    currentY = drawSummaryRow(doc, {
      label: 'Less: Exchange/Scrap Value:',
      value: `- ${formatCurrencyPDF(scrapVal)}`,
      y: currentY,
      labelX,
      rightX
    });
  }

  const transportVal = parseFloat(invoice.transport_amount) || 0;
  if (transportVal > 0) {
    currentY = drawSummaryRow(doc, {
      label: 'Transport / Freight:',
      value: formatCurrencyPDF(transportVal),
      y: currentY,
      labelX,
      rightX
    });
  }

  currentY = drawGstBreakdown(doc, {
    cgst: invoice.cgst_amount,
    sgst: invoice.sgst_amount,
    igst: invoice.igst_amount,
    taxAmount: invoice.tax_amount
  }, labelX, rightX, currentY);

  doc.setLineWidth(0.4);
  doc.setDrawColor(203, 213, 225);
  doc.line(labelX, currentY - 1, rightX, currentY - 1);

  const grandTotalY = currentY + 4;
  // Label same size as other rows; amount bold/larger — width-checked
  drawSummaryRow(doc, {
    label: 'Total Amount After Tax:',
    value: formatCurrencyPDF(invoice.grand_total),
    y: grandTotalY,
    labelX,
    rightX,
    fontSize: 8.5,
    boldLabel: true,
    boldValue: true,
    valueFontSize: 10.5
  });

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
  if (String(quotation.po_number || '').trim()) {
    metaRows.push({ label: 'PO Number:', value: String(quotation.po_number).trim() });
  }
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
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const quoteLines = buildCustomerBoxLines(doc, {
    titlePrefix: 'Company / Client',
    name: quotation.customer_name,
    phone: quotation.customer_phone,
    email: quotation.customer_email,
    address: quotation.customer_address,
    gstin: customerGstin,
    pan: customerPan
  });

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

  const isCommercial = String(quotation.bill_type || '').toLowerCase() === 'commercial';

  const tableData = (quotation.items || []).map((item, idx) => {
    const discVal = parseFloat(item.discount_percent);
    const gstVal = parseFloat(item.gst_percent);

    if (isCommercial) {
      return [
        idx + 1,
        item.product_name || 'N/A',
        itemHsn(item),
        formatCurrencyPDF(item.unit_price),
        item.quantity || 1,
        item.unit || 'pcs',
        gstVal > 0 ? `${gstVal}%` : '–',
        formatCurrencyPDF(item.total_price)
      ];
    }

    return [
      idx + 1,
      item.product_name || 'N/A',
      itemHsn(item),
      formatCurrencyPDF(item.unit_price),
      item.quantity || 1,
      item.unit || 'pcs',
      discVal > 0 ? `${discVal}%` : '–',
      gstVal > 0 ? `${gstVal}%` : '–',
      formatCurrencyPDF(item.total_price)
    ];
  });

  const tableHead = isCommercial
    ? [['Sr No.', 'Product Description', 'HSN', 'Rate', 'Qty', 'Unit', 'GST %', 'Total Amount']]
    : [['Sr No.', 'Product Description', 'HSN', 'Rate', 'Qty', 'Unit', 'Disc %', 'GST %', 'Total Amount']];

  const columnStyles = isCommercial
    ? {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 24, halign: 'center' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 16, halign: 'center' },
        6: { cellWidth: 16, halign: 'right' },
        7: { cellWidth: 28, halign: 'right' }
      }
    : {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 24, halign: 'right' },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 14, halign: 'center' },
        6: { cellWidth: 14, halign: 'right' },
        7: { cellWidth: 14, halign: 'right' },
        8: { cellWidth: 26, halign: 'right' }
      };

  doc.autoTable({
    startY: tableStartY,
    margin: { left: 14, right: 14 },
    head: tableHead,
    body: tableData,
    headStyles: {
      fillColor: BRAND_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    columnStyles,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak'
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      if (data.section === 'head') {
        const colStyle = columnStyles[data.column.index];
        if (colStyle && colStyle.halign) {
          data.cell.styles.halign = colStyle.halign;
        }
      }
    }
  });

  let currentY = doc.lastAutoTable.finalY + 8;
  const rightX = 196;
  const labelX = 120;

  currentY = drawSummaryRow(doc, {
    label: 'Total Amount Before Tax:',
    value: formatCurrencyPDF(quotation.subtotal),
    y: currentY,
    labelX,
    rightX
  });

  if (parseFloat(quotation.discount_amount) > 0) {
    currentY = drawSummaryRow(doc, {
      label: 'Discount:',
      value: `- ${formatCurrencyPDF(quotation.discount_amount)}`,
      y: currentY,
      labelX,
      rightX
    });
  }

  currentY = drawGstBreakdown(doc, {
    cgst: quotation.cgst_amount,
    sgst: quotation.sgst_amount,
    igst: quotation.igst_amount,
    taxAmount: quotation.tax_amount
  }, labelX, rightX, currentY);

  doc.setLineWidth(0.4);
  doc.setDrawColor(203, 213, 225);
  doc.line(labelX, currentY - 1, rightX, currentY - 1);

  drawSummaryRow(doc, {
    label: 'Quotation Total:',
    value: formatCurrencyPDF(quotation.grand_total),
    y: currentY + 4,
    labelX,
    rightX,
    fontSize: 8.5,
    boldLabel: true,
    boldValue: true,
    valueFontSize: 10.5
  });

  const footerY = currentY + 16;

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
