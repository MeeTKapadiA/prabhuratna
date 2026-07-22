const db = require('../config/db');

exports.getDashboardStats = (req, res) => {
  try {
    // 1. Sales Statistics
    const todaySales = db.prepare(`
      SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(*) as count
      FROM invoices WHERE DATE(created_at) = DATE('now')
    `).get();

    const weeklySales = db.prepare(`
      SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(*) as count
      FROM invoices WHERE DATE(created_at) >= DATE('now', '-7 days')
    `).get();

    const monthlySales = db.prepare(`
      SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(*) as count
      FROM invoices WHERE DATE(created_at) >= DATE('now', '-30 days')
    `).get();

    // 2. Inventory Metrics
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get().count;
    const lowStockProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND stock_quantity > 0 AND stock_quantity <= min_stock_level').get().count;
    const outOfStockProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND stock_quantity <= 0').get().count;

    // 3. Profit Margin Metrics
    const financialStats = db.prepare(`
      SELECT 
        COALESCE(SUM(ii.total_price), 0) as total_revenue,
        COALESCE(SUM(ii.quantity * p.purchase_price), 0) as total_cost
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
    `).get();

    const totalRevenue = financialStats.total_revenue;
    const totalCost = financialStats.total_cost;
    const grossProfit = totalRevenue - totalCost;
    const grossMarginPercent = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : 0;

    // 4. Product Insights
    const topProfitableProducts = db.prepare(`
      SELECT 
        p.id, p.name, p.sku, p.purchase_price, p.selling_price,
        (p.selling_price - p.purchase_price) as unit_profit,
        CASE 
          WHEN p.purchase_price > 0 THEN ((p.selling_price - p.purchase_price) / p.purchase_price) * 100 
          ELSE 100 
        END as profit_margin_percent
      FROM products p
      WHERE p.is_active = 1
      ORDER BY unit_profit DESC
      LIMIT 5
    `).all();

    const lowestProfitableProducts = db.prepare(`
      SELECT 
        p.id, p.name, p.sku, p.purchase_price, p.selling_price,
        (p.selling_price - p.purchase_price) as unit_profit,
        CASE 
          WHEN p.purchase_price > 0 THEN ((p.selling_price - p.purchase_price) / p.purchase_price) * 100 
          ELSE 0 
        END as profit_margin_percent
      FROM products p
      WHERE p.is_active = 1
      ORDER BY unit_profit ASC
      LIMIT 5
    `).all();

    // 5. Daily Sales Trend (Last 7 Days) for Charting
    const salesChartData = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        SUM(grand_total) as sales,
        COUNT(*) as invoices
      FROM invoices
      WHERE DATE(created_at) >= DATE('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `).all();

    return res.json({
      success: true,
      sales: {
        today: todaySales,
        weekly: weeklySales,
        monthly: monthlySales
      },
      inventory: {
        totalProducts,
        lowStockProducts,
        outOfStockProducts
      },
      profit: {
        totalRevenue,
        totalCost,
        grossProfit,
        grossMarginPercent: parseFloat(grossMarginPercent)
      },
      insights: {
        topProfitable: topProfitableProducts,
        lowestProfitable: lowestProfitableProducts
      },
      chartData: salesChartData
    });
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    return res.status(500).json({ success: false, message: 'Failed to load dashboard statistics' });
  }
};
