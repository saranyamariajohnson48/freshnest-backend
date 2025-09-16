const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const purchaseController = require('../controllers/purchaseController');

// Internal create (should be protected; using optional to allow saving after payment flows)
router.post('/', optionalAuth, purchaseController.createPurchase);

// Current user's purchases
router.get('/my', authenticateToken, purchaseController.getMyPurchases);

module.exports = router;


