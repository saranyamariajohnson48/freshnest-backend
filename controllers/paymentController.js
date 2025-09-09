const Razorpay = require('razorpay');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_RFI',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '6I8NSN6DI0mwK3qYv7fmdU0H'
});

// Create order
exports.createOrder = async (req, res) => {
  try {
    const { items, customer, totalAmount } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Items are required' });
    }

    if (!customer || !customer.name || !customer.email) {
      return res.status(400).json({ success: false, error: 'Customer information is required' });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid total amount' });
    }

    // Create Razorpay order
    const orderOptions = {
      amount: Math.round(totalAmount * 100), // Convert to paise
      currency: 'INR',
      receipt: `order_${Date.now()}`,
      notes: {
        customer_id: customer.id || req.user?.id,
        customer_name: customer.name,
        customer_email: customer.email,
        items_count: items.length
      }
    };

    const order = await razorpay.orders.create(orderOptions);

    res.json({
      success: true,
      data: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        created_at: order.created_at
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Payment verification data is required' });
    }

    // Create signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '6I8NSN6DI0mwK3qYv7fmdU0H')
      .update(body.toString())
      .digest('hex');

    // Verify signature
    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({ success: false, error: 'Payment verification failed' });
    }

    // Save transaction to database
    try {
      const transactionData = {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        customer: req.body.customer || {},
        order: req.body.order || {},
        paymentMethod: req.body.paymentMethod || 'cards',
        status: 'completed',
        paymentDate: new Date()
      };

      const transaction = new Transaction(transactionData);
      await transaction.save();

      console.log('✅ Transaction saved successfully:', transaction._id);
    } catch (saveError) {
      console.error('❌ Error saving transaction:', saveError);
      // Don't fail the payment verification if saving fails
    }

    res.json({
      success: true,
      data: {
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        status: 'success',
        message: 'Payment verified successfully'
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
};

// Get payment status
exports.getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({ success: false, error: 'Payment ID is required' });
    }

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(paymentId);

    res.json({
      success: true,
      data: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        created_at: payment.created_at,
        captured: payment.captured
      }
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get payment status' });
  }
};

// Refund payment
exports.refundPayment = async (req, res) => {
  try {
    const { payment_id, amount, reason } = req.body;

    if (!payment_id) {
      return res.status(400).json({ success: false, error: 'Payment ID is required' });
    }

    // Create refund
    const refundOptions = {
      payment_id: payment_id,
      amount: amount ? Math.round(amount * 100) : undefined, // Convert to paise if amount specified
      notes: {
        reason: reason || 'Customer request'
      }
    };

    const refund = await razorpay.payments.refund(payment_id, refundOptions);

    res.json({
      success: true,
      data: {
        id: refund.id,
        amount: refund.amount,
        status: refund.status,
        created_at: refund.created_at
      }
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ success: false, error: 'Refund failed' });
  }
};

// Get all transactions (admin only)
exports.getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, paymentMethod, customerEmail } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (customerEmail) filter['customer.email'] = new RegExp(customerEmail, 'i');

    const transactions = await Transaction.find(filter)
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
};

// Get transactions for the authenticated user
exports.getMyTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, paymentMethod } = req.query;
    const skip = (page - 1) * limit;

    if (!req.user || (!req.user.email && !req.user._id)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const filter = {};
    // Prefer matching by stored customer.email when available
    if (req.user.email) {
      filter['customer.email'] = req.user.email;
    }

    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const transactions = await Transaction.find(filter)
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get my transactions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
};

// Get a specific transaction for the authenticated user
exports.getMyTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || (!req.user.email && !req.user._id)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const trx = await Transaction.findById(id);
    if (!trx) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    // Authorize by matching email
    if (req.user.email && trx.customer?.email !== req.user.email) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    res.json({ success: true, data: trx });
  } catch (error) {
    console.error('Get my transaction by ID error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transaction' });
  }
};

// Get transaction by ID
exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Get transaction by ID error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transaction' });
  }
};

// Save transaction (for demo payments)
exports.saveTransaction = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      customer,
      order,
      paymentMethod,
      status = 'completed'
    } = req.body;

    // Validate required fields
    if (!razorpay_payment_id || !customer || !order) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required transaction data' 
      });
    }

    // Create transaction data
    const transactionData = {
      razorpay_payment_id,
      razorpay_order_id: razorpay_order_id || `order_${Date.now()}`,
      razorpay_signature: razorpay_signature || `sig_${Date.now()}`,
      customer,
      order,
      paymentMethod: paymentMethod || 'cards',
      status,
      paymentDate: new Date()
    };

    // Save transaction to database
    const transaction = new Transaction(transactionData);
    await transaction.save();

    console.log('✅ Transaction saved successfully:', transaction._id);

    res.json({
      success: true,
      data: {
        transactionId: transaction._id,
        message: 'Transaction saved successfully'
      }
    });
  } catch (error) {
    console.error('Save transaction error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save transaction' 
    });
  }
};

// Get transaction statistics
exports.getTransactionStats = async (req, res) => {
  try {
    const stats = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$order.totalAmount' },
          completedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          completedAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$order.totalAmount', 0] }
          }
        }
      }
    ]);

    const paymentMethodStats = await Transaction.aggregate([
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$order.totalAmount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const dailyStats = await Transaction.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' },
            day: { $dayOfMonth: '$paymentDate' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$order.totalAmount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
      { $limit: 30 }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalTransactions: 0,
          totalAmount: 0,
          completedTransactions: 0,
          completedAmount: 0
        },
        paymentMethods: paymentMethodStats,
        dailyStats
      }
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transaction statistics' });
  }
};

// Get all payments (admin only) - Keep for Razorpay API compatibility
exports.getAllPayments = async (req, res) => {
  try {
    const { count = 10, skip = 0 } = req.query;

    const payments = await razorpay.payments.all({
      count: parseInt(count),
      skip: parseInt(skip)
    });

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payments' });
  }
};
