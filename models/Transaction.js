const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // Linked user (owner of the purchase)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  // Payment Details
  razorpay_payment_id: {
    type: String,
    required: true,
    unique: true
  },
  razorpay_order_id: {
    type: String,
    required: true
  },
  razorpay_signature: {
    type: String,
    required: true
  },
  
  // Customer Information
  customer: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      type: String,
      default: ''
    }
  },
  
  // Order Details
  order: {
    items: [{
      id: String,
      name: String,
      price: Number,
      quantity: Number,
      category: String
    }],
    // Store both raw total in INR and paise for integrity
    totalAmount: {
      type: Number,
      required: true
    },
    totalAmountPaise: {
      type: Number,
      default: function() {
        return Math.round((this.order?.totalAmount || 0) * 100);
      }
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  
  // Payment Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed'
  },
  
  // Payment Method
  paymentMethod: {
    type: String,
    enum: ['cards', 'upi', 'upi-qr', 'netbanking', 'wallet', 'paylater'],
    required: true
  },
  
  // Timestamps
  paymentDate: {
    type: Date,
    default: Date.now
  },
  
  // Additional Details
  notes: {
    type: String,
    default: ''
  },
  
  // Refund Information
  refund: {
    amount: Number,
    reason: String,
    refundDate: Date,
    refundId: String
  }
}, {
  timestamps: true
});

// Index for better query performance
transactionSchema.index({ razorpay_payment_id: 1 });
transactionSchema.index({ 'customer.email': 1 });
transactionSchema.index({ paymentDate: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ userId: 1, paymentDate: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
