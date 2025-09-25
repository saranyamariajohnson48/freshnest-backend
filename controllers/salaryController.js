const User = require('../models/User');
const SalaryPayment = require('../models/SalaryPayment');
const SalaryNotification = require('../models/SalaryNotification');
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

    // Create salary notification for staff dashboard
    try {
      const notification = new SalaryNotification({
        staffId: staff._id,
        staffName: staff.fullName || '',
        staffEmail: staff.email || '',
        salaryPaymentId: payment._id,
        month,
        baseSalary: numericBase,
        deductions: numericDeduction,
        deductionReason: numericDeduction > 0 ? deductionReason : '',
        paidAmount,
        paymentMethod,
        paymentId,
        paidAt: payment.paidAt || Date.now(),
        createdBy: req.user?._id,
        message: `Your salary of ₹${paidAmount.toLocaleString()} has been credited for ${month}. ${numericDeduction > 0 ? `Deductions: ₹${numericDeduction.toLocaleString()} (${deductionReason})` : 'No deductions applied.'}`,
        priority: numericDeduction > 0 ? 'high' : 'normal'
      });
      await notification.save();
      console.log(`✅ Salary notification created for staff: ${staff.fullName} (${staff.email})`);
    } catch (e) {
      console.warn('⚠️ Salary notification creation failed (non-blocking):', e?.message || e);
    }

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
      // Use case-insensitive exact match for email to avoid casing mismatches
      const emailMatch = { $regex: `^${staffEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
      payments = await SalaryPayment.find({ staffEmail: emailMatch })
        .sort({ paidAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await SalaryPayment.countDocuments({ staffEmail: emailMatch });
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

// Get salary notifications for the authenticated staff user
exports.getMySalaryNotifications = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { staffId: req.user._id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await SalaryNotification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('salaryPaymentId', 'month baseSalary deductions paidAmount paymentMethod')
      .lean();

    const total = await SalaryNotification.countDocuments(query);
    const unreadCount = await SalaryNotification.countDocuments({ staffId: req.user._id, isRead: false });

    res.json({ 
      notifications, 
      pagination: { 
        current: parseInt(page), 
        pages: Math.ceil(total / parseInt(limit)), 
        total, 
        limit: parseInt(limit) 
      },
      unreadCount
    });
  } catch (error) {
    console.error('Get salary notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch salary notifications' });
  }
};

// Mark salary notification as read
exports.markSalaryNotificationAsRead = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { notificationId } = req.params;

    const notification = await SalaryNotification.findOneAndUpdate(
      { _id: notificationId, staffId: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Mark all salary notifications as read for the authenticated user
exports.markAllSalaryNotificationsAsRead = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await SalaryNotification.updateMany(
      { staffId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ 
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};


