const mongoose = require('mongoose');

const salaryPaymentSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  staffName: {
    type: String,
    default: ''
  },
  staffEmail: {
    type: String,
    default: ''
  },
  month: {
    type: String, // e.g. "2025-09"
    required: true,
    index: true
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
  status: {
    type: String,
    enum: ['paid', 'partially_paid', 'pending'],
    default: 'paid'
  },
  paidAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    default: ''
  },
  paymentId: {
    type: String,
    default: ''
  },
  paymentMethod: {
    type: String,
    enum: ['direct', 'razorpay', 'bank_transfer'],
    default: 'direct'
  }
}, {
  timestamps: true
});

salaryPaymentSchema.index({ staffId: 1, month: 1 }, { unique: false });
salaryPaymentSchema.index({ staffEmail: 1, month: 1 }, { unique: false });

module.exports = mongoose.model('SalaryPayment', salaryPaymentSchema);


