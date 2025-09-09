const express = require('express');
const router = express.Router();
const { adminOnly, optionalAuth, authenticateToken } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

// Create order
router.post('/create-order', optionalAuth, paymentController.createOrder);

// Verify payment
router.post('/verify', optionalAuth, paymentController.verifyPayment);

// Get payment status
router.get('/status/:paymentId', optionalAuth, paymentController.getPaymentStatus);

// Refund payment
router.post('/refund', adminOnly, paymentController.refundPayment);

// Get all payments (admin only)
router.get('/all', adminOnly, paymentController.getAllPayments);

// Transaction management routes
router.post('/save-transaction', optionalAuth, paymentController.saveTransaction);
router.get('/transactions', adminOnly, paymentController.getAllTransactions);
router.get('/transactions/stats', adminOnly, paymentController.getTransactionStats);
router.get('/transactions/:id', adminOnly, paymentController.getTransactionById);

// User-specific transactions
router.get('/my/transactions', authenticateToken, paymentController.getMyTransactions);
router.get('/my/transactions/:id', authenticateToken, paymentController.getMyTransactionById);

module.exports = router;
