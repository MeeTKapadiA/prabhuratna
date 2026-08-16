const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const BUNDLED_DB_PATH = path.join(__dirname, '../../database.sqlite');

/**
 * Resolve a durable SQLite path.
 * Priority:
 *   1. DB_PATH env (Render persistent disk, VPS volume, etc.) — REQUIRED for production shop data
 *   2. Vercel /tmp fallback (EPHEMERAL — demo only; data wiped on cold start / redeploy)
 *   3. Local backend/database.sqlite
 */
function resolveDatabasePath() {
  const configured = process.env.DB_PATH && String(process.env.DB_PATH).trim();
  if (configured) {
    const resolved = path.resolve(configured);
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // First boot on a fresh volume: seed from the bundled file if present
    if (!fs.existsSync(resolved) && fs.existsSync(BUNDLED_DB_PATH)) {
      fs.copyFileSync(BUNDLED_DB_PATH, resolved);
      console.log(`[db] Initialized persistent database at ${resolved} from bundled seed`);
    } else if (!fs.existsSync(resolved)) {
      console.log(`[db] Creating new persistent database at ${resolved}`);
    } else {
      console.log(`[db] Using persistent database at ${resolved}`);
    }
    return resolved;
  }

  if (process.env.VERCEL) {
    const tmpPath = path.join('/tmp', 'database.sqlite');
    try {
      if (!fs.existsSync(tmpPath) && fs.existsSync(BUNDLED_DB_PATH)) {
        fs.copyFileSync(BUNDLED_DB_PATH, tmpPath);
      }
    } catch (err) {
      console.error('Failed to copy SQLite database to /tmp:', err);
    }
    console.warn(
      '[db] WARNING: Running on Vercel /tmp — database is EPHEMERAL. ' +
      'Products/invoices will be lost on redeploy. Set DB_PATH on a host with a persistent disk (e.g. Render).'
    );
    return tmpPath;
  }

  return BUNDLED_DB_PATH;
}

