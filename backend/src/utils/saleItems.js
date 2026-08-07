function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function processSaleItems(items = []) {
  let calcSubtotal = 0;
  let calcTax = 0;

  const processedItems = items.map((item) => {
    const qty = parseInt(item.quantity, 10);
    if (!Number.isFinite(qty) || qty < 1) {
      const error = new Error('Each item must have a quantity of at least 1');
      error.statusCode = 400;
      throw error;
    }

    const uPrice = Math.max(0, parseFloat(item.unit_price ?? item.selling_price) || 0);
    const disc = Math.min(100, Math.max(0, parseFloat(item.discount_percent) || 0));
    const gst = Math.min(40, Math.max(0, parseFloat(item.gst_percent) || 0));

    const base = uPrice * qty;
    const itemDisc = base * (disc / 100);
    const afterDisc = base - itemDisc;
    const itemGst = afterDisc * (gst / 100);

    calcSubtotal += afterDisc;
    calcTax += itemGst;

    return {
      product_id: item.product_id || null,
      product_name: String(item.product_name || 'Item').slice(0, 200),
      barcode: String(item.barcode || '').slice(0, 64),
      unit_price: uPrice,
      quantity: qty,
      discount_percent: disc,
      gst_percent: gst,
      total_price: roundMoney(afterDisc + itemGst)
    };
  });

  return {
    processedItems,
    finalSubtotal: roundMoney(calcSubtotal),
    finalTax: roundMoney(calcTax)
  };
}

module.exports = { roundMoney, processSaleItems };
