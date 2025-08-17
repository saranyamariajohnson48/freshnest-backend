const mongoose = require('mongoose');

const ALLOWED_STATUSES = [
  'Pending',
  'Approved',
  'In Transit',
  'Delivered',
  'Rejected'
];

const SupplierOrderSchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: {
    type: String,
    enum: [
      'Biscuits Pack',
      'Noodles Pack',
      'Chips Pack',
      'Chocolate Pack',
      'Juice Pack'
    ],
    required: true
  },
  brand: { type: String },
  product: { type: String },
  pricePerQuantity: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ALLOWED_STATUSES,
    default: 'Pending'
  },
  expectedDelivery: { type: Date, required: true },
  notes: { type: String },
  adminConfirmed: { type: Boolean, default: false },
  adminConfirmedAt: { type: Date },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

SupplierOrderSchema.statics.ALLOWED_STATUSES = ALLOWED_STATUSES;

module.exports = mongoose.model('SupplierOrder', SupplierOrderSchema);