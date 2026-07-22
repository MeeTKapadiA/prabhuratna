const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

function initDb() {
  // Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

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

  // Migration: Add show_on_website if it doesn't exist
  try {
    db.exec(`ALTER TABLE products ADD COLUMN show_on_website INTEGER DEFAULT 1`);
  } catch (e) {
    // Column already exists
  }

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
      grand_total REAL NOT NULL,
      payment_mode TEXT NOT NULL, -- 'CASH', 'UPI', 'CARD', 'MIXED'
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
      status TEXT DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'REJECTED'
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
      change_type TEXT NOT NULL, -- 'SALE', 'PURCHASE', 'MANUAL_ADJUSTMENT'
      quantity_change INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  // Seed default admin user if non-existent
  const userCheck = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCheck.count === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (name, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run('Admin Manager', 'admin@prabhuratna.com', hashedPassword, 'admin');
    console.log('Seeded default admin user: admin@prabhuratna.com / admin123');
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
    console.log('Seeded sample products.');
  }
}

initDb();

module.exports = db;
