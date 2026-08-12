const db = require('../config/db');

exports.adjustStock = (req, res) => {
  try {
    const { product_id, quantity_change, change_type, notes } = req.body;

    if (!product_id || quantity_change === undefined || !change_type) {
      return res.status(400).json({ success: false, message: 'Product ID, quantity change, and change type are required' });
    }

    const allowedChangeTypes = ['PURCHASE', 'MANUAL_ADJUSTMENT'];
    if (!allowedChangeTypes.includes(change_type)) {
      return res.status(400).json({ success: false, message: 'Invalid inventory change type' });
    }

    const qtyChange = parseInt(quantity_change, 10);
    if (!Number.isFinite(qtyChange) || qtyChange === 0) {
      return res.status(400).json({ success: false, message: 'Quantity change must be a non-zero number' });
    }

    const product = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(product_id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const prevStock = product.stock_quantity;
    const newStock = prevStock + qtyChange;

    if (newStock < 0) {
      return res.status(400).json({ success: false, message: 'Resulting stock cannot be negative' });
    }

    db.prepare('UPDATE products SET stock_quantity = ? WHERE id = ?').run(newStock, product_id);
    db.prepare(`
      INSERT INTO inventory_logs (product_id, change_type, quantity_change, previous_stock, new_stock, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(product_id, change_type, qtyChange, prevStock, newStock, notes || 'Manual inventory update');

    return res.json({
      success: true,
      message: 'Inventory updated successfully',
      previous_stock: prevStock,
      new_stock: newStock
    });
  } catch (error) {
    console.error('Inventory adjustment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to adjust inventory' });
  }
};

exports.getInventoryLogs = (req, res) => {
  try {
    const { product_id, limit = 50 } = req.query;
    let query = `
      SELECT l.*, p.name as product_name, p.sku, COALESCE(p.hsn_code, p.hsn_sac, '') as hsn_code
      FROM inventory_logs l
      JOIN products p ON l.product_id = p.id
    `;
    const params = [];

    if (product_id) {
      query += ` WHERE l.product_id = ?`;
      params.push(product_id);
    }

    query += ` ORDER BY l.id DESC LIMIT ?`;
    params.push(parseInt(limit));

    const logs = db.prepare(query).all(...params);
    return res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch inventory logs' });
  }
};

exports.getFastMovingProducts = (req, res) => {
  try {
    const { days = 30 } = req.query;
    const query = `
      SELECT 
        ii.product_id,
        COALESCE(p.name, ii.product_name) as name,
        COALESCE(p.category, 'General') as category,
        COALESCE(p.stock_quantity, 0) as stock_quantity,
        COALESCE(NULLIF(ii.hsn_sac, ''), p.hsn_code, p.hsn_sac, '') as hsn_code,
        SUM(ii.quantity) as total_quantity_sold,
        SUM(ii.quantity) as total_units_sold,
        SUM(ii.total_price) as total_revenue,
        COUNT(DISTINCT ii.invoice_id) as total_transactions
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE DATE(i.created_at) >= date('now', 'localtime', '-' || ? || ' days')
      GROUP BY ii.product_id, ii.product_name
      ORDER BY total_quantity_sold DESC
      LIMIT 10
    `;

    const fastMoving = db.prepare(query).all(parseInt(days));
    return res.json({ success: true, days: parseInt(days), products: fastMoving });
  } catch (error) {
    console.error('Error fetching fast moving products:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch fast moving analytics' });
  }
};

exports.getSlowMovingProducts = (req, res) => {
  try {
    const { days = 30 } = req.query;
    // Find active products with zero or minimal sales in last X days
    const query = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        COALESCE(p.hsn_code, p.hsn_sac, '') as hsn_code,
        p.category,
        p.brand,
        p.stock_quantity,
        p.min_stock_level,
        p.purchase_price,
        p.selling_price,
        (p.stock_quantity * p.purchase_price) as inventory_value,
        COALESCE(SUM(ii.quantity), 0) as sales_in_period
      FROM products p
      LEFT JOIN invoice_items ii ON p.id = ii.product_id
      LEFT JOIN invoices i ON ii.invoice_id = i.id AND DATE(i.created_at) >= date('now', 'localtime', '-' || ? || ' days')
      WHERE p.is_active = 1
      GROUP BY p.id
      HAVING sales_in_period = 0 OR p.stock_quantity > (p.min_stock_level * 3)
      ORDER BY sales_in_period ASC, p.stock_quantity DESC
      LIMIT 20
    `;

    const slowMoving = db.prepare(query).all(parseInt(days));
    return res.json({ success: true, days: parseInt(days), products: slowMoving });
  } catch (error) {
    console.error('Error fetching slow moving products:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch slow moving analytics' });
  }
};

exports.getReconciliationReport = (req, res) => {
  try {
    const products = db.prepare(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        COALESCE(p.hsn_code, p.hsn_sac, '') as hsn_code,
        p.category,
        p.stock_quantity as current_stock,
        COALESCE((SELECT SUM(ii.quantity) FROM invoice_items ii WHERE ii.product_id = p.id), 0) as total_sold,
        COALESCE((SELECT SUM(pi.quantity) FROM purchase_items pi WHERE pi.product_id = p.id), 0) as total_purchased,
        COALESCE((SELECT SUM(ri.quantity) FROM return_items ri WHERE ri.product_id = p.id AND ri.is_damaged = 0), 0) as total_returned,
        COALESCE((SELECT SUM(l.quantity_change) FROM inventory_logs l WHERE l.product_id = p.id AND l.change_type = 'MANUAL_ADJUSTMENT'), 0) as manual_adjustments
      FROM products p
      WHERE p.is_active = 1
      ORDER BY p.name ASC
    `).all();

    const reconciliationList = products.map((prod) => {
      const calculatedStock = prod.total_purchased + prod.total_returned + prod.manual_adjustments - prod.total_sold;
      const discrepancy = prod.current_stock - calculatedStock;

      return {
        ...prod,
        calculated_stock: calculatedStock,
        discrepancy,
        status: discrepancy === 0 ? 'BALANCED' : 'DISCREPANCY'
      };
    });

    const totalDiscrepancies = reconciliationList.filter(p => p.status === 'DISCREPANCY').length;

    return res.json({
      success: true,
      total_products: reconciliationList.length,
      discrepancy_count: totalDiscrepancies,
      report: reconciliationList
    });
  } catch (error) {
    console.error('Error loading reconciliation report:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate stock reconciliation report' });
  }
};
