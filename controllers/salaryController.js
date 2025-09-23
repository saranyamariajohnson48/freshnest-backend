const User = require('../models/User');
const SalaryPayment = require('../models/SalaryPayment');
const { sendSalaryPaymentEmail } = require('../services/emailService');

// List staff with salary details
exports.listStaffWithSalary = async (req, res) => {
  try {
    const { search = '', status, page = 1, limit = 20 } = req.query;

    const query = { role: 'staff' };
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const staff = await User.find(query)
      .select('fullName email employeeId salary status joiningDate')
      .sort({ fullName: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({ staff, pagination: { current: parseInt(page), pages: Math.ceil(total / parseInt(limit)), total, limit: parseInt(limit) } });
  } catch (error) {
    console.error('List staff with salary error:', error);
    res.status(500).json({ error: 'Failed to fetch staff salary list' });
  }
};

// Create a salary payment for a staff member (with optional deduction)
exports.paySalary = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { month, baseSalary, deductions = 0, deductionReason = '', notes = '', paymentId, paymentMethod = 'direct' } = req.body;

    if (!month || !baseSalary) {
      return res.status(400).json({ error: 'Month and base salary are required' });
    }

    const staff = await User.findOne({ _id: staffId, role: 'staff' });
    if (!staff) return res.status(404).json({ error: 'Staff member not found' });

    const numericBase = parseFloat(baseSalary);
    const numericDeduction = parseFloat(deductions || 0);
    if (numericBase < 0 || numericDeduction < 0) {
      return res.status(400).json({ error: 'Amounts must be non-negative' });
    }

    const paidAmount = Math.max(0, numericBase - numericDeduction);

    const payment = new SalaryPayment({
      staffId: staff._id,
      staffName: staff.fullName || '',
      staffEmail: staff.email || '',
      month,
      baseSalary: numericBase,
      deductions: numericDeduction,
      deductionReason: numericDeduction > 0 ? deductionReason : '',
      paidAmount,
      status: 'paid',
      createdBy: req.user?._id,
      notes: notes || (paymentMethod === 'razorpay' ? `Payment via Razorpay (ID: ${paymentId})` : 'Direct payment'),
      paymentId,
      paymentMethod
    });

    await payment.save();

    // Try sending a professional salary payment email (non-blocking)
    try {
      await sendSalaryPaymentEmail(staff.email, {
        staffName: staff.fullName,
        month,
        baseSalary: numericBase,
        deductions: numericDeduction,
        deductionReason,
        paidAmount,
        paymentId,
        paymentMethod,
        paidAt: payment.paidAt || Date.now()
      });
    } catch (e) {
      console.warn('⚠️ Salary email send failed (non-blocking):', e?.message || e);
    }

    res.status(201).json({ message: 'Salary recorded successfully', payment });
  } catch (error) {
    console.error('Pay salary error:', error);
    res.status(500).json({ error: 'Failed to record salary payment' });
  }
};

// Get payment history for a staff member
exports.getStaffSalaryHistory = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Authorization: allow admin OR the staff themselves
    const isAdmin = req.user && ['admin', 'Admin'].includes(req.user.role);
    const isSelf = req.user && String(req.user._id) === String(staffId);
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const payments = await SalaryPayment.find({ staffId })
      .sort({ paidAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SalaryPayment.countDocuments({ staffId });

    res.json({ payments, pagination: { current: parseInt(page), pages: Math.ceil(total / parseInt(limit)), total, limit: parseInt(limit) } });
  } catch (error) {
    console.error('Get salary history error:', error);
    res.status(500).json({ error: 'Failed to fetch salary history' });
  }
};

// Get payment history for the authenticated staff user
exports.getMySalaryHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const staffId = req.user._id;
    const staffEmail = req.user.email;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let payments = await SalaryPayment.find({ staffId })
      .sort({ paidAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    let total = await SalaryPayment.countDocuments({ staffId });

    // Fallback by email in case past records were saved with email only or mismatched ids
    if (total === 0 && staffEmail) {
      payments = await SalaryPayment.find({ staffEmail })
        .sort({ paidAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await SalaryPayment.countDocuments({ staffEmail });
    }

    res.json({ payments, pagination: { current: parseInt(page), pages: Math.ceil(total / parseInt(limit)), total, limit: parseInt(limit) } });
  } catch (error) {
    console.error('Get my salary history error:', error);
    res.status(500).json({ error: 'Failed to fetch salary history' });
  }
};

// Summary by month for reporting
exports.getSalarySummary = async (req, res) => {
  try {
    const { month } = req.query; // optional month filter e.g. 2025-09

    const match = month ? { month } : {};
    const summary = await SalaryPayment.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$month',
          totalBase: { $sum: '$baseSalary' },
          totalDeductions: { $sum: '$deductions' },
          totalPaid: { $sum: '$paidAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.json({ summary });
  } catch (error) {
    console.error('Get salary summary error:', error);
    res.status(500).json({ error: 'Failed to fetch salary summary' });
  }
};


// Admin: recent salary payments across all staff
exports.getRecentSalaryPayments = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const payments = await SalaryPayment.find({})
      .sort({ paidAt: -1 })
      .limit(parseInt(limit));
    res.json({ payments });
  } catch (error) {
    console.error('Get recent salary payments error:', error);
    res.status(500).json({ error: 'Failed to fetch recent salary payments' });
  }
};


