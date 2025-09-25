const mongoose = require('mongoose');

const salaryNotificationSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  staffName: {
    type: String,
    required: true
  },
  staffEmail: {
    type: String,
    required: true
  },
  salaryPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryPayment',
    required: true
  },
  month: {
    type: String, // e.g. "2025-01"
    required: true
  },
  baseSalary: {
    type: Number,
    required: true
  },
  deductions: {
    type: Number,
    default: 0
  },
  deductionReason: {
    type: String,
    default: ''
  },
  paidAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['direct', 'razorpay', 'bank_transfer'],
    default: 'direct'
  },
  paymentId: {
    type: String,
    default: ''
  },
  paidAt: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  message: {
    type: String,
    default: 'Your salary has been credited successfully!'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
salaryNotificationSchema.index({ staffId: 1, isRead: 1 });
salaryNotificationSchema.index({ staffId: 1, createdAt: -1 });
salaryNotificationSchema.index({ month: 1, staffId: 1 });

module.exports = mongoose.model('SalaryNotification', salaryNotificationSchema);
