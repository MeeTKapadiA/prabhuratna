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

  // Migrations for Users Table in SQLite
  try {
    db.exec(`ALTER TABLE users ADD COLUMN username TEXT`);
  } catch (e) {}
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN last_login DATETIME`);
  } catch (e) {}

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

  try {
    db.exec(`ALTER TABLE products ADD COLUMN show_on_website INTEGER DEFAULT 1`);
  } catch (e) {}

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

  // Seed default admin & staff users
  const adminCheck = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get('admin@prabhuratna.com', 'admin');
  if (!adminCheck) {
    const hashedAdminPass = bcrypt.hashSync('Admin@123', 10);
    db.prepare(`
      INSERT INTO users (name, username, email, password, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('System Admin', 'admin', 'admin@prabhuratna.com', hashedAdminPass, 'admin', 'active');
  } else {
    const hashedAdminPass = bcrypt.hashSync('Admin@123', 10);
    db.prepare(`
      UPDATE users 
      SET username = 'admin', password = ?, role = 'admin', status = 'active'
      WHERE id = ?
    `).run(hashedAdminPass, adminCheck.id);
  }

  const staffCheck = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get('staff@prabhuratna.com', 'staff');
  if (!staffCheck) {
    const hashedStaffPass = bcrypt.hashSync('Staff@123', 10);
    db.prepare(`
      INSERT INTO users (name, username, email, password, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('Store Staff', 'staff', 'staff@prabhuratna.com', hashedStaffPass, 'staff', 'active');
  } else {
    const hashedStaffPass = bcrypt.hashSync('Staff@123', 10);
    db.prepare(`
      UPDATE users 
      SET username = 'staff', password = ?, role = 'staff', status = 'active'
      WHERE id = ?
    `).run(hashedStaffPass, staffCheck.id);
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
