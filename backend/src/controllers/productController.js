const db = require('../config/db');

exports.getAllProducts = (req, res) => {
  try {
    const { search, category, brand, stockStatus, activeOnly, websiteOnly } = req.query;
    
    let query = `SELECT * FROM products WHERE 1=1`;
    const params = [];

    if (activeOnly === 'true') {
      query += ` AND is_active = 1`;
    }

    if (websiteOnly === 'true') {
      query += ` AND show_on_website = 1`;
    }

    if (search) {
      query += ` AND (name LIKE ? OR barcode LIKE ? OR sku LIKE ? OR category LIKE ? OR brand LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (brand) {
      query += ` AND brand = ?`;
      params.push(brand);
    }

    if (stockStatus) {
      if (stockStatus === 'in_stock') {
        query += ` AND stock_quantity > min_stock_level`;
      } else if (stockStatus === 'low_stock') {
        query += ` AND stock_quantity > 0 AND stock_quantity <= min_stock_level`;
      } else if (stockStatus === 'out_of_stock') {
        query += ` AND stock_quantity <= 0`;
      }
    }

    query += ` ORDER BY id DESC`;

    const products = db.prepare(query).all(...params);
    return res.json({ success: true, count: products.length, products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

exports.getPublicCatalogProducts = (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products WHERE is_active = 1 AND show_on_website = 1 ORDER BY id DESC').all();
    return res.json({ success: true, count: products.length, products });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch public catalog products' });
  }
};

exports.getProductByBarcode = (req, res) => {
  try {
    const { barcode } = req.params;
    const product = db.prepare('SELECT * FROM products WHERE (barcode = ? OR sku = ?) AND is_active = 1').get(barcode, barcode);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error searching barcode' });
  }
};

exports.getProductById = (req, res) => {
  try {
    const { id } = req.params;
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    return res.json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching product' });
  }
};

exports.createProduct = (req, res) => {
  try {
    const {
      name,
      barcode,
      sku,
      category,
      brand,
      purchase_price,
      selling_price,
      discount_percent,
      gst_percent,
      stock_quantity,
      min_stock_level,
      image_url,
      show_on_website
    } = req.body;

    if (!name || !sku || selling_price === undefined) {
      return res.status(400).json({ success: false, message: 'Product name, SKU, and selling price are required' });
    }

    // Auto generate barcode if missing
    const finalBarcode = barcode || `890${Date.now().toString().slice(-9)}`;

    // Check SKU or Barcode conflict
    const existingSku = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
    if (existingSku) {
      return res.status(400).json({ success: false, message: 'A product with this SKU already exists' });
    }

    if (finalBarcode) {
      const existingBarcode = db.prepare('SELECT id FROM products WHERE barcode = ?').get(finalBarcode);
      if (existingBarcode) {
        return res.status(400).json({ success: false, message: 'A product with this barcode already exists' });
      }
    }

    const stmt = db.prepare(`
      INSERT INTO products (
        name, barcode, sku, category, brand, purchase_price, selling_price,
        discount_percent, gst_percent, stock_quantity, min_stock_level, image_url, show_on_website
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name,
      finalBarcode,
      sku,
      category || 'General',
      brand || 'Generic',
      parseFloat(purchase_price) || 0,
      parseFloat(selling_price) || 0,
      parseFloat(discount_percent) || 0,
      parseFloat(gst_percent) || 0,
      parseInt(stock_quantity) || 0,
      parseInt(min_stock_level) || 5,
      image_url || null,
      show_on_website !== undefined ? (show_on_website ? 1 : 0) : 1
    );

    // Log initial stock inventory if > 0
    if (parseInt(stock_quantity) > 0) {
      db.prepare(`
        INSERT INTO inventory_logs (product_id, change_type, quantity_change, previous_stock, new_stock, notes)
        VALUES (?, 'PURCHASE', ?, 0, ?, 'Initial stock creation')
      `).run(result.lastInsertRowid, parseInt(stock_quantity), parseInt(stock_quantity));
    }

    const createdProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, message: 'Product created successfully', product: createdProduct });
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({ success: false, message: 'Failed to create product' });
  }
};

exports.updateProduct = (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const {
      name,
      barcode,
      sku,
      category,
      brand,
      purchase_price,
      selling_price,
      discount_percent,
      gst_percent,
      stock_quantity,
      min_stock_level,
      image_url,
      is_active,
      show_on_website
    } = req.body;

    const stmt = db.prepare(`
      UPDATE products SET
        name = ?,
        barcode = ?,
        sku = ?,
        category = ?,
        brand = ?,
        purchase_price = ?,
        selling_price = ?,
        discount_percent = ?,
        gst_percent = ?,
        stock_quantity = ?,
        min_stock_level = ?,
        image_url = ?,
        is_active = ?,
        show_on_website = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      name || existing.name,
      barcode || existing.barcode,
      sku || existing.sku,
      category || existing.category,
      brand || existing.brand,
      purchase_price !== undefined ? parseFloat(purchase_price) : existing.purchase_price,
      selling_price !== undefined ? parseFloat(selling_price) : existing.selling_price,
      discount_percent !== undefined ? parseFloat(discount_percent) : existing.discount_percent,
      gst_percent !== undefined ? parseFloat(gst_percent) : existing.gst_percent,
      stock_quantity !== undefined ? parseInt(stock_quantity) : existing.stock_quantity,
      min_stock_level !== undefined ? parseInt(min_stock_level) : existing.min_stock_level,
      image_url !== undefined ? image_url : existing.image_url,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      show_on_website !== undefined ? (show_on_website ? 1 : 0) : existing.show_on_website,
      id
    );

    // If stock_quantity was updated, record log
    if (stock_quantity !== undefined && parseInt(stock_quantity) !== existing.stock_quantity) {
      const newStock = parseInt(stock_quantity);
      const diff = newStock - existing.stock_quantity;
      db.prepare(`
        INSERT INTO inventory_logs (product_id, change_type, quantity_change, previous_stock, new_stock, notes)
        VALUES (?, 'MANUAL_ADJUSTMENT', ?, ?, ?, 'Manual stock update')
      `).run(id, diff, existing.stock_quantity, newStock);
    }

    const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return res.json({ success: true, message: 'Product updated successfully', product: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};

exports.toggleWebsiteVisibility = (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT id, show_on_website FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const newVisibility = existing.show_on_website === 1 ? 0 : 1;
    db.prepare('UPDATE products SET show_on_website = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newVisibility, id);

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return res.json({
      success: true,
      message: `Product ${newVisibility ? 'enabled for' : 'hidden from'} customer website`,
      product: updated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update website display status' });
  }
};

exports.deleteProduct = (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};
