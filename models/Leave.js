const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  employeeDetails: {
    fullName: {
      type: String,
      required: true,
    },
    employeeId: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
  },
  type: {
    type: String,
    enum: ['sick', 'casual', 'annual'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  isHalfDay: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  appliedOn: {
    type: Date,
    default: Date.now,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedOn: {
    type: Date,
  },
  reviewComments: {
    type: String,
    trim: true,
  },
  // Calculate total days
  totalDays: {
    type: Number,
    default: function() {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return this.isHalfDay ? 0.5 : diffDays;
    }
  },
  // Leave balance tracking
  leaveBalance: {
    casual: { type: Number },
    sick: { type: Number },
    annual: { type: Number },
  },
}, {
  timestamps: true
});

// Index for efficient queries
leaveSchema.index({ employeeId: 1, status: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });
leaveSchema.index({ appliedOn: -1 });

// Pre-save middleware to calculate total days
leaveSchema.pre('save', function(next) {
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    this.totalDays = this.isHalfDay ? 0.5 : diffDays;
  }
  next();
});

// Virtual for formatted date range
leaveSchema.virtual('dateRange').get(function() {
  const start = this.startDate.toLocaleDateString();
  const end = this.endDate.toLocaleDateString();
  return start === end ? start : `${start} - ${end}`;
});

// Virtual for leave duration in readable format
leaveSchema.virtual('duration').get(function() {
  if (this.isHalfDay) {
    return 'Half Day';
  }
  return this.totalDays === 1 ? '1 Day' : `${this.totalDays} Days`;
});

module.exports = mongoose.model("Leave", leaveSchema);