const db = require('../config/db');

exports.getAllCategories = (req, res) => {
  try {
    // Ensure all categories used in products exist in categories table
    const productCategories = db.prepare("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ''").all();
    const insertStmt = db.prepare('INSERT INTO categories (name) VALUES (?) ON CONFLICT(name) DO NOTHING');
    
    productCategories.forEach(p => {
      if (p.category && p.category.trim()) {
        insertStmt.run(p.category.trim());
      }
    });

    const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
    return res.json({ success: true, count: categories.length, categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};

exports.createCategory = (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const trimmedName = name.trim();
    const existing = db.prepare('SELECT * FROM categories WHERE LOWER(name) = LOWER(?)').get(trimmedName);
    if (existing) {
      return res.status(200).json({ success: true, message: `Category "${existing.name}" is already available in the list`, category: existing });
    }

    const result = db.prepare('INSERT INTO categories (name) VALUES (?)').run(trimmedName);
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({ success: true, message: 'Category created successfully', category });
  } catch (error) {
    console.error('Error creating category:', error);
    return res.status(500).json({ success: false, message: 'Failed to create category' });
  }
};

exports.updateCategory = (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const trimmedName = name.trim();
    const oldName = existing.name;

    const duplicate = db.prepare('SELECT * FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?').get(trimmedName, id);
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Another category with this name already exists' });
    }

    db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(trimmedName, id);
    db.prepare('UPDATE products SET category = ? WHERE category = ?').run(trimmedName, oldName);

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    return res.json({ success: true, message: 'Category updated successfully', category: updated });
  } catch (error) {
    console.error('Error updating category:', error);
    return res.status(500).json({ success: false, message: 'Failed to update category' });
  }
};

exports.deleteCategory = (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    db.prepare('UPDATE products SET category = "General" WHERE category = ?').run(existing.name);

    return res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
};
