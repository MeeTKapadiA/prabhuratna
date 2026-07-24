const db = require('../config/db');

exports.getSalesReport = (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT 
        i.id,
        i.invoice_number,
        i.created_at,
        i.customer_name,
        i.payment_mode,
        i.subtotal,
        i.tax_amount,
        i.discount_amount,
        i.grand_total,
        (SELECT COUNT(*) FROM invoice_items ii WHERE ii.invoice_id = i.id) as item_count
      FROM invoices i
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += ` AND DATE(i.created_at) >= DATE(?)`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND DATE(i.created_at) <= DATE(?)`;
      params.push(endDate);
    }

    query += ` ORDER BY i.id DESC`;

    const sales = db.prepare(query).all(...params);

    const summary = sales.reduce((acc, curr) => {
      acc.totalSales += curr.grand_total || 0;
      acc.totalRevenue += curr.grand_total || 0;
      acc.totalTax += curr.tax_amount || 0;
      acc.totalDiscount += curr.discount_amount || 0;
      acc.invoiceCount += 1;
      acc.totalCount += 1;
      return acc;
    }, { totalSales: 0, totalRevenue: 0, totalTax: 0, totalDiscount: 0, invoiceCount: 0, totalCount: 0 });

    return res.json({ success: true, summary, sales });
  } catch (error) {
    console.error('Error generating sales report:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate sales report' });
  }
};

exports.getInventoryReport = (req, res) => {
  try {
    const { category, brand } = req.query;
    let query = `
      SELECT 
        id, name, barcode, sku, category, brand,
        purchase_price, selling_price, stock_quantity, min_stock_level,
        (stock_quantity * purchase_price) as cost_value,
        (stock_quantity * selling_price) as retail_value,
        (selling_price - purchase_price) as unit_profit
      FROM products
      WHERE is_active = 1
    `;
    const params = [];

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }
    if (brand) {
      query += ` AND brand = ?`;
      params.push(brand);
    }

    query += ` ORDER BY stock_quantity ASC`;

    const inventory = db.prepare(query).all(...params);

    const summary = inventory.reduce((acc, curr) => {
      acc.totalStock += curr.stock_quantity || 0;
      acc.totalUnits += curr.stock_quantity || 0;
      acc.totalCostValuation += curr.cost_value || 0;
      acc.totalRetailValuation += curr.retail_value || 0;
      if (curr.stock_quantity <= curr.min_stock_level) acc.lowStockCount += 1;
      return acc;
    }, { totalStock: 0, totalUnits: 0, totalCostValuation: 0, totalRetailValuation: 0, lowStockCount: 0 });

    return res.json({ success: true, summary, inventory });
  } catch (error) {
    console.error('Error generating inventory report:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate inventory report' });
  }
};

exports.getProfitReport = (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT 
        ii.product_name,
        COALESCE(p.sku, 'N/A') as sku,
        COALESCE(p.barcode, 'N/A') as barcode,
        SUM(ii.quantity) as total_sold,
        SUM(ii.quantity * COALESCE(p.purchase_price, 0)) as total_cost,
        SUM(ii.total_price) as total_revenue,
        (SUM(ii.total_price) - SUM(ii.quantity * COALESCE(p.purchase_price, 0))) as gross_profit,
        CASE 
          WHEN SUM(ii.total_price) > 0 THEN 
            ((SUM(ii.total_price) - SUM(ii.quantity * COALESCE(p.purchase_price, 0))) / SUM(ii.total_price)) * 100
          ELSE 0
        END as profit_margin_percent
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += ` AND DATE(i.created_at) >= DATE(?)`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND DATE(i.created_at) <= DATE(?)`;
      params.push(endDate);
    }

    query += ` GROUP BY ii.product_name ORDER BY gross_profit DESC`;

    const profitData = db.prepare(query).all(...params);

    const summary = profitData.reduce((acc, curr) => {
      acc.totalRevenue += curr.total_revenue || 0;
      acc.totalCost += curr.total_cost || 0;
      acc.totalProfit += curr.gross_profit || 0;
      acc.totalGrossProfit += curr.gross_profit || 0;
      return acc;
    }, { totalRevenue: 0, totalCost: 0, totalProfit: 0, totalGrossProfit: 0 });

    summary.overallMargin = summary.totalRevenue > 0 ? ((summary.totalProfit / summary.totalRevenue) * 100).toFixed(2) : 0;

    return res.json({ success: true, summary, profitData });
  } catch (error) {
    console.error('Error generating profit report:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate profit report' });
  }
};
