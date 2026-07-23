const path = require('path');
const fs = require('fs');
const db = require('../config/db');

// Export SQLite Database File
exports.exportDatabase = (req, res) => {
  try {
    let dbPath = path.join(__dirname, '../../database.sqlite');
    if (process.env.VERCEL) {
      const tmpPath = path.join('/tmp', 'database.sqlite');
      if (fs.existsSync(tmpPath)) {
        dbPath = tmpPath;
      }
    }

    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ success: false, message: 'Database file not found' });
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const fileName = `prabhuratna_backup_${dateStr}_${timeStr}.sqlite`;

    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    return res.download(dbPath, fileName, (err) => {
      if (err && !res.headersSent) {
        console.error('Download error:', err);
        return res.status(500).json({ success: false, message: 'Failed to download database file' });
      }
    });
  } catch (error) {
    console.error('Error exporting database:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate database backup' });
  }
};

// Export Entities to CSV
exports.exportCSV = (req, res) => {
  try {
    const { type } = req.query; // 'products', 'invoices', 'purchases', 'returns'

    let data = [];
    let headers = [];
    let fileName = `export_${type || 'all'}`;

    const now = new Date();
    const timestamp = now.toISOString().slice(0, 10).replace(/-/g, '');

    if (type === 'products') {
      data = db.prepare('SELECT id, name, barcode, sku, category, brand, purchase_price, selling_price, stock_quantity, created_at FROM products').all();
      headers = ['ID', 'Name', 'Barcode', 'SKU', 'Category', 'Brand', 'Purchase Price', 'Selling Price', 'Stock Quantity', 'Created At'];
      fileName = `prabhuratna_products_${timestamp}.csv`;
    } else if (type === 'invoices') {
      data = db.prepare('SELECT invoice_number, customer_name, customer_phone, subtotal, tax_amount, discount_amount, grand_total, payment_mode, created_at FROM invoices').all();
      headers = ['Invoice Number', 'Customer Name', 'Phone', 'Subtotal', 'Tax Amount', 'Discount', 'Grand Total', 'Payment Mode', 'Date'];
      fileName = `prabhuratna_invoices_${timestamp}.csv`;
    } else if (type === 'purchases') {
      data = db.prepare(`
        SELECT p.purchase_number, s.name as supplier_name, p.subtotal, p.tax_amount, p.grand_total, p.payment_status, p.amount_paid, p.created_at
        FROM purchases p
        JOIN suppliers s ON p.supplier_id = s.id
      `).all();
      headers = ['Purchase Number', 'Supplier', 'Subtotal', 'Tax Amount', 'Grand Total', 'Payment Status', 'Amount Paid', 'Date'];
      fileName = `prabhuratna_purchases_${timestamp}.csv`;
    } else if (type === 'returns') {
      data = db.prepare(`
        SELECT r.return_number, r.customer_name, r.reason, r.refund_mode, r.refund_amount, r.status, r.created_at
        FROM returns r
      `).all();
      headers = ['Return Number', 'Customer Name', 'Reason', 'Refund Mode', 'Refund Amount', 'Status', 'Date'];
      fileName = `prabhuratna_returns_${timestamp}.csv`;
    } else {
      // Default to products
      data = db.prepare('SELECT id, name, sku, category, purchase_price, selling_price, stock_quantity FROM products').all();
      headers = ['ID', 'Name', 'SKU', 'Category', 'Purchase Price', 'Selling Price', 'Stock Quantity'];
      fileName = `prabhuratna_data_${timestamp}.csv`;
    }

    // Convert data to CSV string
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = Object.values(row).map(val => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return res.status(500).json({ success: false, message: 'Failed to export CSV data' });
  }
};
