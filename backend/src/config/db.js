const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let dbPath = path.join(__dirname, '../../database.sqlite');

// If running in Vercel serverless environment, copy db to /tmp for write access
if (process.env.VERCEL) {
  const tmpPath = path.join('/tmp', 'database.sqlite');
  try {
    if (!fs.existsSync(tmpPath) && fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, tmpPath);
    }
    dbPath = tmpPath;
  } catch (err) {
    console.error('Failed to copy SQLite database to /tmp:', err);
  }
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

function runMigration(sql) {
  try {
    db.exec(sql);
  } catch (error) {
    const message = String(error.message || '');
    if (!message.includes('duplicate column name') && !message.includes('already exists')) {
      console.warn('SQLite migration skipped:', message);
    }
  }
}

function initDb() {
  // Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      status TEXT DEFAULT 'active',
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  runMigration(`ALTER TABLE users ADD COLUMN username TEXT`);
  runMigration(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
  runMigration(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`);
  runMigration(`ALTER TABLE users ADD COLUMN last_login DATETIME`);

  // Products Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      barcode TEXT UNIQUE,
      sku TEXT UNIQUE NOT NULL,
      category TEXT DEFAULT 'General',
      brand TEXT DEFAULT 'Generic',
      purchase_price REAL NOT NULL DEFAULT 0.0,
      selling_price REAL NOT NULL DEFAULT 0.0,
      discount_percent REAL DEFAULT 0.0,
      gst_percent REAL DEFAULT 18.0,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      min_stock_level INTEGER DEFAULT 5,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      show_on_website INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  runMigration(`ALTER TABLE products ADD COLUMN show_on_website INTEGER DEFAULT 1`);

  // Invoices Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      customer_name TEXT DEFAULT 'Walk-in Customer',
      customer_phone TEXT,
      customer_email TEXT,
      subtotal REAL NOT NULL,
      tax_amount REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      scrap_value REAL DEFAULT 0.0,
      grand_total REAL NOT NULL,
      payment_mode TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Invoice Items Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      barcode TEXT,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      discount_percent REAL DEFAULT 0,
      gst_percent REAL DEFAULT 0,
      total_price REAL NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );
  `);

  // Quotations Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_email TEXT,
      customer_address TEXT,
      subtotal REAL NOT NULL,
      tax_amount REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      grand_total REAL NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'PENDING',
      valid_until DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Quotation Items Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS quotation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      barcode TEXT,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      discount_percent REAL DEFAULT 0,
      gst_percent REAL DEFAULT 0,
      total_price REAL NOT NULL,
      FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
    );
  `);

  // Inventory Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      change_type TEXT NOT NULL,
      quantity_change INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  // Suppliers Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      gst_number TEXT,
      opening_balance REAL DEFAULT 0.0,
      current_balance REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Purchases Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_number TEXT UNIQUE NOT NULL,
      supplier_id INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      tax_amount REAL DEFAULT 0.0,
      transport_amount REAL DEFAULT 0.0,
      grand_total REAL NOT NULL,
      payment_status TEXT DEFAULT 'unpaid',
      amount_paid REAL DEFAULT 0.0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );
  `);

  // Purchase Items Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      purchase_price REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  // Returns Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_number TEXT UNIQUE NOT NULL,
      invoice_id INTEGER,
      customer_name TEXT,
      customer_phone TEXT,
      reason TEXT,
      refund_mode TEXT NOT NULL DEFAULT 'cash',
      refund_amount REAL NOT NULL DEFAULT 0.0,
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );
  `);

  // Return Items Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      is_damaged INTEGER DEFAULT 0,
      FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  // Settings Table (Key-Value)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Invoice Counters Table (GST Sequential Billing)
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_counters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      financial_year TEXT UNIQUE NOT NULL,
      last_number INTEGER DEFAULT 0
    );
  `);

  // Quotation Counters Table (Sequential Quotation Billing)
  db.exec(`
    CREATE TABLE IF NOT EXISTS quotation_counters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      financial_year TEXT UNIQUE NOT NULL,
      last_number INTEGER DEFAULT 0
    );
  `);

  // Categories Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default categories if empty
  const defaultCategories = [
    'Cookware',
    'Dinnerware',
    'Appliances',
    'Drinkware',
    'Gift Sets',
    'Cutlery',
    'General'
  ];

  const insertCategory = db.prepare(`
    INSERT INTO categories (name) VALUES (?)
    ON CONFLICT(name) DO NOTHING
  `);
  defaultCategories.forEach(cat => insertCategory.run(cat));

  runMigration(`ALTER TABLE return_items ADD COLUMN is_damaged INTEGER DEFAULT 0`);
  runMigration(`ALTER TABLE suppliers ADD COLUMN current_balance REAL DEFAULT 0.0`);
  runMigration(`ALTER TABLE invoices ADD COLUMN scrap_value REAL DEFAULT 0.0`);
  runMigration(`ALTER TABLE purchases ADD COLUMN transport_amount REAL DEFAULT 0.0`);

  // Product enhancements (units, HSN, variants, stock buckets)
  runMigration(`ALTER TABLE products ADD COLUMN hsn_sac TEXT DEFAULT ''`);
  runMigration(`ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'pcs'`);
  runMigration(`ALTER TABLE products ADD COLUMN size_variant TEXT DEFAULT ''`);
  runMigration(`ALTER TABLE products ADD COLUMN gauge TEXT DEFAULT ''`);
  runMigration(`ALTER TABLE products ADD COLUMN damaged_stock REAL DEFAULT 0`);
  runMigration(`ALTER TABLE products ADD COLUMN display_stock REAL DEFAULT 0`);
  runMigration(`ALTER TABLE products ADD COLUMN scrap_stock REAL DEFAULT 0`);

  // Invoice GST / AR fields
  runMigration(`ALTER TABLE invoices ADD COLUMN customer_id INTEGER`);
  runMigration(`ALTER TABLE invoices ADD COLUMN customer_gstin TEXT DEFAULT ''`);
  runMigration(`ALTER TABLE invoices ADD COLUMN customer_address TEXT DEFAULT ''`);
  runMigration(`ALTER TABLE invoices ADD COLUMN place_of_supply TEXT DEFAULT ''`);
  runMigration(`ALTER TABLE invoices ADD COLUMN tax_type TEXT DEFAULT 'CGST_SGST'`);
  runMigration(`ALTER TABLE invoices ADD COLUMN cgst_amount REAL DEFAULT 0`);
  runMigration(`ALTER TABLE invoices ADD COLUMN sgst_amount REAL DEFAULT 0`);
  runMigration(`ALTER TABLE invoices ADD COLUMN igst_amount REAL DEFAULT 0`);
  runMigration(`ALTER TABLE invoices ADD COLUMN transport_amount REAL DEFAULT 0`);
  runMigration(`ALTER TABLE invoices ADD COLUMN round_off REAL DEFAULT 0`);
  runMigration(`ALTER TABLE invoices ADD COLUMN amount_paid REAL DEFAULT 0`);
  runMigration(`ALTER TABLE invoices ADD COLUMN balance_due REAL DEFAULT 0`);
  runMigration(`ALTER TABLE invoices ADD COLUMN payment_status TEXT DEFAULT 'paid'`);
  runMigration(`ALTER TABLE invoices ADD COLUMN status TEXT DEFAULT 'active'`);
  runMigration(`ALTER TABLE invoices ADD COLUMN created_by INTEGER`);
  runMigration(`ALTER TABLE invoices ADD COLUMN cancelled_at DATETIME`);
  runMigration(`ALTER TABLE invoices ADD COLUMN cancel_reason TEXT`);

  runMigration(`ALTER TABLE invoice_items ADD COLUMN hsn_sac TEXT DEFAULT ''`);
  runMigration(`ALTER TABLE invoice_items ADD COLUMN unit TEXT DEFAULT 'pcs'`);
  runMigration(`ALTER TABLE invoice_items ADD COLUMN taxable_value REAL DEFAULT 0`);
  runMigration(`ALTER TABLE invoice_items ADD COLUMN cgst_amount REAL DEFAULT 0`);
  runMigration(`ALTER TABLE invoice_items ADD COLUMN sgst_amount REAL DEFAULT 0`);
  runMigration(`ALTER TABLE invoice_items ADD COLUMN igst_amount REAL DEFAULT 0`);
  runMigration(`ALTER TABLE invoice_items ADD COLUMN is_custom INTEGER DEFAULT 0`);
  runMigration(`ALTER TABLE invoice_items ADD COLUMN size_variant TEXT DEFAULT ''`);
  runMigration(`ALTER TABLE invoice_items ADD COLUMN gauge TEXT DEFAULT ''`);

  runMigration(`ALTER TABLE returns ADD COLUMN credit_note_id INTEGER`);
  runMigration(`ALTER TABLE inventory_logs ADD COLUMN user_id INTEGER`);
  runMigration(`ALTER TABLE inventory_logs ADD COLUMN stock_bucket TEXT DEFAULT 'saleable'`);

  // Customers (udhaar / B2B)
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      gstin TEXT DEFAULT '',
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Invoice payments (partial cash/UPI/card)
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL,
      notes TEXT,
      received_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );
  `);

  // Credit notes (GST returns / cancel)
  db.exec(`
    CREATE TABLE IF NOT EXISTS credit_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      credit_note_number TEXT UNIQUE NOT NULL,
      invoice_id INTEGER,
      customer_id INTEGER,
      customer_name TEXT,
      customer_gstin TEXT DEFAULT '',
      reason TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      cgst_amount REAL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      igst_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'issued',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS credit_note_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      credit_note_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      hsn_sac TEXT DEFAULT '',
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      gst_percent REAL DEFAULT 0,
      taxable_value REAL DEFAULT 0,
      cgst_amount REAL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      igst_amount REAL DEFAULT 0,
      total_price REAL NOT NULL,
      restock_bucket TEXT DEFAULT 'saleable',
      FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS credit_note_counters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      financial_year TEXT UNIQUE NOT NULL,
      last_number INTEGER DEFAULT 0
    );
  `);

  // Purchase rate / batch history
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_cost_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      purchase_id INTEGER,
      purchase_price REAL NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      remaining_qty REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  // Expenses
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      payment_mode TEXT DEFAULT 'CASH',
      expense_date DATE NOT NULL DEFAULT (DATE('now')),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Daily cashbook
  db.exec(`
    CREATE TABLE IF NOT EXISTS cashbook_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_date DATE NOT NULL UNIQUE,
      opening_cash REAL DEFAULT 0,
      closing_cash REAL DEFAULT 0,
      cash_sales REAL DEFAULT 0,
      upi_sales REAL DEFAULT 0,
      card_sales REAL DEFAULT 0,
      credit_sales REAL DEFAULT 0,
      cash_expenses REAL DEFAULT 0,
      notes TEXT,
      closed_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Audit logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Low-stock alert settings
  const defaultSettings = [
    ['shop_name', 'Prabhuratna Metals Pvt. Ltd.'],
    ['shop_address', 'Main Market Road, Commercial Complex, Ahmedabad, GJ'],
    ['shop_phone', '+91 98765 43210'],
    ['shop_email', 'info@prabhuratna.com'],
    ['shop_gstin', '24ABCDE1234F1Z5'],
    ['shop_state_code', '24'],
    ['logo_base64', ''],
    ['logo_url', ''],
    ['invoice_footer_note', 'Thank you for shopping with us! Visit again.'],
    ['owner_whatsapp', '919824493420'],
    ['low_stock_alert_enabled', '1']
  ];

  const insertSetting = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO NOTHING
  `);

  for (const [key, val] of defaultSettings) {
    insertSetting.run(key, val);
  }

  // Seed default admin & staff users if not present
  const adminCheck = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get('admin@prabhuratna.com', 'admin');
  if (!adminCheck) {
    const hashedAdminPass = bcrypt.hashSync('Admin@123', 10);
    db.prepare(`
      INSERT INTO users (name, username, email, password, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('System Admin', 'admin', 'admin@prabhuratna.com', hashedAdminPass, 'admin', 'active');
  }

  const staffCheck = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get('staff@prabhuratna.com', 'staff');
  if (!staffCheck) {
    const hashedStaffPass = bcrypt.hashSync('Staff@123', 10);
    db.prepare(`
      INSERT INTO users (name, username, email, password, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('Store Staff', 'staff', 'staff@prabhuratna.com', hashedStaffPass, 'staff', 'active');
  }

  // Seed default demo products if empty
  const prodCheck = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (prodCheck.count === 0) {
    const insertProd = db.prepare(`
      INSERT INTO products 
      (name, barcode, sku, category, brand, purchase_price, selling_price, discount_percent, gst_percent, stock_quantity, min_stock_level, show_on_website)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const sampleProducts = [
      ['Brass Pressure Cooker 5L', '890100000001', 'SKU-COOKER-05L', 'Cookware', 'Prabhuratna', 1200.0, 1850.0, 5.0, 18.0, 45, 10],
      ['Stainless Steel Dinner Set 24Pcs', '890100000002', 'SKU-DINSET-24P', 'Dinnerware', 'Prabhuratna', 1500.0, 2499.0, 10.0, 18.0, 20, 5],
      ['Non-Stick Fry Pan 24cm', '890100000003', 'SKU-FRYPAN-24C', 'Cookware', 'Prabhuratna', 450.0, 799.0, 0.0, 18.0, 60, 15],
      ['Copper Water Bottle 1000ml', '890100000004', 'SKU-BOTTL-1000', 'Drinkware', 'Prabhuratna', 350.0, 599.0, 8.0, 18.0, 8, 10],
      ['Induction Base Kadai 3L', '890100000005', 'SKU-KADAI-03L', 'Cookware', 'Prabhuratna', 650.0, 1050.0, 0.0, 18.0, 3, 5],
      ['Electric Rice Cooker 1.8L', '890100000006', 'SKU-RICE-18L', 'Appliances', 'Prabhuratna', 1400.0, 2199.0, 12.0, 18.0, 15, 4]
    ];

    for (const p of sampleProducts) {
      insertProd.run(...p);
    }
  }
}

initDb();

module.exports = db;