const dbPath = resolveDatabasePath();
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');
// Survive crashes better on persistent disks
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

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
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
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
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
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
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
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
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
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
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
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
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
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
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
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
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
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
      updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
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
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
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
  runMigration(`ALTER TABLE products ADD COLUMN hsn_code TEXT DEFAULT ''`);
  runMigration(`ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'pcs'`);
  runMigration(`ALTER TABLE products ADD COLUMN size_variant TEXT DEFAULT ''`);
  runMigration(`ALTER TABLE products ADD COLUMN gauge TEXT DEFAULT ''`);
  runMigration(`ALTER TABLE products ADD COLUMN damaged_stock REAL DEFAULT 0`);
  runMigration(`ALTER TABLE products ADD COLUMN display_stock REAL DEFAULT 0`);
  runMigration(`ALTER TABLE products ADD COLUMN scrap_stock REAL DEFAULT 0`);

  // Backfill hsn_code from legacy hsn_sac when empty
  try {
    db.prepare(`
      UPDATE products
      SET hsn_code = hsn_sac
      WHERE (hsn_code IS NULL OR hsn_code = '')
        AND hsn_sac IS NOT NULL AND hsn_sac != ''
    `).run();
  } catch (_) { /* ignore on fresh DBs */ }

  // Invoice GST / AR fields
  runMigration(`ALTER TABLE invoices ADD COLUMN customer_id INTEGER`);
  runMigration(`ALTER TABLE invoices ADD COLUMN customer_gstin TEXT DEFAULT ''`);
  runMigration(`ALTER TABLE invoices ADD COLUMN customer_pan TEXT DEFAULT ''`);
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
  runMigration(`ALTER TABLE invoices ADD COLUMN po_number TEXT DEFAULT ''`);
  runMigration(`ALTER TABLE invoices ADD COLUMN bill_type TEXT DEFAULT 'customer'`);

  runMigration(`ALTER TABLE invoice_items ADD COLUMN hsn_sac TEXT DEFAULT ''`);
  runMigration(`ALTER TABLE invoice_items ADD COLUMN unit TEXT DEFAULT 'pcs'`);
  runMigration(`ALTER TABLE invoice_items ADD COLUMN taxable_value REAL DEFAULT 0`);
  runMigration(`ALTER TABLE invoice_items ADD COLUMN cgst_amount REAL DEFAULT 0`);
  runMigration(`ALTER TABLE invoice_items ADD COLUMN sgst_amount REAL DEFAULT 0`);
  runMigration(`ALTER TABLE invoice_items ADD COLUMN igst_amount REAL DEFAULT 0`);
  runMigration(`ALTER TABLE invoice_items ADD COLUMN is_custom INTEGER DEFAULT 0`);
  runMigration(`ALTER TABLE invoice_items ADD COLUMN size_variant TEXT DEFAULT ''`);
  runMigration(`ALTER TABLE invoice_items ADD COLUMN gauge TEXT DEFAULT ''`);

  runMigration(`ALTER TABLE quotations ADD COLUMN customer_gstin TEXT DEFAULT ''`);
  runMigration(`ALTER TABLE quotations ADD COLUMN customer_pan TEXT DEFAULT ''`);
  runMigration(`ALTER TABLE quotations ADD COLUMN po_number TEXT DEFAULT ''`);
  runMigration(`ALTER TABLE quotation_items ADD COLUMN hsn_sac TEXT DEFAULT ''`);

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
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
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
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
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
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
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
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
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
      expense_date DATE NOT NULL DEFAULT (date('now', 'localtime')),
      created_by INTEGER,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
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
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
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
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Low-stock alert settings
  const defaultSettings = [
    ['shop_name', 'Prabhuratna Metals Pvt. Ltd.'],
    ['shop_address', 'Main Market Road, Commercial Complex, Ahmedabad, GJ'],
    ['shop_phone', '+91 98765 43210'],
    ['shop_email', 'info@prabhuratna.com'],
    ['shop_gstin', '24ABCDE1234F1Z5'],
    ['shop_pan', 'AAUFP637P'],
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

  // One-time: shift historical UTC CURRENT_TIMESTAMP values to local wall-clock (IST on shop PCs)
  localizeLegacyUtcTimestamps();

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

  // One-time superadmin seed (credentials from env; password default set per shop request)
  const saUsername = String(process.env.SUPERADMIN_USERNAME || 'superadmin').trim();
  const saEmail = String(process.env.SUPERADMIN_EMAIL || 'superadmin@prabhuratna.local').trim();
  const saPassword = String(process.env.SUPERADMIN_PASSWORD || '@Meet121603');
  const superCheck = db.prepare('SELECT id FROM users WHERE email = ? OR username = ? OR role = ?')
    .get(saEmail, saUsername, 'superadmin');
  if (!superCheck) {
    const hashedSuperPass = bcrypt.hashSync(saPassword, 12);
    db.prepare(`
      INSERT INTO users (name, username, email, password, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('Super Admin', saUsername, saEmail, hashedSuperPass, 'superadmin', 'active');
  }

  // Permanent shop-owner accounts (hardcoded — always re-ensure; never rely on UI alone)
  // These vanish on serverless /tmp resets if only created via frontend.
  const PROTECTED_SHOP_USERS = [
    {
      name: 'Rajesh Kansara',
      username: 'Rajeshkansara',
      email: 'rajeshkansara@prabhuratna.local',
      password: 'America0013@',
      role: 'admin'
    },
    {
      name: 'Aaditya Kansara',
      username: 'Aadityakansara',
      email: 'aadityakansara@prabhuratna.local',
      password: 'Ireland0013@',
      role: 'admin'
    },
    {
      name: 'Piyush Kansara',
      username: 'Piyushkansara',
      email: 'piyushkansara@prabhuratna.local',
      password: 'India0013@',
      role: 'admin'
    }
  ];

  const findProtectedUser = db.prepare(
    'SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)'
  );
  const insertProtectedUser = db.prepare(`
    INSERT INTO users (name, username, email, password, role, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `);
  const restoreProtectedUser = db.prepare(`
    UPDATE users
    SET name = ?, username = ?, email = ?, password = ?, role = ?, status = 'active'
    WHERE id = ?
  `);

  for (const u of PROTECTED_SHOP_USERS) {
    const existing = findProtectedUser.get(u.username, u.email);
    const hashed = bcrypt.hashSync(u.password, 12);
    if (!existing) {
      insertProtectedUser.run(u.name, u.username, u.email, hashed, u.role);
    } else {
      // Keep credentials + role/status in sync so redeploys cannot "lose" them
      restoreProtectedUser.run(u.name, u.username, u.email, hashed, u.role, existing.id);
    }
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

  // Reference catalog from client's physical tax invoice (idempotent by product name).
  // Owner should verify purchase_price (estimated at 75% of rate), stock_quantity, and category after go-live.
  const referenceInvoiceProducts = [
    { name: 'S.S. Cutlery Set with GoldLine', hsn: '39249096', gst: 18, rate: 2300, unit: 'pcs', category: 'Kitchenware', brand: 'Prabhuratna', sku: 'SKU-REF-CUTLERY-GL' },
    { name: 'Ocean Water Glass', hsn: '70132100', gst: 18, rate: 465, unit: 'pcs', category: 'Glassware', brand: 'Ocean', sku: 'SKU-REF-OCEAN-WG' },
    { name: 'Ocean Juice Glass', hsn: '70132100', gst: 18, rate: 485, unit: 'pcs', category: 'Glassware', brand: 'Ocean', sku: 'SKU-REF-OCEAN-JG' },
    { name: 'S.S. Tea Thermos 2 Ltr', hsn: '96170012', gst: 18, rate: 1640, unit: 'pcs', category: 'Kitchenware', brand: 'Prabhuratna', sku: 'SKU-REF-THERMOS-2L' },
    { name: 'Hawkins Single Induction', hsn: '85167100', gst: 18, rate: 3720, unit: 'pcs', category: 'Appliances', brand: 'Hawkins', sku: 'SKU-REF-HAWK-IND' },
    { name: 'S.S. Top Big Heavy Duty', hsn: '73239190', gst: 5, rate: 3125, unit: 'pcs', category: 'Cookware', brand: 'Prabhuratna', sku: 'SKU-REF-SSTOP-BIG' },
    { name: 'Milton Tea Coaster Big', hsn: '39249090', gst: 18, rate: 186, unit: 'pcs', category: 'Kitchenware', brand: 'Milton', sku: 'SKU-REF-MILTON-TCB' },
    { name: 'Milton Tea Coaster Medium', hsn: '39249090', gst: 18, rate: 156, unit: 'pcs', category: 'Kitchenware', brand: 'Milton', sku: 'SKU-REF-MILTON-TCM' },
    { name: 'S.S. Sandwich Bottom Top with Cover', hsn: '73239190', gst: 5, rate: 735, unit: 'pcs', category: 'Cookware', brand: 'Prabhuratna', sku: 'SKU-REF-SS-SAND' },
    { name: 'Melamine Serving Spoon', hsn: '39249090', gst: 18, rate: 170, unit: 'pcs', category: 'Kitchenware', brand: 'Prabhuratna', sku: 'SKU-REF-MEL-SPOON' },
    { name: 'Dabbo Heavy', hsn: '39249090', gst: 18, rate: 245, unit: 'pcs', category: 'Kitchenware', brand: 'Prabhuratna', sku: 'SKU-REF-DABBO-HVY' },
    { name: 'S.S. Laddle for Dal - Heavy', hsn: '39249090', gst: 18, rate: 235, unit: 'pcs', category: 'Kitchenware', brand: 'Prabhuratna', sku: 'SKU-REF-SS-LADDLE' },
    { name: 'Cup Saucer', hsn: '69111011', gst: 5, rate: 2440, unit: 'pcs', category: 'Dinnerware', brand: 'Prabhuratna', sku: 'SKU-REF-CUP-SAUCER' },
    { name: 'Copper Pooja Plate', hsn: '73239190', gst: 5, rate: 245, unit: 'pcs', category: 'Pooja Items', brand: 'Prabhuratna', sku: 'SKU-REF-CU-POOJA' }
  ];

  const findRefProduct = db.prepare('SELECT id FROM products WHERE name = ?');
  const insertRefProduct = db.prepare(`
    INSERT INTO products
      (name, barcode, sku, category, brand, purchase_price, selling_price, discount_percent,
       gst_percent, stock_quantity, min_stock_level, hsn_code, hsn_sac, unit, show_on_website)
    VALUES (?, NULL, ?, ?, ?, ?, ?, 0, ?, 10, 3, ?, ?, ?, 0)
  `);

  for (const p of referenceInvoiceProducts) {
    if (findRefProduct.get(p.name)) continue;
    const purchaseEstimate = Math.round(p.rate * 0.75 * 100) / 100;
    try {
      insertRefProduct.run(
        p.name,
        p.sku,
        p.category,
        p.brand,
        purchaseEstimate,
        p.rate,
        p.gst,
        p.hsn,
        p.hsn,
        p.unit
      );
    } catch (err) {
      // Skip if SKU collision on a renamed row — never wipe existing catalog
      console.warn(`[seed] Skipped reference product "${p.name}":`, err.message);
    }
  }

  // TEMPORARY: this only protects products that exist at time of writing. Any product added after this point will still be lost on Vercel cold start until the backend is moved to persistent hosting (see hosting migration plan). Do not let this be mistaken for a permanent fix in the codebase or in communication with the client.
  const liveSeedProducts = [
    { name: 'Brass Pressure Cooker 5L', barcode: '890100000001', sku: 'SKU-COOKER-05L', category: 'Cookware', brand: 'Prabhuratna', purchase_price: 1200.0, selling_price: 1850.0, discount_percent: 5.0, gst_percent: 18.0, stock_quantity: 45, min_stock_level: 10, hsn_code: '', unit: 'pcs', show_on_website: 1 },
    { name: 'Stainless Steel Dinner Set 24Pcs', barcode: '890100000002', sku: 'SKU-DINSET-24P', category: 'Dinnerware', brand: 'Prabhuratna', purchase_price: 1500.0, selling_price: 2499.0, discount_percent: 10.0, gst_percent: 18.0, stock_quantity: 20, min_stock_level: 5, hsn_code: '', unit: 'pcs', show_on_website: 1 },
    { name: 'Non-Stick Fry Pan 24cm', barcode: '890100000003', sku: 'SKU-FRYPAN-24C', category: 'Cookware', brand: 'Prabhuratna', purchase_price: 450.0, selling_price: 799.0, discount_percent: 0.0, gst_percent: 18.0, stock_quantity: 60, min_stock_level: 15, hsn_code: '', unit: 'pcs', show_on_website: 1 },
    { name: 'Copper Water Bottle 1000ml', barcode: '890100000004', sku: 'SKU-BOTTL-1000', category: 'Drinkware', brand: 'Prabhuratna', purchase_price: 350.0, selling_price: 599.0, discount_percent: 8.0, gst_percent: 18.0, stock_quantity: 8, min_stock_level: 10, hsn_code: '', unit: 'pcs', show_on_website: 1 },
    { name: 'Induction Base Kadai 3L', barcode: '890100000005', sku: 'SKU-KADAI-03L', category: 'Cookware', brand: 'Prabhuratna', purchase_price: 650.0, selling_price: 1050.0, discount_percent: 0.0, gst_percent: 18.0, stock_quantity: 3, min_stock_level: 5, hsn_code: '', unit: 'pcs', show_on_website: 1 },
    { name: 'Electric Rice Cooker 1.8L', barcode: '890100000006', sku: 'SKU-RICE-18L', category: 'Appliances', brand: 'Prabhuratna', purchase_price: 1400.0, selling_price: 2199.0, discount_percent: 12.0, gst_percent: 18.0, stock_quantity: 14, min_stock_level: 4, hsn_code: '', unit: 'pcs', show_on_website: 1 },
    { name: 'kadahai', barcode: '890745951663', sku: 'SKU-931096', category: 'Cookware', brand: 'Prabhuratna', purchase_price: 1000.0, selling_price: 1200.0, discount_percent: 0.0, gst_percent: 18.0, stock_quantity: 15, min_stock_level: 5, hsn_code: '', unit: 'pcs', show_on_website: 1 },
    { name: 'gas stove ', barcode: '890086535431', sku: 'SKU-535432', category: 'Appliances', brand: 'elica', purchase_price: 10000.0, selling_price: 12000.0, discount_percent: 0.0, gst_percent: 18.0, stock_quantity: 5, min_stock_level: 2, hsn_code: '', unit: 'pcs', show_on_website: 1 },
    { name: 'prestige', barcode: '890160016576', sku: 'SKU-016576', category: 'Appliances', brand: 'Prabhuratna', purchase_price: 1100.0, selling_price: 1500.0, discount_percent: 0.0, gst_percent: 18.0, stock_quantity: 21, min_stock_level: 5, hsn_code: '', unit: 'pcs', show_on_website: 0 },
    { name: 'HSN Test Pot', barcode: null, sku: 'SKU-HSN-TEST-001', category: 'General', brand: 'Generic', purchase_price: 300.0, selling_price: 500.0, discount_percent: 0.0, gst_percent: 18.0, stock_quantity: 7, min_stock_level: 5, hsn_code: '7323', unit: 'pcs', show_on_website: 1 },
    { name: 'S.S. Cutlery Set with GoldLine', barcode: null, sku: 'SKU-REF-CUTLERY-GL', category: 'Kitchenware', brand: 'Prabhuratna', purchase_price: 1725.0, selling_price: 2300.0, discount_percent: 0.0, gst_percent: 18.0, stock_quantity: 10, min_stock_level: 3, hsn_code: '39249096', unit: 'pcs', show_on_website: 0 },
    { name: 'Ocean Water Glass', barcode: null, sku: 'SKU-REF-OCEAN-WG', category: 'Glassware', brand: 'Ocean', purchase_price: 348.75, selling_price: 465.0, discount_percent: 0.0, gst_percent: 18.0, stock_quantity: 10, min_stock_level: 3, hsn_code: '70132100', unit: 'pcs', show_on_website: 0 },
    { name: 'Ocean Juice Glass', barcode: null, sku: 'SKU-REF-OCEAN-JG', category: 'Glassware', brand: 'Ocean', purchase_price: 363.75, selling_price: 485.0, discount_percent: 0.0, gst_percent: 18.0, stock_quantity: 10, min_stock_level: 3, hsn_code: '70132100', unit: 'pcs', show_on_website: 0 },
    { name: 'S.S. Tea Thermos 2 Ltr', barcode: null, sku: 'SKU-REF-THERMOS-2L', category: 'Kitchenware', brand: 'Prabhuratna', purchase_price: 1230.0, selling_price: 1640.0, discount_percent: 0.0, gst_percent: 18.0, stock_quantity: 10, min_stock_level: 3, hsn_code: '96170012', unit: 'pcs', show_on_website: 0 },
    { name: 'Hawkins Single Induction', barcode: null, sku: 'SKU-REF-HAWK-IND', category: 'Appliances', brand: 'Hawkins', purchase_price: 2790.0, selling_price: 3720.0, discount_percent: 0.0, gst_percent: 18.0, stock_quantity: 10, min_stock_level: 3, hsn_code: '85167100', unit: 'pcs', show_on_website: 0 },
    { name: 'S.S. Top Big Heavy Duty', barcode: null, sku: 'SKU-REF-SSTOP-BIG', category: 'Cookware', brand: 'Prabhuratna', purchase_price: 2343.75, selling_price: 3125.0, discount_percent: 0.0, gst_percent: 5.0, stock_quantity: 10, min_stock_level: 3, hsn_code: '73239190', unit: 'pcs', show_on_website: 0 },
    { name: 'Milton Tea Coaster Big', barcode: null, sku: 'SKU-REF-MILTON-TCB', category: 'Kitchenware', brand: 'Milton', purchase_price: 139.5, selling_price: 186.0, discount_percent: 0.0, gst_percent: 18.0, stock_quantity: 10, min_stock_level: 3, hsn_code: '39249090', unit: 'pcs', show_on_website: 0 },
    { name: 'Milton Tea Coaster Medium', barcode: null, sku: 'SKU-REF-MILTON-TCM', category: 'Kitchenware', brand: 'Milton', purchase_price: 117.0, selling_price: 156.0, discount_percent: 0.0, gst_percent: 18.0, stock_quantity: 10, min_stock_level: 3, hsn_code: '39249090', unit: 'pcs', show_on_website: 0 },
    { name: 'S.S. Sandwich Bottom Top with Cover', barcode: null, sku: 'SKU-REF-SS-SAND', category: 'Cookware', brand: 'Prabhuratna', purchase_price: 551.25, selling_price: 735.0, discount_percent: 0.0, gst_percent: 5.0, stock_quantity: 10, min_stock_level: 3, hsn_code: '73239190', unit: 'pcs', show_on_website: 0 },
    { name: 'Melamine Serving Spoon', barcode: null, sku: 'SKU-REF-MEL-SPOON', category: 'Kitchenware', brand: 'Prabhuratna', purchase_price: 127.5, selling_price: 170.0, discount_percent: 0.0, gst_percent: 18.0, stock_quantity: 10, min_stock_level: 3, hsn_code: '39249090', unit: 'pcs', show_on_website: 0 },
    { name: 'Dabbo Heavy', barcode: null, sku: 'SKU-REF-DABBO-HVY', category: 'Kitchenware', brand: 'Prabhuratna', purchase_price: 183.75, selling_price: 245.0, discount_percent: 0.0, gst_percent: 18.0, stock_quantity: 10, min_stock_level: 3, hsn_code: '39249090', unit: 'pcs', show_on_website: 0 },
    { name: 'S.S. Laddle for Dal - Heavy', barcode: null, sku: 'SKU-REF-SS-LADDLE', category: 'Kitchenware', brand: 'Prabhuratna', purchase_price: 176.25, selling_price: 235.0, discount_percent: 0.0, gst_percent: 18.0, stock_quantity: 10, min_stock_level: 3, hsn_code: '39249090', unit: 'pcs', show_on_website: 0 },
    { name: 'Cup Saucer', barcode: null, sku: 'SKU-REF-CUP-SAUCER', category: 'Dinnerware', brand: 'Prabhuratna', purchase_price: 1830.0, selling_price: 2440.0, discount_percent: 0.0, gst_percent: 5.0, stock_quantity: 10, min_stock_level: 3, hsn_code: '69111011', unit: 'pcs', show_on_website: 0 },
    { name: 'Copper Pooja Plate', barcode: null, sku: 'SKU-REF-CU-POOJA', category: 'Pooja Items', brand: 'Prabhuratna', purchase_price: 183.75, selling_price: 245.0, discount_percent: 0.0, gst_percent: 5.0, stock_quantity: 10, min_stock_level: 3, hsn_code: '73239190', unit: 'pcs', show_on_website: 0 }
  ];

  const findLiveProduct = db.prepare('SELECT id FROM products WHERE name = ?');
  const insertLiveProduct = db.prepare(`
    INSERT INTO products
      (name, barcode, sku, category, brand, purchase_price, selling_price, discount_percent,
       gst_percent, stock_quantity, min_stock_level, hsn_code, hsn_sac, unit, show_on_website)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of liveSeedProducts) {
    if (findLiveProduct.get(p.name)) continue;
    try {
      insertLiveProduct.run(
        p.name,
        p.barcode || null,
        p.sku,
        p.category,
        p.brand,
        p.purchase_price,
        p.selling_price,
        p.discount_percent || 0,
        p.gst_percent || 0,
        p.stock_quantity || 10,
        p.min_stock_level || 3,
        p.hsn_code || '',
        p.hsn_code || '',
        p.unit || 'pcs',
        p.show_on_website !== undefined ? p.show_on_website : 1
      );
    } catch (err) {
      console.warn(`[seed] Skipped live seed product "${p.name}":`, err.message);
    }
  }
}

function localizeLegacyUtcTimestamps() {
  try {
    const flag = db.prepare("SELECT value FROM settings WHERE key = 'timestamps_localized_v1'").get();
    if (flag?.value === '1') return;

    // Convert UTC-stored CURRENT_TIMESTAMP values to this machine's local wall-clock
    const offsetMinutes = -new Date().getTimezoneOffset();
    if (offsetMinutes === 0) {
      db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES ('timestamps_localized_v1', '1', datetime('now', 'localtime'))
        ON CONFLICT(key) DO UPDATE SET value = '1', updated_at = datetime('now', 'localtime')
      `).run();
      return;
    }

    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absMin = Math.abs(offsetMinutes);
    const modifier = `${sign}${absMin} minutes`;

    const shifts = [
      ['users', ['created_at', 'last_login']],
      ['products', ['created_at', 'updated_at']],
      ['invoices', ['created_at', 'cancelled_at']],
      ['invoice_payments', ['created_at']],
      ['quotations', ['created_at']],
      ['purchases', ['created_at']],
      ['returns', ['created_at']],
      ['inventory_logs', ['created_at']],
      ['customers', ['created_at', 'updated_at']],
      ['expenses', ['created_at']],
      ['cashbook_entries', ['created_at', 'updated_at']],
      ['credit_notes', ['created_at']],
      ['audit_logs', ['created_at']],
      ['suppliers', ['created_at']],
      ['categories', ['created_at']],
      ['settings', ['updated_at']]
    ];

    const tx = db.transaction(() => {
      for (const [table, cols] of shifts) {
        const exists = db.prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
        ).get(table);
        if (!exists) continue;

        const tableCols = new Set(
          db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name)
        );

        for (const col of cols) {
          if (!tableCols.has(col)) continue;
          db.prepare(`
            UPDATE ${table}
            SET ${col} = datetime(${col}, ?)
            WHERE ${col} IS NOT NULL AND TRIM(${col}) != ''
          `).run(modifier);
        }
      }

      db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES ('timestamps_localized_v1', '1', datetime('now', 'localtime'))
        ON CONFLICT(key) DO UPDATE SET value = '1', updated_at = datetime('now', 'localtime')
      `).run();
    });

    tx();
    console.log(`Localized legacy UTC timestamps by ${modifier}`);
  } catch (error) {
    console.warn('Timestamp localization skipped:', error.message);
  }
}

initDb();

module.exports = db;
