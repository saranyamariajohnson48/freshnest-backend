const Purchase = require('../models/Purchase');

// Create a purchase (internal use after payment)
exports.createPurchase = async (req, res) => {
  try {
    const body = req.body || {};
    const customerEmail = (body.customerEmail || req.user?.email || '').trim().toLowerCase();

    if (!customerEmail) {
      return res.status(400).json({ success: false, error: 'customerEmail is required' });
    }

    const purchase = await Purchase.create({
      userId: req.user?._id,
      customerEmail,
      amount: Number(body.amount || 0),
      currency: body.currency || 'INR',
      paymentMethod: body.paymentMethod || 'cards',
      status: body.status || 'completed',
      type: body.type || 'product',
      orderId: body.orderId,
      paymentId: body.paymentId,
      items: Array.isArray(body.items) ? body.items : [],
      notes: body.notes || '',
      purchasedAt: body.purchasedAt || new Date(),
    });

    return res.json({ success: true, data: purchase });
  } catch (error) {
    console.error('Create purchase error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create purchase' });
  }
};

// Get current user's purchases
exports.getMyPurchases = async (req, res) => {
  try {
    if (!req.user || (!req.user.email && !req.user._id)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { page = 1, limit = 10, status, paymentMethod } = req.query;
    const skip = (page - 1) * limit;

    const filter = { customerEmail: req.user.email };
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const purchases = await Purchase.find(filter)
      .sort({ purchasedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Purchase.countDocuments(filter);

    return res.json({
      success: true,
      data: {
        purchases,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get my purchases error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch purchases' });
  }
};


