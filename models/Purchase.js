const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  customerEmail: {
    type: String,
    required: true,
    index: true,
    lowercase: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  paymentMethod: {
    type: String,
    enum: ['cards', 'upi', 'upi-qr', 'netbanking', 'wallet', 'paylater'],
    default: 'cards',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed',
    index: true,
  },
  type: {
    type: String,
    default: 'product',
  },
  orderId: String,
  paymentId: String,
  items: [{
    id: String,
    name: String,
    price: Number,
    quantity: Number,
    category: String,
  }],
  notes: String,
  purchasedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

purchaseSchema.index({ userId: 1, purchasedAt: -1 });
purchaseSchema.index({ customerEmail: 1, purchasedAt: -1 });

module.exports = mongoose.model('Purchase', purchaseSchema);


