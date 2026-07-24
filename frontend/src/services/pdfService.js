import jsPDF from 'jspdf';
import 'jspdf-autotable';

const BRAND_COLOR = [192, 57, 43]; // #C0392B (Prabhuratna Red/Maroon)

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
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // 1. Company Header Banner
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PRABHURATNA METALS', 14, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('TAX INVOICE', 196, 16, { align: 'right' });

  // 2. Company Details & Invoice Metadata
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);

  // Left: Store Address
  doc.setFont('helvetica', 'bold');
  doc.text('Prabhuratna Metals Pvt. Ltd.', 14, 36);
  doc.setFont('helvetica', 'normal');
  doc.text('Main Market Road, Commercial Complex, Ahmedabad, GJ', 14, 41);
  doc.text('GSTIN: 24ABCDE1234F1Z5 | Ph: +91 98765 43210', 14, 46);
  doc.text('Email: info@prabhuratna.com', 14, 51);

  // Right: Invoice Metadata (Two-Column Alignment)
  const metaLabelX = 150;
  const metaValueX = 196;

  doc.setFont('helvetica', 'bold');
  doc.text('Invoice No:', metaLabelX, 36);
  doc.text(invoice.invoice_number || '', metaValueX, 36, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text('Date:', metaLabelX, 41);
  doc.text(new Date(invoice.created_at || Date.now()).toLocaleDateString('en-IN'), metaValueX, 41, { align: 'right' });

  doc.text('Payment Mode:', metaLabelX, 46);
  doc.text(invoice.payment_mode || 'Cash', metaValueX, 46, { align: 'right' });

  // 3. Customer Info Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 57, 182, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.text('Billed To:', 18, 64);
  doc.setFont('helvetica', 'normal');
  doc.text(`Customer: ${invoice.customer_name || 'Walk-in Customer'}`, 18, 70);
  doc.text(`Phone: ${invoice.customer_phone || 'N/A'}  |  Email: ${invoice.customer_email || 'N/A'}`, 18, 75);

  // 4. Items Table
  const tableData = (invoice.items || []).map((item, idx) => {
    const discVal = parseFloat(item.discount_percent);
    const gstVal = parseFloat(item.gst_percent);

    return [
      idx + 1,
      item.product_name || 'N/A',
      item.barcode || '–',
      formatCurrencyPDF(item.unit_price),
      item.quantity || 1,
      discVal > 0 ? `${discVal}%` : '–',
      gstVal > 0 ? `${gstVal}%` : '–',
      formatCurrencyPDF(item.total_price)
    ];
  });

  doc.autoTable({
    startY: 85,
    margin: { left: 14, right: 14 },
    head: [['#', 'Product Description', 'Barcode', 'Rate', 'Qty', 'Disc %', 'GST %', 'Amount']],
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
  const finalY = doc.lastAutoTable.finalY + 8;
  const rightX = 196;
  const labelX = 135;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', labelX, finalY);
  doc.text(formatCurrencyPDF(invoice.subtotal), rightX, finalY, { align: 'right' });

  doc.text('Tax (GST Total):', labelX, finalY + 5);
  doc.text(formatCurrencyPDF(invoice.tax_amount), rightX, finalY + 5, { align: 'right' });

  if (parseFloat(invoice.discount_amount) > 0) {
    doc.text('Overall Bill Discount:', labelX, finalY + 10);
    doc.text(`- ${formatCurrencyPDF(invoice.discount_amount)}`, rightX, finalY + 10, { align: 'right' });
  }

  const lineY = parseFloat(invoice.discount_amount) > 0 ? finalY + 14 : finalY + 9;
  doc.setLineWidth(0.4);
  doc.setDrawColor(203, 213, 225);
  doc.line(labelX, lineY, rightX, lineY);

  const grandTotalY = lineY + 6;
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
  doc.text('2. All disputes are subject to Ahmedabad jurisdiction.', 14, footerY + 8);
  doc.text('3. Computer Generated Tax Invoice.', 14, footerY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('For Prabhuratna Metals', 196, footerY + 4, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signatory', 196, footerY + 16, { align: 'right' });

  if (options.save !== false) {
    doc.save(`${invoice.invoice_number}.pdf`);
  }

  return doc;
}

export function printInvoicePDF(invoice) {
  const doc = generateInvoicePDF(invoice, { save: false });
  const blobUrl = doc.output('bloburl');
  const printWindow = window.open(blobUrl, '_blank');
  if (printWindow) {
    printWindow.focus();
  }
}

export function generateQuotationPDF(quotation, options = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // 1. Header
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PRABHURATNA METALS', 14, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('COMMERCIAL QUOTATION', 196, 16, { align: 'right' });

  // 2. Company Info & Quotation Details
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);

  doc.setFont('helvetica', 'bold');
  doc.text('Prabhuratna Metals Pvt. Ltd.', 14, 36);
  doc.setFont('helvetica', 'normal');
  doc.text('Commercial Sales Division | Ph: +91 98765 43210', 14, 41);
  doc.text('Email: info@prabhuratna.com', 14, 46);

  // Right: Quotation Metadata (Two-Column Alignment)
  const metaLabelX = 150;
  const metaValueX = 196;

  doc.setFont('helvetica', 'bold');
  doc.text('Quotation No:', metaLabelX, 36);
  doc.text(quotation.quotation_number || '', metaValueX, 36, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text('Date:', metaLabelX, 41);
  doc.text(new Date(quotation.created_at || Date.now()).toLocaleDateString('en-IN'), metaValueX, 41, { align: 'right' });
  if (quotation.valid_until) {
    doc.text('Valid Until:', metaLabelX, 46);
    doc.text(new Date(quotation.valid_until).toLocaleDateString('en-IN'), metaValueX, 46, { align: 'right' });
  }

  // 3. Customer Information Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 53, 182, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.text('Quotation Prepared For:', 18, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`Company / Client: ${quotation.customer_name}`, 18, 66);
  doc.text(`Phone: ${quotation.customer_phone || 'N/A'}  |  Email: ${quotation.customer_email || 'N/A'}`, 18, 71);

  // 4. Quotation Items Table
  const tableData = (quotation.items || []).map((item, idx) => {
    const discVal = parseFloat(item.discount_percent);
    const gstVal = parseFloat(item.gst_percent);

    return [
      idx + 1,
      item.product_name || 'N/A',
      formatCurrencyPDF(item.unit_price),
      item.quantity || 1,
      discVal > 0 ? `${discVal}%` : '–',
      gstVal > 0 ? `${gstVal}%` : '–',
      formatCurrencyPDF(item.total_price)
    ];
  });

  doc.autoTable({
    startY: 83,
    margin: { left: 14, right: 14 },
    head: [['#', 'Product Description', 'Rate', 'Qty', 'Disc %', 'GST %', 'Total Amount']],
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
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 32, halign: 'right' }
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak'
    },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  // 5. Totals Section
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

  // 6. Notes, Terms & Signature Area
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
  doc.text('For Prabhuratna Metals', 196, footerY + 8, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Commercial Representative', 196, footerY + 20, { align: 'right' });

  if (options.save !== false) {
    doc.save(`${quotation.quotation_number}.pdf`);
  }

  return doc;
}

export function printQuotationPDF(quotation) {
  const doc = generateQuotationPDF(quotation, { save: false });
  const blobUrl = doc.output('bloburl');
  const printWindow = window.open(blobUrl, '_blank');
  if (printWindow) {
    printWindow.focus();
  }
}
