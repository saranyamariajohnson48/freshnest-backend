const SupplierOrder = require('../models/SupplierOrder');
const User = require('../models/User');

// Create new supplier order (Supplier)
exports.createOrder = async (req, res) => {
  try {
    const supplierId = req.user?._id || req.body.supplierId; // prefer authenticated user
    if (!supplierId) return res.status(400).json({ success: false, error: 'Supplier ID required' });

    // Basic role check (supplier)
    if (req.user && req.user.role !== 'supplier') {
      return res.status(403).json({ success: false, error: 'Only suppliers can create orders' });
    }

    const { category, brand, product, pricePerQuantity, quantity, expectedDelivery, notes } = req.body;

    const order = await SupplierOrder.create({
      supplierId,
      category,
      brand,
      product,
      pricePerQuantity,
      quantity,
      expectedDelivery,
      notes,
      status: 'Pending'
    });

    // Optional: update supplier metrics
    try {
      await User.findByIdAndUpdate(supplierId, {
        $inc: { 'supplierDetails.totalOrders': 1 },
        $set: { 'supplierDetails.lastOrderDate': new Date() }
      });
    } catch {}

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
};

// List orders (Supplier sees own, Admin sees all)
exports.listOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};

    if (req.user?.role === 'supplier') {
      query.supplierId = req.user._id;
    }

    if (status) query.status = status;

    const orders = await SupplierOrder.find(query)
      .populate('supplierId', 'fullName email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
};

// Supplier updates delivery status (Pending -> In Transit -> Delivered)
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!SupplierOrder.ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value' });
    }

    const order = await SupplierOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    // Only the supplier who owns the order can update it (unless admin)
    if (req.user?.role === 'supplier' && String(order.supplierId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this order' });
    }

    // Enforce sequence for suppliers
    const allowedTransitions = {
      'Pending': ['In Transit', 'Rejected'],
      'Approved': ['In Transit', 'Rejected'],
      'In Transit': ['Delivered'],
      'Delivered': [],
      'Rejected': []
    };

    if (req.user?.role === 'supplier') {
      const next = allowedTransitions[order.status] || [];
      if (!next.includes(status)) {
        return res.status(400).json({ success: false, error: `Invalid transition from ${order.status} to ${status}` });
      }
    }

    order.status = status;
    await order.save();

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
};

// Admin approves or rejects
exports.reviewOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' | 'reject'

    const order = await SupplierOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    if (action === 'approve') order.status = 'Approved';
    else if (action === 'reject') order.status = 'Rejected';
    else return res.status(400).json({ success: false, error: 'Invalid action' });

    await order.save();
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Review order error:', error);
    res.status(500).json({ success: false, error: 'Failed to review order' });
  }
};

// Admin confirm delivery after checking
exports.confirmDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await SupplierOrder.findById(id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    if (order.status !== 'Delivered') {
      return res.status(400).json({ success: false, error: 'Order must be Delivered before confirming' });
    }

    order.adminConfirmed = true;
    order.adminConfirmedAt = new Date();
    await order.save();

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Confirm delivery error:', error);
    res.status(500).json({ success: false, error: 'Failed to confirm delivery' });
  }
};