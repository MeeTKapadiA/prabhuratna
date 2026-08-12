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
      query += ` AND (name LIKE ? OR sku LIKE ? OR category LIKE ? OR brand LIKE ? OR COALESCE(hsn_code, '') LIKE ? OR COALESCE(hsn_sac, '') LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term);
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
    const products = db.prepare(`
      SELECT id, name, sku, category, brand, selling_price, gst_percent, image_url,
             CASE WHEN stock_quantity > 0 THEN 1 ELSE 0 END AS in_stock
      FROM products
      WHERE is_active = 1 AND show_on_website = 1
      ORDER BY id DESC
    `).all();
    return res.json({ success: true, count: products.length, products });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch public catalog products' });
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
      show_on_website,
      hsn_sac,
      hsn_code,
      unit,
      size_variant,
      gauge,
      damaged_stock,
      display_stock,
      scrap_stock
    } = req.body;

    if (!name || !sku || selling_price === undefined) {
      return res.status(400).json({ success: false, message: 'Product name, SKU, and selling price are required' });
    }

    const allowedUnits = ['pcs', 'kg', 'set', 'box', 'meter', 'pair'];
    const finalUnit = allowedUnits.includes(String(unit || '').toLowerCase()) ? String(unit).toLowerCase() : 'pcs';

    const normalizedHsn = String(hsn_code || hsn_sac || '').replace(/\D/g, '').slice(0, 8);
    // Keep barcode column for historical compatibility but do not auto-generate
    const finalBarcode = barcode ? String(barcode).trim() : '';

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
        discount_percent, gst_percent, stock_quantity, min_stock_level, image_url, show_on_website,
        hsn_sac, hsn_code, unit, size_variant, gauge, damaged_stock, display_stock, scrap_stock
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name,
      finalBarcode || null,
      sku,
      category || 'General',
      brand || 'Generic',
      parseFloat(purchase_price) || 0,
      parseFloat(selling_price) || 0,
      parseFloat(discount_percent) || 0,
      parseFloat(gst_percent) || 18,
      parseInt(stock_quantity) || 0,
      parseInt(min_stock_level) || 5,
      image_url || null,
      show_on_website !== undefined ? (show_on_website ? 1 : 0) : 1,
      normalizedHsn,
      normalizedHsn,
      finalUnit,
      size_variant || '',
      gauge || '',
      parseFloat(damaged_stock) || 0,
      parseFloat(display_stock) || 0,
      parseFloat(scrap_stock) || 0
    );

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
      show_on_website,
      hsn_sac,
      hsn_code,
      unit,
      size_variant,
      gauge,
      damaged_stock,
      display_stock,
      scrap_stock
    } = req.body;

    const allowedUnits = ['pcs', 'kg', 'set', 'box', 'meter', 'pair'];
    const finalUnit = unit !== undefined
      ? (allowedUnits.includes(String(unit).toLowerCase()) ? String(unit).toLowerCase() : existing.unit || 'pcs')
      : (existing.unit || 'pcs');

    const nextHsn = hsn_code !== undefined || hsn_sac !== undefined
      ? String(hsn_code !== undefined ? hsn_code : hsn_sac).replace(/\D/g, '').slice(0, 8)
      : (existing.hsn_code || existing.hsn_sac || '');

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
        hsn_sac = ?,
        hsn_code = ?,
        unit = ?,
        size_variant = ?,
        gauge = ?,
        damaged_stock = ?,
        display_stock = ?,
        scrap_stock = ?,
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `);

    stmt.run(
      name || existing.name,
      barcode !== undefined ? (barcode || null) : existing.barcode,
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
      nextHsn,
      nextHsn,
      finalUnit,
      size_variant !== undefined ? size_variant : (existing.size_variant || ''),
      gauge !== undefined ? gauge : (existing.gauge || ''),
      damaged_stock !== undefined ? parseFloat(damaged_stock) : (existing.damaged_stock || 0),
      display_stock !== undefined ? parseFloat(display_stock) : (existing.display_stock || 0),
      scrap_stock !== undefined ? parseFloat(scrap_stock) : (existing.scrap_stock || 0),
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

exports.getCostHistory = (req, res) => {
  try {
    const history = db.prepare(`
      SELECT * FROM product_cost_history
      WHERE product_id = ?
      ORDER BY id DESC
      LIMIT 50
    `).all(req.params.id);
    return res.json({ success: true, history });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch cost history' });
  }
};

exports.getLowStockAlertLink = (req, res) => {
  try {
    const settings = {};
    db.prepare('SELECT key, value FROM settings').all().forEach((row) => { settings[row.key] = row.value; });
    const low = db.prepare(`
      SELECT name, sku, stock_quantity, min_stock_level, unit
      FROM products
      WHERE is_active = 1 AND stock_quantity <= min_stock_level
      ORDER BY stock_quantity ASC
      LIMIT 20
    `).all();

    const lines = [
      `*${settings.shop_name || 'Prabhuratna'}* — Low Stock Alert`,
      ...low.map((p) => `• ${p.name} (${p.sku}): ${p.stock_quantity} ${p.unit || 'pcs'} / min ${p.min_stock_level}`)
    ];
    const phone = (settings.owner_whatsapp || '').replace(/\D/g, '');
    const text = encodeURIComponent(lines.join('\n'));
    const whatsappUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    return res.json({ success: true, count: low.length, products: low, whatsappUrl });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to build low stock alert' });
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
    db.prepare(`UPDATE products SET show_on_website = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(newVisibility, id);

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
