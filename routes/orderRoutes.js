const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const controller = require('../controllers/orderController');

// Supplier: create order
router.post('/', authenticateToken, controller.createOrder);

// Supplier: list own orders; Admin: list all
router.get('/', authenticateToken, controller.listOrders);

// Supplier/Admin: update status
router.put('/:id/status', authenticateToken, controller.updateStatus);

// Admin: approve/reject order
router.post('/:id/review', authenticateToken, authorizeRoles('admin', 'Admin'), controller.reviewOrder);

// Admin: confirm delivered items after checking
router.post('/:id/confirm', authenticateToken, authorizeRoles('admin', 'Admin'), controller.confirmDelivery);

module.exports = router;