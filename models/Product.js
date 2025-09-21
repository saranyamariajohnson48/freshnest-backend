const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, min: 0, default: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, default: 'unit', enum: ['unit', 'kg', 'g', 'lb', 'litre', 'ml', 'pack', 'box', 'dozen', 'bundle'] },
    status: { type: String, default: 'active', enum: ['active', 'inactive'] },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: false },
    // Optional fields
    barcode: { type: String, trim: true },
    brand: { type: String, trim: true },
    tags: { type: [String], default: [] },
    expiryDate: { type: Date },
  },
  { timestamps: true }
);

// Text index for search
ProductSchema.index({ name: 'text', sku: 'text', category: 'text', brand: 'text' });

module.exports = mongoose.model('Product', ProductSchema);