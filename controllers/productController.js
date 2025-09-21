const Product = require('../models/Product');
const { parse } = require('csv-parse');
const User = require('../models/User');
const { sendSupplierOnboardingEmail } = require('../services/emailService');

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

// List products with pagination and search (admin)
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

// Public: List active products with pagination and search
exports.publicListProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category } = req.query;
    const query = { status: 'active' };

    if (category) query.category = category;
    if (search) {
      query.$text = { $search: search };
    }
    // Low-stock threshold filter and supplier-owned filter
    if (req?.query?.lowStock !== undefined) {
      const threshold = Number(req.query.lowStock);
      if (!isNaN(threshold)) {
        query.stock = { ...(query.stock || {}), $lte: threshold };
      }
    }
    if ((req?.query?.my === 'true' || req?.query?.my === true) && req.user && (req.user.role === 'supplier' || req.user.role === 'Supplier')) {
      query.supplierId = req.user._id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const projection = { name: 1, sku: 1, category: 1, price: 1, stock: 1, unit: 1, status: 1, updatedAt: 1, createdAt: 1, brand: 1 };

    const [items, total] = await Promise.all([
      Product.find(query, projection).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
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

    // Low-stock alert when stock <= threshold. Notify linked supplier and category suppliers.
    try {
      const threshold = Number(process.env.LOW_STOCK_THRESHOLD || 5);
      if (typeof updated.stock === 'number' && updated.stock <= threshold) {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: Number(process.env.EMAIL_PORT) || 587,
          secure: String(process.env.EMAIL_PORT) === '465',
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });
        try { await transporter.verify(); } catch (_) {}

        const recipients = new Map(); // email -> displayName

        // 1) Linked supplier (if any)
        if (updated.supplierId) {
          const supplier = await User.findById(updated.supplierId).lean();
          if (supplier?.email) {
            const name = supplier.fullName || supplier.supplierDetails?.contactPerson || 'Supplier';
            recipients.set(supplier.email, name);
          }
        }

        // 2) All suppliers in matching category (e.g., Biscuits Pack) to widen alert
        if (updated.category) {
          const categorySuppliers = await User.find({
            role: 'supplier',
            'supplierDetails.category': updated.category,
            status: 'active'
          }).select('email fullName supplierDetails.contactPerson').lean();
          for (const s of categorySuppliers) {
            if (s?.email) {
              const name = s.fullName || s.supplierDetails?.contactPerson || 'Supplier';
              recipients.set(s.email, name); // Map avoids duplicates
            }
          }
        }

        // Nothing to notify
        if (recipients.size === 0) {
          console.log('ℹ️ No supplier recipients found for low stock alert.');
        } else {
          const sendPromises = [];
          for (const [email, supplierName] of recipients.entries()) {
            const mailOptions = {
              from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
              to: email,
              subject: `Urgent: Restock Required for ${updated.name} (Stock: ${updated.stock})`,
              html: `
                <div style="font-family: Arial, sans-serif;">
                  <h2 style="color:#0f5132;">Low Stock Alert – Immediate Action Required</h2>
                  <p>Dear ${supplierName},</p>
                  <p>The product <strong>${updated.name}</strong> (SKU: ${updated.sku}) has reached a low stock level.</p>
                  <table style="border-collapse:collapse; margin:12px 0;">
                    <tr><td style=\"padding:6px 12px;border:1px solid #ddd;\">Category</td><td style=\"padding:6px 12px;border:1px solid #ddd;\">${updated.category}</td></tr>
                    <tr><td style=\"padding:6px 12px;border:1px solid #ddd;\">Brand</td><td style=\"padding:6px 12px;border:1px solid #ddd;\">${updated.brand || '-'}</td></tr>
                    <tr><td style=\"padding:6px 12px;border:1px solid #ddd;\">Current Stock</td><td style=\"padding:6px 12px;border:1px solid #ddd; font-weight:bold; color:#b91c1c;\">${updated.stock} ${updated.unit || 'unit'}</td></tr>
                    <tr><td style=\"padding:6px 12px;border:1px solid #ddd;\">Threshold</td><td style=\"padding:6px 12px;border:1px solid #ddd;\">${threshold}</td></tr>
                  </table>
                  <p>Please prioritize replenishment to avoid stockouts.</p>
                  <p>Regards,<br/>FreshNest Inventory</p>
                </div>
              `,
              text: `Low Stock Alert: ${updated.name} (SKU ${updated.sku}) is at ${updated.stock} ${updated.unit || 'unit'}. Threshold: ${threshold}. Please restock immediately.`
            };
            sendPromises.push(transporter.sendMail(mailOptions).then(() => {
              console.log(`📧 Low stock alert sent to supplier ${email} for product ${updated.sku}`);
            }).catch(err => {
              console.error(`❌ Failed to send low stock alert to ${email}:`, err);
            }));
          }
          await Promise.allSettled(sendPromises);
        }
      }
    } catch (notifyErr) {
      console.error('Low-stock alert email failed:', notifyErr);
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
};

// Manually trigger low-stock alert email for a specific product
exports.sendLowStockAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplierId } = req.body || {};
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const threshold = Number(process.env.LOW_STOCK_THRESHOLD || 5);
    // Proceed even if stock is above threshold; this is manual trigger
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: String(process.env.EMAIL_PORT) === '465',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    try { await transporter.verify(); } catch (_) {}

    const recipients = new Map();

    if (supplierId) {
      // Specific supplier requested
      const supplier = await User.findOne({ _id: supplierId, role: 'supplier', status: 'active' }).lean();
      if (!supplier || !supplier.email) {
        return res.status(400).json({ success: false, error: 'Invalid supplier selected' });
      }
      // Optional: ensure category compatibility if supplier has one
      if (supplier?.supplierDetails?.category && product.category && supplier.supplierDetails.category !== product.category) {
        return res.status(400).json({ success: false, error: 'Supplier category does not match product category' });
      }
      const name = supplier.fullName || supplier.supplierDetails?.contactPerson || 'Supplier';
      recipients.set(supplier.email, name);
    } else {
      // Linked supplier (if any)
      if (product.supplierId) {
        const supplier = await User.findById(product.supplierId).lean();
        if (supplier?.email) {
          const name = supplier.fullName || supplier.supplierDetails?.contactPerson || 'Supplier';
          recipients.set(supplier.email, name);
        }
      }

      // Category suppliers
      if (product.category) {
        const categorySuppliers = await User.find({
          role: 'supplier',
          'supplierDetails.category': product.category,
          status: 'active'
        }).select('email fullName supplierDetails.contactPerson').lean();
        for (const s of categorySuppliers) {
          if (s?.email) {
            const name = s.fullName || s.supplierDetails?.contactPerson || 'Supplier';
            recipients.set(s.email, name);
          }
        }
      }
    }

    if (recipients.size === 0) {
      return res.json({ success: true, message: 'No supplier recipients found to notify' });
    }

    const sendPromises = [];
    for (const [email, supplierName] of recipients.entries()) {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: `Manual Low Stock Alert: ${product.name} (Stock: ${product.stock ?? '-'})`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2 style="color:#0f5132;">Low Stock Alert – Manual Notification</h2>
            <p>Dear ${supplierName},</p>
            <p>The product <strong>${product.name}</strong> (SKU: ${product.sku}) requires attention.</p>
            <table style="border-collapse:collapse; margin:12px 0;">
              <tr><td style="padding:6px 12px;border:1px solid #ddd;">Category</td><td style="padding:6px 12px;border:1px solid #ddd;">${product.category}</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #ddd;">Brand</td><td style="padding:6px 12px;border:1px solid #ddd;">${product.brand || '-'}</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #ddd;">Current Stock</td><td style="padding:6px 12px;border:1px solid #ddd; font-weight:bold; color:#b91c1c;">${product.stock ?? '-'} ${product.unit || 'unit'}</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #ddd;">Threshold</td><td style="padding:6px 12px;border:1px solid #ddd;">${threshold}</td></tr>
            </table>
            <p>Please prioritize replenishment to avoid stockouts.</p>
            <p>Regards,<br/>FreshNest Inventory</p>
          </div>
        `,
        text: `Manual Low Stock Alert: ${product.name} (SKU ${product.sku}) stock: ${product.stock ?? '-'} ${product.unit || 'unit'}. Threshold: ${threshold}.`
      };
      sendPromises.push(transporter.sendMail(mailOptions).then(() => {
        console.log(`📧 Manual low stock alert sent to ${email} for product ${product.sku}`);
      }).catch(err => {
        console.error(`❌ Failed to send manual low stock alert to ${email}:`, err);
      }));
    }

    const results = await Promise.allSettled(sendPromises);
    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - sent;
    return res.json({ success: true, message: `Alerts dispatched. Sent: ${sent}, Failed: ${failed}` });
  } catch (error) {
    console.error('sendLowStockAlert error:', error);
    res.status(500).json({ success: false, error: 'Failed to send low stock alert' });
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
    expiryDate: get('expiryDate', 'expiry_date', 'ExpiryDate', 'Expiry Date') ? new Date(get('expiryDate', 'expiry_date', 'ExpiryDate', 'Expiry Date')) : undefined,
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
  if (input.expiryDate !== undefined) out.expiryDate = input.expiryDate ? new Date(input.expiryDate) : undefined;

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