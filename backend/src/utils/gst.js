const { roundMoney } = require('./saleItems');

function extractStateCode(gstin) {
  if (!gstin || typeof gstin !== 'string') return null;
  const code = gstin.trim().slice(0, 2);
  return /^\d{2}$/.test(code) ? code : null;
}

function resolveTaxSplit({ shopGstin, customerGstin, isInterState }) {
  if (typeof isInterState === 'boolean') {
    return isInterState ? 'IGST' : 'CGST_SGST';
  }
  const shopState = extractStateCode(shopGstin);
  const customerState = extractStateCode(customerGstin);
  if (shopState && customerState && shopState !== customerState) {
    return 'IGST';
  }
  return 'CGST_SGST';
}

function splitGst(taxableAmount, gstPercent, taxType) {
  const totalTax = roundMoney(taxableAmount * (gstPercent / 100));
  if (taxType === 'IGST') {
    return { cgst: 0, sgst: 0, igst: totalTax, tax_amount: totalTax };
  }
  const half = roundMoney(totalTax / 2);
  const other = roundMoney(totalTax - half);
  return { cgst: half, sgst: other, igst: 0, tax_amount: totalTax };
}

function processGstSaleItems(items = [], { shopGstin, customerGstin, isInterState } = {}) {
  const taxType = resolveTaxSplit({ shopGstin, customerGstin, isInterState });
  let taxableSubtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const processedItems = items.map((item) => {
    const isCustom = Boolean(item.is_custom) || !item.product_id;
    const qtyRaw = Number(item.quantity);
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
    if (qty <= 0) {
      const error = new Error('Each item must have a quantity greater than 0');
      error.statusCode = 400;
      throw error;
    }

    const uPrice = Math.max(0, Number.parseFloat(item.unit_price ?? item.selling_price) || 0);
    const disc = Math.min(100, Math.max(0, Number.parseFloat(item.discount_percent) || 0));
    const gst = Math.min(40, Math.max(0, Number.parseFloat(item.gst_percent) || 0));
    const unit = String(item.unit || 'pcs').slice(0, 16);
    const hsn = String(item.hsn_sac || item.hsn_code || item.hsn || '').replace(/\D/g, '').slice(0, 8);

    const base = uPrice * qty;
    const itemDisc = base * (disc / 100);
    const taxable = roundMoney(base - itemDisc);
    const taxParts = splitGst(taxable, gst, taxType);
    const totalPrice = roundMoney(taxable + taxParts.tax_amount);

    taxableSubtotal += taxable;
    totalCgst += taxParts.cgst;
    totalSgst += taxParts.sgst;
    totalIgst += taxParts.igst;

    return {
      product_id: isCustom ? null : (item.product_id || null),
      product_name: String(item.product_name || 'Custom Item').slice(0, 200),
      barcode: String(item.barcode || '').slice(0, 64),
      hsn_sac: hsn,
      unit,
      unit_price: uPrice,
      quantity: qty,
      discount_percent: disc,
      gst_percent: gst,
      taxable_value: taxable,
      cgst_amount: taxParts.cgst,
      sgst_amount: taxParts.sgst,
      igst_amount: taxParts.igst,
      total_price: totalPrice,
      is_custom: isCustom ? 1 : 0,
      size_variant: String(item.size_variant || '').slice(0, 64),
      gauge: String(item.gauge || '').slice(0, 64)
    };
  });

  return {
    taxType,
    processedItems,
    finalSubtotal: roundMoney(taxableSubtotal),
    finalCgst: roundMoney(totalCgst),
    finalSgst: roundMoney(totalSgst),
    finalIgst: roundMoney(totalIgst),
    finalTax: roundMoney(totalCgst + totalSgst + totalIgst)
  };
}

function computeInvoiceTotals({
  subtotal,
  taxAmount,
  discountAmount = 0,
  scrapValue = 0,
  transportAmount = 0,
  roundOff
}) {
  const beforeRound = roundMoney(subtotal + taxAmount - discountAmount - scrapValue + transportAmount);
  let appliedRoundOff = 0;
  if (roundOff === undefined || roundOff === null || roundOff === '') {
    const nearest = Math.round(beforeRound);
    appliedRoundOff = roundMoney(nearest - beforeRound);
  } else {
    appliedRoundOff = roundMoney(Number.parseFloat(roundOff) || 0);
  }
  const grandTotal = Math.max(0, roundMoney(beforeRound + appliedRoundOff));
  return { beforeRound, round_off: appliedRoundOff, grand_total: grandTotal };
}

module.exports = {
  extractStateCode,
  resolveTaxSplit,
  splitGst,
  processGstSaleItems,
  computeInvoiceTotals
};
