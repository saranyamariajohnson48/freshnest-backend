const Product = require('../models/Product');
const { parse } = require('csv-parse');

// Create single product
exports.createProduct = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);

    // Enforce uppercase SKU
    if (payload.sku) payload.sku = payload.sku.toUpperCase();

    const product = await Product.create(payload);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: 'SKU already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
};

// List products with pagination and search
exports.listProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status, category } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Product.countDocuments(query)
    ]);

    res.json({ success: true, data: { items, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
};

// Update product by id
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    // Only allow specific fields to be updated
    const payload = normalizePartialPayload(req.body);

    // If SKU provided, keep uppercase and ensure uniqueness
    if (payload.sku) payload.sku = payload.sku.toUpperCase();

    // Check duplicate SKU (other product)
    if (payload.sku) {
      const existing = await Product.findOne({ sku: payload.sku, _id: { $ne: id } });
      if (existing) {
        return res.status(409).json({ success: false, error: 'SKU already exists' });
      }
    }

    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ success: false, error: 'Product not found' });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
};

// Delete product (soft by default; permanent with ?permanent=true)
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = 'false' } = req.query;

    if (permanent === 'true') {
      const deleted = await Product.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ success: false, error: 'Product not found' });
      return res.json({ success: true, message: 'Product permanently deleted' });
    }

    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: { status: 'inactive' } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, message: 'Product deactivated', data: updated });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
};

// Upsert product by SKU (used for CSV)
exports.upsertBySku = async (payload) => {
  const filter = { sku: payload.sku.toUpperCase() };
  const update = { $set: payload };
  const options = { upsert: true, new: true, setDefaultsOnInsert: true };
  return await Product.findOneAndUpdate(filter, update, options);
};

// Bulk import via CSV
exports.importCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'CSV file is required' });
    }

    const results = { created: 0, updated: 0, failed: 0, errors: [] };

    // Parse the CSV stream
    const parser = parse({ columns: true, skip_empty_lines: true, trim: true });

    // Map headers to standard fields
    const normalizeRow = (row) => normalizePayload(row);

    // Create a promise to process the file stream
    const processStream = new Promise((resolve, reject) => {
      parser.on('readable', async () => {
        let record;
        while ((record = parser.read()) !== null) {
          try {
            const data = normalizeRow(record);
            const before = await Product.findOne({ sku: data.sku.toUpperCase() });
            await exports.upsertBySku(data);
            const after = await Product.findOne({ sku: data.sku.toUpperCase() });
            if (!before && after) results.created += 1; else if (before) results.updated += 1;
          } catch (err) {
            results.failed += 1;
            results.errors.push({ sku: record.sku || record.SKU, error: err.message });
          }
        }
      });
      parser.on('error', reject);
      parser.on('end', resolve);

      // Pipe the uploaded file buffer into parser
      parser.write(req.file.buffer);
      parser.end();
    });

    await processStream;

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('CSV import failed:', error);
    res.status(500).json({ success: false, error: 'Failed to import CSV' });
  }
};

// Helpers
function normalizePayload(input) {
  // Accept multiple header variants and coerce types
  const get = (...keys) => {
    for (const k of keys) {
      if (input[k] !== undefined && input[k] !== null && input[k] !== '') return input[k];
    }
    return undefined;
  };

  // Map loose category/brand text to curated catalog values
  const { normalizeCategory, normalizeBrandForCategory } = require('../utils/catalog');

  const price = Number(get('price', 'Price', 'unit_price')); // required
  const costPrice = Number(get('costPrice', 'cost_price', 'CostPrice', 'Cost Price')) || 0;
  const stock = Number(get('stock', 'Stock', 'quantity', 'Quantity', 'qty')) || 0;

  const rawCategory = String(get('category', 'Category')).trim();
  const normalizedCategory = normalizeCategory(rawCategory);
  const rawBrand = get('brand', 'Brand') ? String(get('brand', 'Brand')) : undefined;
  const normalizedBrand = rawBrand ? normalizeBrandForCategory(normalizedCategory, rawBrand) : undefined;

  const payload = {
    name: String(get('name', 'Name', 'product_name', 'ProductName')).trim(),
    sku: String(get('sku', 'SKU', 'Sku')).trim().toUpperCase(),
    category: normalizedCategory,
    description: get('description', 'Description') ? String(get('description', 'Description')) : '',
    price: isNaN(price) ? 0 : price,
    costPrice: isNaN(costPrice) ? 0 : costPrice,
    stock: isNaN(stock) ? 0 : stock,
    unit: (get('unit', 'Unit') || 'unit').toString().toLowerCase(),
    status: (get('status', 'Status') || 'active').toString().toLowerCase(),
    brand: normalizedBrand,
    barcode: get('barcode', 'Barcode') ? String(get('barcode', 'Barcode')) : undefined,
    tags: parseTags(get('tags', 'Tags')),
  };

  // Minimal validation
  if (!payload.name) throw new Error('Missing product name');
  if (!payload.sku) throw new Error('Missing SKU');
  if (!payload.category) throw new Error('Missing category');
  if (payload.price < 0) throw new Error('Invalid price');
  if (payload.stock < 0) throw new Error('Invalid stock');

  return payload;
}

function normalizePartialPayload(input) {
  const out = {};
  if (input.name !== undefined) out.name = String(input.name).trim();
  if (input.sku !== undefined) out.sku = String(input.sku).trim();
  if (input.category !== undefined) {
    const { normalizeCategory } = require('../utils/catalog');
    out.category = normalizeCategory(String(input.category).trim());
  }
  if (input.description !== undefined) out.description = String(input.description || '');
  if (input.price !== undefined) out.price = Number(input.price);
  if (input.costPrice !== undefined) out.costPrice = Number(input.costPrice);
  if (input.stock !== undefined) out.stock = Number(input.stock);
  if (input.unit !== undefined) out.unit = String(input.unit).toLowerCase();
  if (input.status !== undefined) out.status = String(input.status).toLowerCase();
  if (input.brand !== undefined) {
    const { normalizeBrandForCategory } = require('../utils/catalog');
    const category = out.category || input.category; // prefer normalized if present
    out.brand = input.brand ? normalizeBrandForCategory(category, String(input.brand)) : undefined;
  }
  if (input.barcode !== undefined) out.barcode = input.barcode ? String(input.barcode) : undefined;
  if (input.tags !== undefined) out.tags = Array.isArray(input.tags) ? input.tags : String(input.tags).split(',').map(s=>s.trim()).filter(Boolean);

  // Validate when present
  if ('price' in out && out.price < 0) throw new Error('Invalid price');
  if ('stock' in out && out.stock < 0) throw new Error('Invalid stock');

  return out;
}

function parseTags(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return val.split(',').map((s) => s.trim()).filter(Boolean);
}